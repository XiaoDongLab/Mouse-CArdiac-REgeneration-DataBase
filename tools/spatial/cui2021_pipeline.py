#!/usr/bin/env python3
"""Validate and prepare the Cui et al. Visium GEO deposit for MySQL."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
import shutil
import struct
import sys
from collections import Counter
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


SCRIPT_DIR = Path(__file__).resolve().parent
MANIFEST_PATH = SCRIPT_DIR / "cui2021_manifest.json"
EXPECTED_METADATA_COLUMNS = [
    "",
    "orig.ident",
    "nCount_Spatial",
    "nFeature_Spatial",
    "nCount_SCT",
    "nFeature_SCT",
    "CM4",
    "CM1",
    "EndoEC",
    "CM3",
    "FB",
    "EPI",
    "Macrophage",
    "Pericyte/SMC",
    "EC",
    "CM2",
    "CM5",
    "imagerow",
    "imagecol",
]


class ValidationError(RuntimeError):
    pass


def load_manifest() -> dict:
    with MANIFEST_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_file(path: Path, expected_sha256: str) -> None:
    if not path.is_file():
        raise ValidationError(f"Missing source file: {path}")
    actual = sha256(path)
    if actual != expected_sha256:
        raise ValidationError(
            f"Checksum mismatch for {path.name}: expected {expected_sha256}, got {actual}"
        )


def read_png_dimensions(path: Path) -> tuple[int, int]:
    with gzip.open(path, "rb") as handle:
        header = handle.read(24)
    if len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValidationError(f"Invalid compressed PNG: {path}")
    return struct.unpack(">II", header[16:24])


def read_metadata(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with gzip.open(path, "rt", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        columns = reader.fieldnames or []
    return rows, columns


@contextmanager
def matrix_rows(
    path: Path, sample: dict
) -> Iterator[tuple[list[str], Iterator[tuple[str, list[str]]]]]:
    handle = gzip.open(path, "rt", encoding="utf-8", newline="")
    try:
        reader = csv.reader(handle)
        header = next(reader)
        barcodes = header[1:] if header and header[0] == "" else header
        correction_counts: Counter[str] = Counter()

        def rows() -> Iterator[tuple[str, list[str]]]:
            corrections = sample.get("gene_symbol_occurrence_corrections", {})
            for row_number, row in enumerate(reader, start=2):
                if not row:
                    continue
                if len(row) != len(barcodes) + 1:
                    raise ValidationError(
                        f"{path.name}:{row_number} has {len(row)} fields; "
                        f"expected {len(barcodes) + 1}"
                    )
                raw_gene = row[0]
                gene = raw_gene
                if raw_gene in corrections:
                    occurrence = correction_counts[raw_gene]
                    replacements = corrections[raw_gene]
                    if occurrence >= len(replacements):
                        raise ValidationError(
                            f"Unexpected extra {raw_gene!r} occurrence in {path.name}"
                        )
                    gene = replacements[occurrence]
                    correction_counts[raw_gene] += 1
                yield gene, row[1:]

            for raw_gene, replacements in corrections.items():
                if correction_counts[raw_gene] != len(replacements):
                    raise ValidationError(
                        f"Expected {len(replacements)} {raw_gene!r} rows in {path.name}; "
                        f"found {correction_counts[raw_gene]}"
                    )

        yield barcodes, rows()
    finally:
        handle.close()


def validate_sample(input_dir: Path, manifest: dict, sample: dict) -> dict:
    paths = {
        "counts": input_dir / sample["counts_file"],
        "metadata": input_dir / sample["metadata_file"],
        "image": input_dir / sample["image_file"],
    }
    for kind, path in paths.items():
        require_file(path, sample["sha256"][kind])

    metadata, columns = read_metadata(paths["metadata"])
    if columns != EXPECTED_METADATA_COLUMNS:
        raise ValidationError(
            f"Unexpected metadata columns in {paths['metadata'].name}: {columns}"
        )
    if len(metadata) != sample["expected_spots"]:
        raise ValidationError(
            f"Unexpected spot count in {paths['metadata'].name}: {len(metadata)}"
        )

    metadata_barcodes = [row[""] for row in metadata]
    if len(metadata_barcodes) != len(set(metadata_barcodes)):
        raise ValidationError(f"Duplicate metadata barcode in {paths['metadata'].name}")

    cell_types = manifest["cell_type_columns"]
    for row_number, row in enumerate(metadata, start=2):
        score_sum = sum(float(row[column]) for column in cell_types)
        if not math.isclose(score_sum, 1.0, rel_tol=0.0, abs_tol=1e-6):
            raise ValidationError(
                f"Cell fractions sum to {score_sum} at {paths['metadata'].name}:{row_number}"
            )

    dimensions = read_png_dimensions(paths["image"])
    expected_dimensions = (sample["image_width"], sample["image_height"])
    if dimensions != expected_dimensions:
        raise ValidationError(
            f"Unexpected dimensions for {paths['image'].name}: {dimensions}"
        )

    matrix_gene_count = 0
    nonzero_count = 0
    column_sums = [0] * len(metadata)
    seen_genes: set[str] = set()
    with matrix_rows(paths["counts"], sample) as (matrix_barcodes, rows):
        if matrix_barcodes != metadata_barcodes:
            raise ValidationError(
                f"Matrix and metadata barcode order differ for {sample['accession']}"
            )
        for gene, values in rows:
            if gene in seen_genes:
                raise ValidationError(
                    f"Duplicate gene symbol after correction in {paths['counts'].name}: {gene}"
                )
            seen_genes.add(gene)
            matrix_gene_count += 1
            for index, raw_value in enumerate(values):
                try:
                    value = int(raw_value)
                except ValueError as error:
                    raise ValidationError(
                        f"Non-integer count {raw_value!r} for {gene} in {paths['counts'].name}"
                    ) from error
                if value < 0:
                    raise ValidationError(
                        f"Negative count for {gene} in {paths['counts'].name}"
                    )
                column_sums[index] += value
                nonzero_count += value != 0

    if matrix_gene_count != sample["expected_genes"]:
        raise ValidationError(
            f"Unexpected gene count for {sample['accession']}: {matrix_gene_count}"
        )
    if nonzero_count != sample["expected_nonzero_values"]:
        raise ValidationError(
            f"Unexpected nonzero count for {sample['accession']}: {nonzero_count}"
        )

    total_column = sample["matrix_total_column"]
    expected_sums = [int(row[total_column]) for row in metadata]
    if column_sums != expected_sums:
        raise ValidationError(
            f"Matrix column sums do not match {total_column} for {sample['accession']}"
        )

    return {
        "accession": sample["accession"],
        "spots": len(metadata),
        "genes": matrix_gene_count,
        "nonzero_values": nonzero_count,
        "matrix_total_column": total_column,
        "image": f"{dimensions[0]}x{dimensions[1]}",
    }


def validate(input_dir: Path, quiet: bool = False) -> list[dict]:
    manifest = load_manifest()
    reports = [validate_sample(input_dir, manifest, sample) for sample in manifest["samples"]]
    if not quiet:
        for report in reports:
            print(
                "{accession}: {spots} spots, {genes} genes, {nonzero_values} nonzero, "
                "totals={matrix_total_column}, image={image}".format(**report)
            )
        print(f"Validated {len(reports)} samples and {sum(r['spots'] for r in reports)} spots.")
    return reports


def write_tsv(path: Path, rows: Iterator[list[object]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerows(rows)


def prepare_metadata(input_dir: Path, output_dir: Path, manifest: dict) -> dict[str, int]:
    hires_scale = manifest["coordinate_space"]["hires_scale"]
    cell_types = manifest["cell_type_columns"]
    spot_ids: dict[str, int] = {}
    sample_rows: list[list[object]] = []
    spot_rows: list[list[object]] = []
    proportion_rows: list[list[object]] = []
    next_spot_id = 1

    for sample in manifest["samples"]:
        image_filename = f"{sample['accession']}.png"
        sample_rows.append(
            [
                sample["sample_key"],
                sample["accession"],
                sample["label"],
                sample["surgery"],
                sample["timepoint"],
                sample["replicate"],
                image_filename,
                sample["image_width"],
                sample["image_height"],
                hires_scale,
                sample["estimated_spot_diameter_hires_px"],
                sample["matrix_total_column"],
                manifest["series"],
            ]
        )
        metadata, _ = read_metadata(input_dir / sample["metadata_file"])
        for row in metadata:
            spot_id = next_spot_id
            next_spot_id += 1
            barcode = row[""]
            spot_ids[f"{sample['accession']}:{barcode}"] = spot_id
            x_lowres = float(row["imagecol"])
            y_lowres = float(row["imagerow"])
            x_hires = x_lowres * hires_scale
            y_hires = y_lowres * hires_scale
            spot_rows.append(
                [
                    spot_id,
                    sample["sample_key"],
                    barcode,
                    x_lowres,
                    y_lowres,
                    x_hires,
                    y_hires,
                    x_hires / sample["image_width"],
                    y_hires / sample["image_height"],
                    1,
                    int(row["nCount_Spatial"]),
                    int(row["nFeature_Spatial"]),
                    int(row["nCount_SCT"]),
                    int(row["nFeature_SCT"]),
                ]
            )
            for cell_type_id, column in enumerate(cell_types, start=1):
                proportion_rows.append(
                    [sample["sample_key"], cell_type_id, spot_id, row[column]]
                )

    write_tsv(output_dir / "spatial_sample.tsv", iter(sample_rows))
    write_tsv(output_dir / "spatial_cell_type.tsv", (
        [cell_type_id, column, column]
        for cell_type_id, column in enumerate(cell_types, start=1)
    ))
    write_tsv(output_dir / "spatial_spot.tsv", iter(spot_rows))
    write_tsv(output_dir / "spatial_spot_cell_type.tsv", iter(proportion_rows))
    return spot_ids


def collect_genes(input_dir: Path, manifest: dict) -> list[str]:
    genes: set[str] = set()
    for sample in manifest["samples"]:
        with matrix_rows(input_dir / sample["counts_file"], sample) as (_, rows):
            for gene, _ in rows:
                genes.add(gene)
    return sorted(genes, key=lambda value: (value.casefold(), value))


def prepare_expression(
    input_dir: Path,
    output_dir: Path,
    manifest: dict,
    spot_ids: dict[str, int],
) -> None:
    genes = collect_genes(input_dir, manifest)
    gene_ids = {gene: index for index, gene in enumerate(genes, start=1)}
    write_tsv(
        output_dir / "spatial_gene.tsv",
        ([gene_id, gene] for gene, gene_id in gene_ids.items()),
    )

    for sample in manifest["samples"]:
        output_path = output_dir / f"spatial_expression_{sample['accession']}.tsv"
        with output_path.open("w", encoding="utf-8", newline="") as output_handle:
            writer = csv.writer(output_handle, delimiter="\t", lineterminator="\n")
            with matrix_rows(input_dir / sample["counts_file"], sample) as (barcodes, rows):
                sample_spot_ids = [
                    spot_ids[f"{sample['accession']}:{barcode}"] for barcode in barcodes
                ]
                for gene, values in rows:
                    gene_id = gene_ids[gene]
                    for spot_id, raw_value in zip(sample_spot_ids, values):
                        value = int(raw_value)
                        if value:
                            writer.writerow(
                                [sample["sample_key"], gene_id, spot_id, value]
                            )


def copy_images(input_dir: Path, output_dir: Path, manifest: dict) -> None:
    image_dir = output_dir / "images"
    image_dir.mkdir(exist_ok=True)
    for sample in manifest["samples"]:
        source = input_dir / sample["image_file"]
        destination = image_dir / f"{sample['accession']}.png"
        with gzip.open(source, "rb") as source_handle, destination.open("wb") as dest_handle:
            shutil.copyfileobj(source_handle, dest_handle)


def write_load_sql(output_dir: Path, include_expression: bool) -> None:
    sql_path = output_dir / "load_mysql.sql"
    root = str(output_dir.resolve()).replace("'", "''")
    statements = [
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 1;",
        f"LOAD DATA LOCAL INFILE '{root}/spatial_sample.tsv' INTO TABLE spatial_sample FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';",
        f"LOAD DATA LOCAL INFILE '{root}/spatial_cell_type.tsv' INTO TABLE spatial_cell_type FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';",
        f"LOAD DATA LOCAL INFILE '{root}/spatial_spot.tsv' INTO TABLE spatial_spot FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';",
        f"LOAD DATA LOCAL INFILE '{root}/spatial_spot_cell_type.tsv' INTO TABLE spatial_spot_cell_type FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';",
    ]
    if include_expression:
        statements.insert(
            2,
            f"LOAD DATA LOCAL INFILE '{root}/spatial_gene.tsv' INTO TABLE spatial_gene FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';",
        )
        for expression_path in sorted(output_dir.glob("spatial_expression_*.tsv")):
            escaped = str(expression_path.resolve()).replace("'", "''")
            statements.append(
                f"LOAD DATA LOCAL INFILE '{escaped}' INTO TABLE spatial_expression "
                "FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';"
            )
    sql_path.write_text("\n".join(statements) + "\n", encoding="utf-8")


def prepare(args: argparse.Namespace) -> None:
    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()
    validate(input_dir, quiet=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    spot_ids = prepare_metadata(input_dir, output_dir, manifest)
    if args.include_expression:
        prepare_expression(input_dir, output_dir, manifest, spot_ids)
    if args.copy_images:
        copy_images(input_dir, output_dir, manifest)
    write_load_sql(output_dir, args.include_expression)
    print(f"Prepared MySQL files in {output_dir}")
    if not args.include_expression:
        print("Expression was skipped. Re-run with --include-expression for nonzero count rows.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="Validate the 15 GEO files")
    validate_parser.add_argument("input_dir", type=Path)

    prepare_parser = subparsers.add_parser("prepare", help="Create MySQL TSVs and web images")
    prepare_parser.add_argument("input_dir", type=Path)
    prepare_parser.add_argument("output_dir", type=Path)
    prepare_parser.add_argument(
        "--include-expression",
        action="store_true",
        help="Write five nonzero expression TSV shards (about 18.1 million rows)",
    )
    prepare_parser.add_argument(
        "--copy-images",
        action="store_true",
        help="Decompress the five H&E PNGs into OUTPUT_DIR/images",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.command == "validate":
            validate(args.input_dir.resolve())
        else:
            prepare(args)
    except (OSError, ValidationError, csv.Error, EOFError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
