#!/usr/bin/env python3
"""Create fragment-derived Wang 2020 cell-type/condition BigWigs.

The signal follows Signac 0.2.5 CoveragePlot semantics: Tn5 cut sites are
summed, normalized to the median peak-matrix depth of the four condition groups
within each cell type, and smoothed with a centered 100-bp mean. Values are
emitted in non-overlapping 10-bp bins, matching CoveragePlot's default 0.1
positional downsampling while keeping the browser assets compact.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import heapq
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pyBigWig


CELL_SLUGS = {
    "CM": "cm",
    "Art.EC": "art_ec",
    "VEC": "vec",
    "Endo": "endo",
    "FB": "fb",
    "SMC_Pericyte": "smc_pericyte",
    "Epi": "epi",
    "Macrophage": "macrophage",
    "Lymphocyte": "lymphocyte",
}
CONDITION_SLUGS = {
    "P1+3 dpi": "p1_mi",
    "P1+3 dps": "p1_sham",
    "P8+3 dpi": "p8_mi",
    "P8+3 dps": "p8_sham",
}


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fragments", required=True, type=Path)
    parser.add_argument("--assignments", required=True, type=Path)
    parser.add_argument("--chrom-sizes", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--bin-size", type=int, default=10)
    parser.add_argument("--smooth-bp", type=int, default=100)
    return parser.parse_args()


class TrackWriter:
    def __init__(self, path: Path, header, scale: float, bin_size: int, smooth_bp: int):
        self.handle = pyBigWig.open(str(path), "w")
        self.handle.addHeader(header)
        self.scale = scale
        self.bin_size = bin_size
        self.window_bins = smooth_bp // bin_size
        self.left_bins = (self.window_bins - 1) // 2
        self.right_bins = self.window_bins - self.left_bins
        self.chrom = None
        self.chrom_size = 0
        self.cut_events = {}
        self.cut_heap = []
        self.diff_events = {}
        self.diff_heap = []
        self.signal = 0.0
        self.signal_bin = 0
        self.buffer = []
        self.cut_sites = 0

    @staticmethod
    def _add_event(events, heap, position, value):
        if position not in events:
            events[position] = value
            heapq.heappush(heap, position)
        else:
            events[position] += value

    def start_chromosome(self, chrom: str, size: int):
        if self.chrom is not None:
            self.finish_chromosome()
        self.chrom = chrom
        self.chrom_size = size
        self.signal_bin = 0

    def add_fragment(self, start: int, end: int):
        start_bin = max(0, start // self.bin_size)
        # Signac 0.2.5 CutMatrix uses the fragment start and end columns as the
        # two insertion coordinates, and assigns x=1 per fragment row. The
        # fifth 10x column (PCR read-pair support) is intentionally ignored.
        end_bin = max(0, end // self.bin_size)
        self._flush_cuts_before(start_bin)
        self._add_event(self.cut_events, self.cut_heap, start_bin, 1)
        self._add_event(self.cut_events, self.cut_heap, end_bin, 1)
        self.cut_sites += 2

    def _flush_cuts_before(self, boundary: int):
        while self.cut_heap and self.cut_heap[0] < boundary:
            cut_bin = heapq.heappop(self.cut_heap)
            count = self.cut_events.pop(cut_bin)
            self._add_smoothed_cut(cut_bin, count)

    def _add_smoothed_cut(self, cut_bin: int, count: int):
        left = max(0, cut_bin - self.left_bins)
        right = cut_bin + self.right_bins
        self._flush_diffs_before(left)
        value = count * self.scale / 100.0
        self._add_event(self.diff_events, self.diff_heap, left, value)
        self._add_event(self.diff_events, self.diff_heap, right, -value)

    def _flush_diffs_before(self, boundary: int):
        while self.diff_heap and self.diff_heap[0] < boundary:
            event_bin = heapq.heappop(self.diff_heap)
            delta = self.diff_events.pop(event_bin)
            self._write_signal_until(event_bin)
            self.signal += delta

    def _write_signal_until(self, end_bin: int):
        start = self.signal_bin * self.bin_size
        end = min(end_bin * self.bin_size, self.chrom_size)
        if self.signal > 1e-12 and end > start:
            self.buffer.append((self.chrom, start, end, float(self.signal)))
            if len(self.buffer) >= 50_000:
                self.flush_buffer()
        self.signal_bin = end_bin

    def finish_chromosome(self):
        self._flush_cuts_before(2**63 - 1)
        self._flush_diffs_before(2**63 - 1)
        if abs(self.signal) > 1e-5:
            raise RuntimeError(f"Smoothing sweep did not return to zero for {self.chrom}: {self.signal}")
        self.cut_events.clear()
        self.cut_heap.clear()
        self.diff_events.clear()
        self.diff_heap.clear()
        self.signal = 0.0
        self.signal_bin = 0

    def flush_buffer(self):
        if not self.buffer:
            return
        chroms, starts, ends, values = zip(*self.buffer)
        self.handle.addEntries(list(chroms), list(starts), ends=list(ends), values=list(values))
        self.buffer.clear()

    def close(self):
        if self.chrom is not None:
            self.finish_chromosome()
        self.flush_buffer()
        self.handle.close()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    args = arguments()
    if args.smooth_bp % args.bin_size:
        raise ValueError("--smooth-bp must be divisible by --bin-size")
    args.output.mkdir(parents=True, exist_ok=True)

    all_chrom_sizes = {}
    with args.chrom_sizes.open() as handle:
        for line in handle:
            chrom, size = line.rstrip().split("\t")[:2]
            all_chrom_sizes[chrom] = int(size)
    # UCSC's mm10.chrom.sizes is size-sorted, whereas Cell Ranger writes the
    # GEO fragments in chr1..chr19, chrX, chrY, chrM order. BigWig requires
    # entries to follow header order, so declare the primary assembly in the
    # fragment order and intentionally omit unobserved random/alt contigs.
    primary_chromosomes = [f"chr{number}" for number in range(1, 20)] + ["chrX", "chrY", "chrM"]
    chrom_sizes = [
        (chrom, all_chrom_sizes[chrom]) for chrom in primary_chromosomes
        if chrom in all_chrom_sizes
    ]
    chrom_size_map = dict(chrom_sizes)

    assignments = pd.read_csv(args.assignments, sep="\t", compression="infer")
    assignments = assignments.loc[assignments["retained"].astype(bool)].copy()
    assignments["group"] = assignments["cell_type"] + "|" + assignments["condition"]
    barcode_to_group = dict(zip(assignments["barcode"], assignments["group"]))
    group_depth = assignments.groupby("group")["nCount_peaks"].sum().to_dict()
    population_scale = {
        cell_type: float(np.median([
            group_depth[f"{cell_type}|{condition}"] for condition in CONDITION_SLUGS
        ]))
        for cell_type in CELL_SLUGS
    }

    writers = {}
    metadata = []
    for cell_type, cell_slug in CELL_SLUGS.items():
        for condition, condition_slug in CONDITION_SLUGS.items():
            group = f"{cell_type}|{condition}"
            filename = f"wang2020_{cell_slug}_{condition_slug}_psd3.bw"
            path = args.output / filename
            cells = int((assignments["group"] == group).sum())
            depth = int(group_depth[group])
            writers[group] = TrackWriter(
                path, chrom_sizes, population_scale[cell_type] / depth,
                args.bin_size, args.smooth_bp
            )
            metadata.append({
                "cell_type": cell_type,
                "condition": condition,
                "cells": cells,
                "peak_matrix_counts": depth,
                "normalization": "Tn5 cut sites * cell-type median group depth / group peak-matrix counts; 100-bp centered mean",
                "scale_factor": population_scale[cell_type],
                "bin_size": args.bin_size,
                "file": filename,
            })

    current_chrom = None
    used_fragment_rows = 0
    processed_lines = 0
    opener = gzip.open if args.fragments.suffix == ".gz" else open
    with opener(args.fragments, "rt") as fragments:
        for line in fragments:
            if not line or line.startswith("#"):
                continue
            fields = line.rstrip().split("\t")
            if len(fields) < 5:
                continue
            chrom, start, end, barcode, _read_support = fields[:5]
            processed_lines += 1
            if chrom not in chrom_size_map:
                continue
            if chrom != current_chrom:
                current_chrom = chrom
                for writer in writers.values():
                    writer.start_chromosome(chrom, chrom_size_map[chrom])
                print(f"processing {chrom}; {processed_lines:,} fragment rows", flush=True)
            group = barcode_to_group.get(barcode)
            if group is not None:
                writers[group].add_fragment(int(start), int(end))
                used_fragment_rows += 1

    for writer in writers.values():
        writer.close()

    for row in metadata:
        path = args.output / row["file"]
        group = f"{row['cell_type']}|{row['condition']}"
        row["cut_sites"] = writers[group].cut_sites
        row["bytes"] = path.stat().st_size
        row["sha256"] = sha256(path)
        with pyBigWig.open(str(path)) as bigwig:
            row["bigwig_chromosomes"] = len(bigwig.chroms())
    pd.DataFrame(metadata).to_csv(args.output / "cell_type_track_metadata.tsv", sep="\t", index=False)
    run = {
        "fragments": str(args.fragments),
        "assignments": str(args.assignments),
        "processed_fragment_rows": processed_lines,
        "retained_fragment_rows": used_fragment_rows,
        "tracks": len(metadata),
        "bin_size": args.bin_size,
        "smoothing_window_bp": args.smooth_bp,
    }
    (args.output / "track_generation.json").write_text(json.dumps(run, indent=2) + "\n")
    print(json.dumps(run, indent=2))


if __name__ == "__main__":
    main()
