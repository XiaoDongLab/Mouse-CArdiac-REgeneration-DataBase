# Cui et al. spatial data handoff

This directory sources and prepares the five Visium samples in GEO series
`GSE163629`, the spatial subseries of `GSE163631` for Cui et al. 2021.

## Confirmed source contents

The official processed-data archive contains 15 files: one count matrix, one
metadata table, and one H&E PNG for each sample. The manifest pins every exact
filename and SHA-256 checksum.

| Accession | Condition | Spots | Matrix genes | Matrix total |
| --- | --- | ---: | ---: | --- |
| GSM5268644 | Sham, 3 dpi | 544 | 32,285 | `nCount_Spatial` |
| GSM5268645 | Sham, 7 dpi | 960 | 14,655 | `nCount_SCT` |
| GSM5268646 | MI, 3 dpi | 376 | 14,466 | `nCount_SCT` |
| GSM4983123 | MI, 7 dpi, replicate 1 | 693 | 15,300 | `nCount_SCT` |
| GSM5268647 | MI, 7 dpi, replicate 2 | 791 | 14,519 | `nCount_SCT` |

The count matrices are genes by spots and contain integer counts. They are not
a deposited normalized-expression matrix. For display, retain `raw_count` and
derive a consistent value in the API, for example:

```sql
LN(1 + 10000 * spatial_expression.raw_count / sample_library_total)
```

`sample_library_total` is `n_count_spatial` for GSM5268644 and `n_count_sct`
for the other four samples, as recorded by `matrix_total_column`.

## Download and prepare

Run this on the backend or a staging machine with enough room for the expanded
expression TSVs:

```bash
tools/spatial/download_cui2021.sh /srv/mcaredb-data/cui2021

python3 tools/spatial/cui2021_pipeline.py prepare \
  /srv/mcaredb-data/cui2021/raw \
  /srv/mcaredb-data/cui2021/prepared \
  --copy-images \
  --include-expression
```

The metadata-only preparation is small and fast. Omit `--include-expression`
to load samples, spots, and the 37,004 published cell-type proportions first.
The full option writes five expression shards containing 18,141,434 nonzero
rows. The preprocessor streams matrices and does not materialize a dense matrix.

Apply the schema and load the generated absolute-path SQL on the MySQL host:

```bash
mysql --local-infile=1 mcaredb < tools/spatial/mysql_schema.sql
mysql --local-infile=1 mcaredb < /srv/mcaredb-data/cui2021/prepared/load_mysql.sql
```

For the existing `MHdatabase` server, the portable bundle installer is safer
and easier than invoking those two commands separately. See
`BUNDLE_INSTALL.md` and `install_mysql.sh`; they default to the local socket at
`/var/run/mysqld/mysqld.sock` and refuse to append to nonempty spatial tables.

Copy or expose the five files in `prepared/images/` at a stable path such as
`https://api.mcaredb.org:3305/downloads/spatial/cui2021/GSM5268646.png`.
Do not put the images in MySQL.

## Important limitations

- GEO does not include `scalefactors_json.json` or
  `tissue_positions_list.csv`. Array row/column values are therefore absent.
- The deposited `imagerow` and `imagecol` values are Seurat low-resolution
  coordinates. The pipeline infers a 2000/600 scale because every supplied
  image has a 2,000-pixel maximum dimension. That scale was visually checked
  against all five source images and aligns the spot grids to tissue. Repeat
  the check in the production viewer to catch any CSS sizing or axis reversal.
- `in_tissue=1` is inferred because the metadata contains only retained tissue
  spots. It is not an independently deposited Space Ranger field.
- Spot diameter is an estimate based on the median spot-center pitch and the
  Visium 55/100 diameter-to-pitch ratio; it is not a recovered 10x scale factor.
- No machine-readable infarct, border-zone, or remote-zone annotation is in
  the GEO deposit. Add those only after a documented manual annotation pass.
- GSM5268646 and GSM5268647 contain spreadsheet-corrupted duplicate `2-Mar`
  symbols. Genomic order and the uncorrupted matrices identify them as `Marc2`
  and `March2`; the manifest applies that occurrence-specific correction.

## API contract for the Angular page

The frontend only needs three read endpoints:

```text
GET /spatial/samples
GET /spatial/samples/{accession}/cell-types/{source_name}
GET /spatial/samples/{accession}/expression/{gene_symbol}
```

The final two responses should return the sample image metadata plus spot ID,
barcode, `x_fraction`, `y_fraction`, and value. `Cardiomyocytes` is a derived
UI group equal to `CM1 + CM2 + CM3 + CM4 + CM5`; the remaining current UI names
map to `FB`, `Macrophage`, `EC`, `EndoEC`, and `EPI`. Add `CM2`, `CM3`, and
`Pericyte/SMC` to the UI rather than discarding the published columns.

Primary sources:

- https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE163629
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8421386/
