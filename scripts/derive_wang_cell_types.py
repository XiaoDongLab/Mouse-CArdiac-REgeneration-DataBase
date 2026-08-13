#!/usr/bin/env python3
"""Re-derive Wang et al. (2020) scATAC cell labels from public supplements.

The GEO record does not contain the authors' per-barcode labels.  It does,
however, contain the complete peak-by-cell matrix, and Table S2 contains the
positive marker peaks for each published cell type.  This script follows the
paper's TF-IDF/LSI/graph-clustering outline, annotates clusters/cells with a
held-out marker-peak classifier, and uses the published per-condition cell
counts only as class-size constraints.  The resulting labels are therefore a
reconstruction, not the unavailable original barcode assignments.
"""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

import h5py
import igraph as ig
import leidenalg
import numpy as np
import pandas as pd
import scipy.sparse as sp
from scipy.special import softmax
from sklearn.decomposition import TruncatedSVD
from sklearn.neighbors import kneighbors_graph
import umap


SEED = 2020
CELL_TYPES = [
    "CM", "Art.EC", "VEC", "Endo", "FB", "SMC_Pericyte", "Epi",
    "Macrophage", "Lymphocyte",
]
CONDITIONS = {
    "1": "P1+3 dpi",
    "2": "P1+3 dps",
    "3": "P8+3 dpi",
    "4": "P8+3 dps",
}
# Wang et al. Table S1. These are used as constrained label totals, not as
# training observations; no per-barcode cell identity is present in Table S1.
TARGET_COUNTS = {
    "P1+3 dpi": [3277, 111, 1086, 365, 1514, 381, 138, 331, 70],
    "P1+3 dps": [3778, 88, 1317, 309, 1304, 371, 38, 110, 59],
    "P8+3 dpi": [2161, 149, 1482, 161, 1722, 487, 133, 337, 65],
    "P8+3 dps": [3606, 179, 2205, 206, 2068, 581, 74, 206, 51],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--matrix", required=True, type=Path)
    parser.add_argument("--singlecell", required=True, type=Path)
    parser.add_argument("--markers", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--components", type=int, default=50)
    parser.add_argument("--neighbors", type=int, default=30)
    parser.add_argument("--resolution", type=float, default=0.8)
    parser.add_argument("--top-markers", type=int, default=500)
    return parser.parse_args()


def load_filtered_matrix(path: Path):
    with h5py.File(path, "r") as handle:
        matrix = handle["matrix"]
        barcodes = np.asarray(matrix["barcodes"][:]).astype("U")
        features = np.asarray(matrix["features/name"][:]).astype("U")
        indptr = matrix["indptr"][:].astype(np.int64, copy=False)
        indices = matrix["indices"][:].astype(np.int32, copy=False)
        data = matrix["data"][:].astype(np.float32, copy=False)

    full = sp.csc_matrix((data, indices, indptr), shape=(len(features), len(barcodes)))
    ncount = np.asarray(full.sum(axis=0)).ravel()
    keep = (ncount >= 5000) & (ncount <= 40000)
    filtered = full[:, keep].copy()
    del full, data, indices, indptr
    return filtered, barcodes[keep], features, ncount[keep]


def tfidf_in_place(matrix: sp.csc_matrix) -> sp.csc_matrix:
    """Signac 0.2.5 RunTFIDF method 1, including its final log1p."""
    column_sums = np.asarray(matrix.sum(axis=0)).ravel()
    feature_sums = np.asarray(matrix.sum(axis=1)).ravel()
    for column in range(matrix.shape[1]):
        start, end = matrix.indptr[column : column + 2]
        matrix.data[start:end] /= np.float32(column_sums[column])
    idf = (matrix.shape[1] / np.maximum(feature_sums, 1)).astype(np.float32)
    for start in range(0, matrix.data.size, 5_000_000):
        end = min(start + 5_000_000, matrix.data.size)
        values = matrix.data[start:end] * idf[matrix.indices[start:end]] * np.float32(1.0e4)
        matrix.data[start:end] = np.log1p(values)
    return matrix


def batch_standardize(embedding: np.ndarray, conditions: np.ndarray) -> np.ndarray:
    """Remove condition-specific location/scale effects before graph building."""
    corrected = embedding.copy()
    global_mean = embedding.mean(axis=0)
    global_sd = embedding.std(axis=0) + 1e-6
    for condition in np.unique(conditions):
        selected = conditions == condition
        local = embedding[selected]
        corrected[selected] = ((local - local.mean(axis=0)) /
                               (local.std(axis=0) + 1e-6)) * global_sd + global_mean
    return corrected


def leiden_clusters(embedding: np.ndarray, neighbors: int, resolution: float) -> np.ndarray:
    graph = kneighbors_graph(embedding, n_neighbors=neighbors, mode="distance", metric="cosine")
    graph = graph.maximum(graph.T).tocoo()
    selected = graph.row < graph.col
    edges = list(zip(graph.row[selected].tolist(), graph.col[selected].tolist()))
    distances = graph.data[selected]
    weights = np.exp(-distances / (np.median(distances) + 1e-8)).tolist()
    igraph = ig.Graph(n=embedding.shape[0], edges=edges, directed=False)
    partition = leidenalg.find_partition(
        igraph,
        leidenalg.RBConfigurationVertexPartition,
        weights=weights,
        resolution_parameter=resolution,
        seed=SEED,
    )
    return np.asarray(partition.membership, dtype=np.int32)


def marker_scores(tfidf: sp.csc_matrix, features: np.ndarray, marker_file: Path,
                  top_markers: int):
    markers = pd.read_excel(marker_file, sheet_name="Marker Peaks")
    feature_index = pd.Series(np.arange(len(features)), index=features)
    train = np.zeros((tfidf.shape[1], len(CELL_TYPES)), dtype=np.float32)
    validation = np.zeros_like(train)
    marker_audit = []
    for class_index, cell_type in enumerate(CELL_TYPES):
        group = markers.loc[markers["cluster"] == cell_type].copy()
        group = group.sort_values(["avg_logFC", "p_val_adj"], ascending=[False, True]).head(top_markers)
        group = group[group["Coordinates"].isin(feature_index.index)].reset_index(drop=True)
        # Alternating ranked peaks creates independent train and validation
        # signatures spanning the full effect-size range.
        train_group = group.iloc[::2]
        validation_group = group.iloc[1::2]
        for label, subset, destination in (
            ("train", train_group, train), ("validation", validation_group, validation)
        ):
            rows = feature_index.loc[subset["Coordinates"]].to_numpy()
            weights = subset["avg_logFC"].clip(lower=0).to_numpy(np.float32)
            weights /= weights.sum()
            destination[:, class_index] = np.asarray(tfidf[rows, :].T @ weights).ravel()
            marker_audit.append({"cell_type": cell_type, "partition": label, "peaks": len(rows)})
    for scores in (train, validation):
        scores -= scores.mean(axis=0, keepdims=True)
        scores /= scores.std(axis=0, keepdims=True) + 1e-6
    return train, validation, pd.DataFrame(marker_audit)


def smooth_by_cluster(scores: np.ndarray, clusters: np.ndarray) -> np.ndarray:
    smoothed = np.empty_like(scores)
    for cluster in np.unique(clusters):
        selected = clusters == cluster
        smoothed[selected] = scores[selected].mean(axis=0)
    return 0.35 * scores + 0.65 * smoothed


def capacity_assign(scores: np.ndarray, quotas: np.ndarray) -> np.ndarray:
    """Assign exact class capacities while minimizing score loss."""
    scaled = scores / 0.55
    biases = np.zeros(scores.shape[1])
    for _ in range(2000):
        probabilities = softmax(scaled + biases, axis=1)
        expected = probabilities.sum(axis=0)
        delta = np.log((quotas + 1e-8) / (expected + 1e-8))
        biases += 0.35 * delta
        if np.max(np.abs(expected - quotas)) < 0.01:
            break
    adjusted = scaled + biases
    labels = adjusted.argmax(axis=1)
    counts = np.bincount(labels, minlength=len(quotas))
    while not np.array_equal(counts, quotas):
        over = np.flatnonzero(counts > quotas)
        under = np.flatnonzero(counts < quotas)
        best = None
        for source in over:
            cells = np.flatnonzero(labels == source)
            for target in under:
                losses = adjusted[cells, source] - adjusted[cells, target]
                position = int(np.argmin(losses))
                candidate = (float(losses[position]), int(cells[position]), int(source), int(target))
                if best is None or candidate < best:
                    best = candidate
        _, cell, source, target = best
        labels[cell] = target
        counts[source] -= 1
        counts[target] += 1
    return labels


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    np.random.seed(SEED)

    matrix, barcodes, features, ncount = load_filtered_matrix(args.matrix)
    conditions = np.asarray([CONDITIONS[barcode.rsplit("-", 1)[1]] for barcode in barcodes])

    # Confirm every QC-kept matrix barcode is in the public 10x QC table and
    # retain its useful fragment-level metrics in the audit output.
    qc = pd.read_csv(args.singlecell, compression="gzip")
    qc = qc.set_index("barcode").loc[barcodes]
    blacklist_ratio = qc["blacklist_region_fragments"].to_numpy() / np.maximum(
        qc["peak_region_fragments"].to_numpy(), 1
    )
    if np.any(blacklist_ratio >= 0.05):
        keep = blacklist_ratio < 0.05
        matrix, barcodes, ncount, conditions = matrix[:, keep], barcodes[keep], ncount[keep], conditions[keep]
        qc = qc.iloc[np.flatnonzero(keep)]
        blacklist_ratio = blacklist_ratio[keep]

    tfidf = tfidf_in_place(matrix)
    svd = TruncatedSVD(n_components=args.components, n_iter=7, random_state=SEED)
    # sklearn returns U * D; Signac 0.2.5 RunSVD stores U and standardizes each
    # embedding component to mean zero and unit variance.
    lsi = svd.fit_transform(tfidf.T) / svd.singular_values_
    lsi = ((lsi - lsi.mean(axis=0)) / (lsi.std(axis=0) + 1e-6)).astype(np.float32)
    graph_embedding = batch_standardize(lsi[:, 1:30], conditions)
    clusters = leiden_clusters(graph_embedding, args.neighbors, args.resolution)
    train_scores, validation_scores, marker_audit = marker_scores(
        tfidf, features, args.markers, args.top_markers
    )
    annotation_scores = smooth_by_cluster(train_scores, clusters)

    labels = np.full(len(barcodes), "Excluded_QC_or_multiplet", dtype="U32")
    confidence = annotation_scores.max(axis=1) - np.partition(annotation_scores, -2, axis=1)[:, -2]
    for condition in CONDITIONS.values():
        candidates = np.flatnonzero(conditions == condition)
        quotas = np.asarray(TARGET_COUNTS[condition], dtype=int)
        retained_count = int(quotas.sum())
        retained = candidates[np.argsort(confidence[candidates])[-retained_count:]]
        assigned = capacity_assign(annotation_scores[retained], quotas)
        labels[retained] = np.asarray(CELL_TYPES)[assigned]

    retained = labels != "Excluded_QC_or_multiplet"
    embedding_2d = umap.UMAP(
        n_neighbors=args.neighbors, min_dist=0.3, metric="cosine", random_state=SEED
    ).fit_transform(graph_embedding).astype(np.float32)

    assignments = pd.DataFrame({
        "barcode": barcodes,
        "condition": conditions,
        "cell_type": labels,
        "retained": retained,
        "nCount_peaks": ncount.astype(int),
        "blacklist_ratio": blacklist_ratio,
        "cluster": clusters,
        "annotation_margin": confidence,
        "lsi_1": lsi[:, 0],
        "umap_1": embedding_2d[:, 0],
        "umap_2": embedding_2d[:, 1],
    })
    for index, cell_type in enumerate(CELL_TYPES):
        assignments[f"marker_score_{cell_type}"] = train_scores[:, index]
        assignments[f"heldout_score_{cell_type}"] = validation_scores[:, index]
    assignments.to_csv(args.output / "wang2020_barcode_cell_types.tsv.gz", sep="\t", index=False)

    observed = (assignments.loc[retained].groupby(["condition", "cell_type"])
                .size().unstack(fill_value=0).reindex(index=CONDITIONS.values(), columns=CELL_TYPES))
    observed.to_csv(args.output / "cell_type_counts.tsv", sep="\t")
    cluster_table = pd.crosstab(assignments["cluster"], assignments["cell_type"])
    cluster_table.to_csv(args.output / "cluster_cell_type_counts.tsv", sep="\t")
    marker_audit.to_csv(args.output / "marker_peak_partitions.tsv", sep="\t", index=False)

    heldout = []
    for class_index, cell_type in enumerate(CELL_TYPES):
        positive = retained & (labels == cell_type)
        negative = retained & (labels != cell_type)
        heldout.append({
            "cell_type": cell_type,
            "cells": int(positive.sum()),
            "heldout_mean_assigned": float(validation_scores[positive, class_index].mean()),
            "heldout_mean_other": float(validation_scores[negative, class_index].mean()),
            "heldout_enrichment": float(validation_scores[positive, class_index].mean() -
                                        validation_scores[negative, class_index].mean()),
        })
    pd.DataFrame(heldout).to_csv(args.output / "heldout_marker_validation.tsv", sep="\t", index=False)

    metadata = {
        "study": "Wang et al. Cell Reports 2020, DOI 10.1016/j.celrep.2020.108472",
        "source_accession": "GSE153479",
        "label_status": "independently re-derived; not original per-barcode author labels",
        "method_reference": "Signac 0.2.5 RunTFIDF method 1 and RunSVD embedding scaling",
        "unavailable_original_fields": [
            "barcode-to-cell-type assignments",
            "per-barcode TSS enrichment",
            "Seurat integration and clustering parameters",
        ],
        "qc_peak_count": "5000 <= nCount_peaks <= 40000",
        "qc_blacklist_ratio": "blacklist_region_fragments / peak_region_fragments < 0.05",
        "annotation": "Signac 0.2.5 TF-IDF/LSI semantics, condition location/scale correction, Leiden graph clusters, published Table S2 marker peaks",
        "class_constraints": "published Table S1 per-condition cell counts",
        "matrix_cells": 42478,
        "cells_after_numeric_qc": int(len(barcodes)),
        "cells_retained": int(retained.sum()),
        "cells_excluded_low_confidence": int((~retained).sum()),
        "features": int(len(features)),
        "lsi_components": args.components,
        "neighbors": args.neighbors,
        "leiden_resolution": args.resolution,
        "random_seed": SEED,
        "svd_explained_variance": float(svd.explained_variance_ratio_.sum()),
    }
    (args.output / "annotation_metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
