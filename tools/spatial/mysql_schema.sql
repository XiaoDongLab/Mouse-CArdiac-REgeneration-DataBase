CREATE TABLE IF NOT EXISTS spatial_sample (
  sample_key TINYINT UNSIGNED NOT NULL,
  accession CHAR(10) NOT NULL,
  label VARCHAR(80) NOT NULL,
  surgery ENUM('MI', 'Sham') NOT NULL,
  timepoint VARCHAR(16) NOT NULL,
  replicate TINYINT UNSIGNED NOT NULL,
  image_filename VARCHAR(128) NOT NULL,
  image_width SMALLINT UNSIGNED NOT NULL,
  image_height SMALLINT UNSIGNED NOT NULL,
  coord_to_hires_scale DECIMAL(10, 6) NOT NULL,
  estimated_spot_diameter_hires_px DECIMAL(10, 4) NOT NULL,
  matrix_total_column ENUM('nCount_Spatial', 'nCount_SCT') NOT NULL,
  source_series VARCHAR(16) NOT NULL,
  PRIMARY KEY (sample_key),
  UNIQUE KEY uq_spatial_sample_accession (accession)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spatial_gene (
  gene_id MEDIUMINT UNSIGNED NOT NULL,
  symbol VARCHAR(64) NOT NULL,
  PRIMARY KEY (gene_id),
  UNIQUE KEY uq_spatial_gene_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spatial_cell_type (
  cell_type_id TINYINT UNSIGNED NOT NULL,
  source_name VARCHAR(32) NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  PRIMARY KEY (cell_type_id),
  UNIQUE KEY uq_spatial_cell_type_source (source_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS spatial_spot (
  spot_id MEDIUMINT UNSIGNED NOT NULL,
  sample_key TINYINT UNSIGNED NOT NULL,
  barcode CHAR(18) NOT NULL,
  x_lowres DOUBLE NOT NULL,
  y_lowres DOUBLE NOT NULL,
  x_hires DOUBLE NOT NULL,
  y_hires DOUBLE NOT NULL,
  x_fraction DOUBLE NOT NULL,
  y_fraction DOUBLE NOT NULL,
  in_tissue TINYINT(1) NOT NULL,
  n_count_spatial INT UNSIGNED NOT NULL,
  n_feature_spatial SMALLINT UNSIGNED NOT NULL,
  n_count_sct INT UNSIGNED NOT NULL,
  n_feature_sct SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (spot_id),
  UNIQUE KEY uq_spatial_spot_sample_barcode (sample_key, barcode),
  UNIQUE KEY uq_spatial_spot_sample_id (sample_key, spot_id),
  CONSTRAINT fk_spatial_spot_sample
    FOREIGN KEY (sample_key) REFERENCES spatial_sample (sample_key)
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

CREATE TABLE IF NOT EXISTS spatial_spot_cell_type (
  sample_key TINYINT UNSIGNED NOT NULL,
  cell_type_id TINYINT UNSIGNED NOT NULL,
  spot_id MEDIUMINT UNSIGNED NOT NULL,
  proportion FLOAT NOT NULL,
  PRIMARY KEY (sample_key, cell_type_id, spot_id),
  CONSTRAINT fk_spatial_spot_cell_type_sample_spot
    FOREIGN KEY (sample_key, spot_id) REFERENCES spatial_spot (sample_key, spot_id),
  CONSTRAINT fk_spatial_spot_cell_type_cell_type
    FOREIGN KEY (cell_type_id) REFERENCES spatial_cell_type (cell_type_id),
  CONSTRAINT chk_spatial_spot_cell_type_proportion
    CHECK (proportion >= 0 AND proportion <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;

CREATE TABLE IF NOT EXISTS spatial_expression (
  sample_key TINYINT UNSIGNED NOT NULL,
  gene_id MEDIUMINT UNSIGNED NOT NULL,
  spot_id MEDIUMINT UNSIGNED NOT NULL,
  raw_count INT UNSIGNED NOT NULL,
  PRIMARY KEY (sample_key, gene_id, spot_id),
  KEY ix_spatial_expression_spot_gene (spot_id, gene_id),
  CONSTRAINT fk_spatial_expression_sample_spot
    FOREIGN KEY (sample_key, spot_id) REFERENCES spatial_spot (sample_key, spot_id),
  CONSTRAINT fk_spatial_expression_gene
    FOREIGN KEY (gene_id) REFERENCES spatial_gene (gene_id),
  CONSTRAINT chk_spatial_expression_positive CHECK (raw_count > 0)
) ENGINE=InnoDB DEFAULT CHARSET=ascii COLLATE=ascii_bin;
