#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 DESTINATION_DIRECTORY" >&2
  exit 2
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
destination="$1"
archive="$destination/GSE163629_RAW.tar"
raw_dir="$destination/raw"
archive_url="https://ftp.ncbi.nlm.nih.gov/geo/series/GSE163nnn/GSE163629/suppl/GSE163629_RAW.tar"

mkdir -p "$destination" "$raw_dir"

if [[ ! -f "$archive" ]]; then
  partial="$archive.partial"
  curl -fL --retry 5 --retry-delay 2 --output "$partial" "$archive_url"
  mv "$partial" "$archive"
fi

tar -xf "$archive" -C "$raw_dir"
python3 "$script_dir/cui2021_pipeline.py" validate "$raw_dir"

echo "Validated source files: $raw_dir"
echo "Next: python3 $script_dir/cui2021_pipeline.py prepare $raw_dir $destination/prepared --copy-images"
