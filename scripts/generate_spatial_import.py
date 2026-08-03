#!/usr/bin/env python3
"""Generate an idempotent MySQL/MariaDB import for one Visium sample."""

from __future__ import annotations

import csv
import json
from pathlib import Path


SAMPLE_ID = "GSM4983123"
SERIES_ID = "GSE163629"
POSTNATAL_DAY = 1
SURGERY = "MI"
DPI = 7
REPLICATE = 1

DOWNLOADS = Path("/Users/jiayicui/Downloads")
METADATA_CSV = DOWNLOADS / "GSM4983123_metadata.csv"
COUNT_MATRIX_CSV = DOWNLOADS / "GSM4983123_Count_matrix.csv"
OUTPUT_SQL = Path(__file__).resolve().parents[1] / "sql" / "GSM4983123_spatial_import.sql"


def sql_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def batch_values(rows: list[str], size: int):
    for start in range(0, len(rows), size):
        yield rows[start:start + size]


def main() -> None:
    with METADATA_CSV.open(newline="", encoding="utf-8-sig") as handle:
        metadata = list(csv.DictReader(handle))

    with COUNT_MATRIX_CSV.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        matrix_barcodes = next(reader)
        count_rows = list(reader)

    metadata_barcodes = [row[""] for row in metadata]
    if matrix_barcodes != metadata_barcodes:
        raise ValueError("Count-matrix barcode order does not match metadata barcode order")

    metadata_values: list[str] = []
    for matrix_index, row in enumerate(metadata):
        metadata_values.append(
            "(" + ",".join([
                sql_string(SAMPLE_ID),
                sql_string(row[""]),
                str(matrix_index),
                sql_string(SERIES_ID),
                str(POSTNATAL_DAY),
                sql_string(SURGERY),
                str(DPI),
                str(REPLICATE),
                sql_string(row["orig.ident"]),
                row["nCount_Spatial"],
                row["nFeature_Spatial"],
                row["nCount_SCT"],
                row["nFeature_SCT"],
                row["CM4"],
                row["CM1"],
                row["EndoEC"],
                row["CM3"],
                row["FB"],
                row["EPI"],
                row["Macrophage"],
                row["Pericyte/SMC"],
                row["EC"],
                row["CM2"],
                row["CM5"],
                row["imagerow"],
                row["imagecol"],
            ]) + ")"
        )

    count_values: list[str] = []
    for row in count_rows:
        gene_symbol, *counts = row
        if len(counts) != len(matrix_barcodes):
            raise ValueError(f"Unexpected spot count for gene {gene_symbol}")
        numeric_counts = [int(value) for value in counts]
        counts_json = json.dumps(numeric_counts, separators=(",", ":"))
        count_values.append(
            "(" + ",".join([
                sql_string(SAMPLE_ID),
                sql_string(gene_symbol),
                sql_string("SCT"),
                sql_string(counts_json),
                str(sum(numeric_counts)),
                str(sum(value > 0 for value in numeric_counts)),
            ]) + ")"
        )

    OUTPUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_SQL.open("w", encoding="utf-8", newline="\n") as output:
        output.write("-- Generated from GSM4983123_metadata.csv and GSM4983123_Count_matrix.csv.\n")
        output.write("-- Target: MySQL 8.0+ or MariaDB 10.2+. Counts are ordered by matrix_index.\n")
        output.write("SET NAMES utf8mb4;\nSET autocommit = 0;\nSTART TRANSACTION;\n\n")
        output.write("""CREATE TABLE IF NOT EXISTS `spatial_spot_metadata` (
  `sample_id` VARCHAR(32) NOT NULL,
  `spot_barcode` VARCHAR(32) NOT NULL,
  `matrix_index` SMALLINT UNSIGNED NOT NULL,
  `series_id` VARCHAR(32) NOT NULL,
  `postnatal_day` TINYINT UNSIGNED NOT NULL,
  `surgery` VARCHAR(16) NOT NULL,
  `dpi` SMALLINT UNSIGNED NOT NULL,
  `replicate` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `orig_ident` VARCHAR(64) NULL,
  `ncount_spatial` INT UNSIGNED NOT NULL,
  `nfeature_spatial` INT UNSIGNED NOT NULL,
  `ncount_sct` INT UNSIGNED NOT NULL,
  `nfeature_sct` INT UNSIGNED NOT NULL,
  `cm4` DOUBLE NOT NULL,
  `cm1` DOUBLE NOT NULL,
  `endoec` DOUBLE NOT NULL,
  `cm3` DOUBLE NOT NULL,
  `fb` DOUBLE NOT NULL,
  `epi` DOUBLE NOT NULL,
  `macrophage` DOUBLE NOT NULL,
  `pericyte_smc` DOUBLE NOT NULL,
  `ec` DOUBLE NOT NULL,
  `cm2` DOUBLE NOT NULL,
  `cm5` DOUBLE NOT NULL,
  `image_row` DOUBLE NOT NULL,
  `image_col` DOUBLE NOT NULL,
  PRIMARY KEY (`sample_id`, `spot_barcode`),
  UNIQUE KEY `uq_spatial_metadata_matrix_index` (`sample_id`, `matrix_index`),
  KEY `idx_spatial_metadata_condition` (`series_id`, `postnatal_day`, `surgery`, `dpi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spatial_gene_counts` (
  `sample_id` VARCHAR(32) NOT NULL,
  `gene_symbol` VARCHAR(128) NOT NULL,
  `assay` VARCHAR(16) NOT NULL DEFAULT 'SCT',
  `counts_json` JSON NOT NULL,
  `total_count` BIGINT UNSIGNED NOT NULL,
  `nonzero_spots` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`sample_id`, `gene_symbol`),
  KEY `idx_spatial_gene_symbol` (`gene_symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

""")

        metadata_columns = """(`sample_id`,`spot_barcode`,`matrix_index`,`series_id`,`postnatal_day`,`surgery`,`dpi`,`replicate`,`orig_ident`,`ncount_spatial`,`nfeature_spatial`,`ncount_sct`,`nfeature_sct`,`cm4`,`cm1`,`endoec`,`cm3`,`fb`,`epi`,`macrophage`,`pericyte_smc`,`ec`,`cm2`,`cm5`,`image_row`,`image_col`)"""
        metadata_updates = ",".join(
            f"`{column}`=VALUES(`{column}`)" for column in [
                "matrix_index", "series_id", "postnatal_day", "surgery", "dpi", "replicate",
                "orig_ident", "ncount_spatial", "nfeature_spatial", "ncount_sct", "nfeature_sct",
                "cm4", "cm1", "endoec", "cm3", "fb", "epi", "macrophage", "pericyte_smc",
                "ec", "cm2", "cm5", "image_row", "image_col",
            ]
        )
        for batch in batch_values(metadata_values, 200):
            output.write(f"INSERT INTO `spatial_spot_metadata` {metadata_columns} VALUES\n")
            output.write(",\n".join(batch))
            output.write(f"\nON DUPLICATE KEY UPDATE {metadata_updates};\n\n")

        count_columns = "(`sample_id`,`gene_symbol`,`assay`,`counts_json`,`total_count`,`nonzero_spots`)"
        count_updates = "`assay`=VALUES(`assay`),`counts_json`=VALUES(`counts_json`),`total_count`=VALUES(`total_count`),`nonzero_spots`=VALUES(`nonzero_spots`)"
        for batch in batch_values(count_values, 100):
            output.write(f"INSERT INTO `spatial_gene_counts` {count_columns} VALUES\n")
            output.write(",\n".join(batch))
            output.write(f"\nON DUPLICATE KEY UPDATE {count_updates};\n\n")

        output.write("COMMIT;\nSET autocommit = 1;\n")

    print(f"Wrote {OUTPUT_SQL}")
    print(f"Metadata spots: {len(metadata_values)}")
    print(f"Genes: {len(count_values)}")


if __name__ == "__main__":
    main()
