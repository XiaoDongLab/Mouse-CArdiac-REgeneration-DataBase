# Wang et al. scATAC-seq tracks

This directory contains two related GSE153479 track sets on GRCm38/mm10.

The four `wang2020_p*_psd3.bw` files are fragment-derived condition-level
all-cell pseudobulks generated from the 30,520 QC-retained cells analyzed in
the reconstruction. They use the same Tn5 insertion coverage, depth scaling,
100-bp smoothing, and 10-bp output bins as the population tracks below.

The 36 `wang2020_<cell-type>_<condition>_psd3.bw` files are fragment-derived
pseudobulks for the nine populations displayed by Wang et al.:

- CM
- Art.EC
- VEC
- Endo
- FB
- SMC/Pericyte
- Epi
- Macrophage
- Lymphocyte

Each population has `p1_mi`, `p1_sham`, `p8_mi`, and `p8_sham` tracks. The
condition suffixes map to P1+3 dpi, P1+3 dps, P8+3 dpi, and P8+3 dps,
respectively.

## Label provenance

GEO and the paper supplement do **not** contain the authors' original
barcode-to-cell-type table. The cell labels here are independently re-derived,
not exact author assignments. The reproducible workflow:

1. applies the paper's 5,000–40,000 peak-count and <5% blacklist filters;
2. computes TF-IDF, 50-component LSI, condition correction, a 30-neighbor
   graph, and Leiden clusters;
3. annotates with the published positive marker peaks in Table S2, holding
   half of the ranked peaks out for validation; and
4. constrains the final per-condition population sizes to the published Table
   S1 counts (30,520 retained cells total).

All nine labels show positive enrichment using the held-out marker peaks. See
`annotation_metadata.json`, `heldout_marker_validation.tsv`,
`cell_type_counts.tsv`, `cluster_cell_type_counts.tsv`, and the downloadable
`wang2020_barcode_cell_types.tsv.gz` assignments for the audit.

## Coverage method

All-cell and cell-type tracks are generated from `GSE153479_fragments.tsv.gz`,
rather than painting peak-matrix values across peak intervals. They reproduce
the relevant Signac 0.2.5 `CoveragePlot` behavior used by the paper: each
unique fragment row contributes one cut at its start and end (the 10x
PCR-support column is
ignored), each condition is normalized to the median peak-matrix depth of the
four conditions in the selected population (or all retained cells), and signal
is smoothed with a centered 100-bp mean. Non-overlapping 10-bp output bins match
CoveragePlot's default 0.1 positional downsampling. The BigWigs and their
SHA-256 checksums are listed in `fragment_track_metadata.tsv` (all 40 tracks),
`all_cell_track_metadata.tsv`, and `cell_type_track_metadata.tsv`.
`bigwig_validation.tsv` records header-level
integrity checks, and `track_marker_validation.tsv` confirms that the held-out
marker peaks are enriched in each fragment-derived population after removing
the population-specific display scale.

These remain pseudobulk browser tracks. Single cells supply the cell-type
assignments, but pooling is necessary for interpretable genomic coverage and
matches how the paper displayed its scATAC tracks.

## Reproduction

The analysis scripts are:

- `scripts/derive_wang_cell_types.py`
- `scripts/generate_wang_celltype_bigwigs.py`
- `scripts/run_wang_celltype_tracks.sh`

The generator accepts `--track-set all`, `--track-set populations`, or the
default `--track-set both`. The default writes all 40 tracks in one scan of the
fragment archive.

Their Python dependencies are pinned in
`scripts/requirements-wang-scatac.txt`. Large GEO inputs are downloaded to a
caller-selected working directory and are not committed.

Source: Wang et al., *Cell Reports* 33(10), 108472 (2020),
https://doi.org/10.1016/j.celrep.2020.108472.
