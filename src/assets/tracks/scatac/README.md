# Wang et al. scATAC-seq tracks

These tracks are condition-level pseudobulk accessibility signals generated
from the processed peak-by-cell matrix for GSE153479. The four barcode suffixes
are mapped according to `GSE153479_description.txt.gz`:

- `-1`: P1 MI, PSD3
- `-2`: P1 Sham, PSD3
- `-3`: P8 MI, PSD3
- `-4`: P8 Sham, PSD3

For each condition, peak counts were summed across cells and normalized to
counts per million total peak-matrix insertions. Coordinates use GRCm38/mm10.
The tracks can be reproduced with `scripts/generate_wang_scatac_tracks.R` from
the GEO `GSE153479_filtered_peak_bc_matrix.h5` file.

The public GEO files include cell-barcode QC information but do not include the
authors' barcode-to-cell-type assignments. Consequently, the browser labels
these tracks as all-cell pseudobulks rather than inferring unvalidated cell
types.

Source: Wang et al., *Cell Reports* 33(10), 108472 (2020),
https://doi.org/10.1016/j.celrep.2020.108472.
