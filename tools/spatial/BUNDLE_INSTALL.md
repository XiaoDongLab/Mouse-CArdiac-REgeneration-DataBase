# Install the prepared Cui 2021 spatial bundle

This bundle adds six tables to the existing `MHdatabase` database. It does not
modify `DiffExp`, `Sample`, or any other existing table.

## Contents

- `data/`: headerless TSV files ready for MySQL bulk loading
- `images/`: five H&E PNGs for the website download directory
- `mysql_schema.sql`: table definitions and indexes
- `install_mysql.sh`: guarded local-socket installer
- `cui2021_manifest.json`: source filenames, checksums, and provenance
- `SHA256SUMS`: checksums for this prepared bundle

Expected database row counts after import:

| Table | Rows |
| --- | ---: |
| `spatial_sample` | 5 |
| `spatial_gene` | 32,303 |
| `spatial_cell_type` | 11 |
| `spatial_spot` | 3,364 |
| `spatial_spot_cell_type` | 37,004 |
| `spatial_expression` | 18,141,434 |

## Server commands

Extract the archive on `donglab-vm-01`:

```bash
tar -xzf MCaReDB_Cui2021_MySQL.tar.gz
cd MCaReDB_Cui2021_MySQL
```

Verify the transfer:

```bash
sha256sum -c SHA256SUMS
```

Check whether MySQL permits local bulk loading:

```bash
mysql -u root -p -S /var/run/mysqld/mysqld.sock \
  -Nse "SHOW GLOBAL VARIABLES LIKE 'local_infile';"
```

The installer only reads that global setting; it does not change it. If the
value is `OFF`, stop before importing. Enabling `local_infile` is a server-wide
change and should be coordinated with the system administrator. If it is
approved, enable it only for the import and restore the original value
immediately afterward:

```bash
mysql -u root -p -S /var/run/mysqld/mysqld.sock \
  -e "SET GLOBAL local_infile = ON;"

./install_mysql.sh

mysql -u root -p -S /var/run/mysqld/mysqld.sock \
  -e "SET GLOBAL local_infile = OFF;"
```

If `local_infile` was already `ON`, run the import directly. The installer
defaults match this server. It prompts once for a read-only preflight and once
for the import:

```bash
./install_mysql.sh
```

The installer refuses to load if any target spatial table already exists. The
preflight runs before table creation, so an accidental second import makes no
changes. Loading 18.1 million indexed rows can take several minutes depending
on disk speed.

The installer is hard-locked to `MHdatabase`. It creates and loads only these
tables in that database: `spatial_sample`, `spatial_gene`,
`spatial_cell_type`, `spatial_spot`, `spatial_spot_cell_type`, and
`spatial_expression`. It does not issue `USE`, DDL, or DML statements against
`scRNAseqDB`, `mysql`, `sys`, `performance_schema`, or `information_schema`.
The preflight performs one read-only query of `information_schema.tables` and
the global `local_infile` value; it does not modify either one.

After the import, copy the images to the directory already exposed as
`https://api.mcaredb.org:3305/downloads/`:

```bash
mkdir -p /PATH/TO/DOWNLOADS/spatial/cui2021
cp images/*.png /PATH/TO/DOWNLOADS/spatial/cui2021/
```

Replace `/PATH/TO/DOWNLOADS` with the actual filesystem directory used by the
backend. The resulting public filenames are stable accession-based names such
as `spatial/cui2021/GSM5268646.png`.

## Connection overrides

Only use these when the server differs from the defaults:

```bash
MYSQL_DATABASE=MHdatabase \
MYSQL_USER=root \
MYSQL_SOCKET=/var/run/mysqld/mysqld.sock \
./install_mysql.sh
```

`MYSQL_DATABASE`, when supplied, must be exactly `MHdatabase`; any other value
causes the installer to stop before connecting to MySQL.

Do not place passwords in this script, environment variables, shell history,
or command-line `-pPASSWORD` arguments.
