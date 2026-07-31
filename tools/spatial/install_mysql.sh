#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
data_dir="${1:-$script_dir/data}"
database="MHdatabase"
mysql_user="${MYSQL_USER:-root}"
mysql_socket="${MYSQL_SOCKET:-/var/run/mysqld/mysqld.sock}"
schema_file="$script_dir/mysql_schema.sql"

if [[ -n "${MYSQL_DATABASE:-}" && "$MYSQL_DATABASE" != "$database" ]]; then
  echo "This installer is locked to MHdatabase; MYSQL_DATABASE may not override it." >&2
  exit 2
fi

required_files=(
  spatial_sample.tsv
  spatial_cell_type.tsv
  spatial_gene.tsv
  spatial_spot.tsv
  spatial_spot_cell_type.tsv
  spatial_expression_GSM4983123.tsv
  spatial_expression_GSM5268644.tsv
  spatial_expression_GSM5268645.tsv
  spatial_expression_GSM5268646.tsv
  spatial_expression_GSM5268647.tsv
)

for filename in "${required_files[@]}"; do
  if [[ ! -f "$data_dir/$filename" ]]; then
    echo "Missing data file: $data_dir/$filename" >&2
    exit 2
  fi
done

if [[ "$data_dir" == *"'"* || "$data_dir" == *$'\n'* ]]; then
  echo "The data path may not contain a quote or newline." >&2
  exit 2
fi

data_dir="$(cd "$data_dir" && pwd)"
sql_file="$(mktemp "${TMPDIR:-/tmp}/mcaredb-spatial-load.XXXXXX.sql")"
trap 'rm -f "$sql_file"' EXIT

{
  echo "USE \`$database\`;"
  cat "$schema_file"
  cat <<SQL

SET SESSION sql_mode = 'STRICT_ALL_TABLES';
SET SESSION foreign_key_checks = 0;
SET SESSION unique_checks = 0;

LOAD DATA LOCAL INFILE '$data_dir/spatial_sample.tsv'
INTO TABLE spatial_sample FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_cell_type.tsv'
INTO TABLE spatial_cell_type FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_gene.tsv'
INTO TABLE spatial_gene FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_spot.tsv'
INTO TABLE spatial_spot FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_spot_cell_type.tsv'
INTO TABLE spatial_spot_cell_type FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_expression_GSM4983123.tsv'
INTO TABLE spatial_expression FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_expression_GSM5268644.tsv'
INTO TABLE spatial_expression FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_expression_GSM5268645.tsv'
INTO TABLE spatial_expression FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_expression_GSM5268646.tsv'
INTO TABLE spatial_expression FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';
LOAD DATA LOCAL INFILE '$data_dir/spatial_expression_GSM5268647.tsv'
INTO TABLE spatial_expression FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n';

SET SESSION unique_checks = 1;
SET SESSION foreign_key_checks = 1;

SELECT 'spatial_sample' AS table_name, COUNT(*) AS row_count FROM spatial_sample
UNION ALL SELECT 'spatial_gene', COUNT(*) FROM spatial_gene
UNION ALL SELECT 'spatial_cell_type', COUNT(*) FROM spatial_cell_type
UNION ALL SELECT 'spatial_spot', COUNT(*) FROM spatial_spot
UNION ALL SELECT 'spatial_spot_cell_type', COUNT(*) FROM spatial_spot_cell_type
UNION ALL SELECT 'spatial_expression', COUNT(*) FROM spatial_expression;
SQL
} > "$sql_file"

if [[ -n "${SPATIAL_INSTALL_SQL_OUTPUT:-}" ]]; then
  cp "$sql_file" "$SPATIAL_INSTALL_SQL_OUTPUT"
  echo "Generated import SQL: $SPATIAL_INSTALL_SQL_OUTPUT"
  exit 0
fi

if [[ ! -S "$mysql_socket" ]]; then
  echo "MySQL socket not found: $mysql_socket" >&2
  exit 2
fi

echo "Running a read-only preflight. MySQL will prompt for $mysql_user's password."
preflight="$({
  mysql \
    --user="$mysql_user" \
    --password \
    --socket="$mysql_socket" \
    --database="$database" \
    --batch \
    --skip-column-names \
    --execute="SELECT @@GLOBAL.local_infile, COUNT(*) FROM information_schema.tables WHERE table_schema = 'MHdatabase' AND table_name IN ('spatial_sample', 'spatial_gene', 'spatial_cell_type', 'spatial_spot', 'spatial_spot_cell_type', 'spatial_expression');"
} 2>/dev/tty)"

IFS=$'\t' read -r local_infile existing_table_count <<< "$preflight"
if [[ "$local_infile" != "1" ]]; then
  echo "Import stopped before making changes: local_infile is OFF." >&2
  exit 2
fi
if [[ "$existing_table_count" != "0" ]]; then
  echo "Import stopped before making changes: one or more target spatial tables already exist." >&2
  exit 2
fi

echo "Importing spatial data into $database through $mysql_socket"
echo "Target database is locked to MHdatabase. No other database is referenced."
echo "The MySQL client will prompt again for $mysql_user's password."
mysql \
  --local-infile=1 \
  --user="$mysql_user" \
  --password \
  --socket="$mysql_socket" \
  --database="$database" \
  --show-warnings \
  < "$sql_file"

echo "Spatial import completed."
