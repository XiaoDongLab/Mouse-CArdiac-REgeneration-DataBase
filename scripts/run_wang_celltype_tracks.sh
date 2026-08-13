#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <working-directory> <track-output-directory>" >&2
  exit 2
fi

work_dir=$1
output_dir=$2
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mkdir -p "$work_dir" "$output_dir"

download() {
  local url=$1
  local destination=$2
  curl --location --fail --retry 20 --retry-all-errors --retry-delay 5 \
    --continue-at - --output "$destination" "$url"
}

download "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE153nnn/GSE153479/suppl/GSE153479_filtered_peak_bc_matrix.h5" \
  "$work_dir/GSE153479_filtered_peak_bc_matrix.h5"
download "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE153nnn/GSE153479/suppl/GSE153479_singlecell.csv.gz" \
  "$work_dir/GSE153479_singlecell.csv.gz"
download "https://ftp.ncbi.nlm.nih.gov/geo/series/GSE153nnn/GSE153479/suppl/GSE153479_fragments.tsv.gz" \
  "$work_dir/GSE153479_fragments.tsv.gz"
download "https://pmc.ncbi.nlm.nih.gov/articles/instance/7774872/bin/NIHMS1653540-supplement-3.xlsx" \
  "$work_dir/NIHMS1653540-supplement-3.xlsx"
download "https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.chrom.sizes" \
  "$work_dir/mm10.chrom.sizes"

python3 -m venv "$work_dir/venv"
"$work_dir/venv/bin/python" -m pip install --requirement "$script_dir/requirements-wang-scatac.txt"

annotation_dir="$work_dir/annotation"
"$work_dir/venv/bin/python" "$script_dir/derive_wang_cell_types.py" \
  --matrix "$work_dir/GSE153479_filtered_peak_bc_matrix.h5" \
  --singlecell "$work_dir/GSE153479_singlecell.csv.gz" \
  --markers "$work_dir/NIHMS1653540-supplement-3.xlsx" \
  --output "$annotation_dir"

"$work_dir/venv/bin/python" "$script_dir/generate_wang_celltype_bigwigs.py" \
  --fragments "$work_dir/GSE153479_fragments.tsv.gz" \
  --assignments "$annotation_dir/wang2020_barcode_cell_types.tsv.gz" \
  --chrom-sizes "$work_dir/mm10.chrom.sizes" \
  --output "$output_dir"

cp "$annotation_dir/annotation_metadata.json" "$output_dir/"
cp "$annotation_dir/cell_type_counts.tsv" "$output_dir/"
cp "$annotation_dir/cluster_cell_type_counts.tsv" "$output_dir/"
cp "$annotation_dir/heldout_marker_validation.tsv" "$output_dir/"
cp "$annotation_dir/marker_peak_partitions.tsv" "$output_dir/"
cp "$annotation_dir/wang2020_barcode_cell_types.tsv.gz" "$output_dir/"
