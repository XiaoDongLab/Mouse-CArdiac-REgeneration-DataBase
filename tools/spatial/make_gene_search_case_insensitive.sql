-- This migration changes only MHdatabase.spatial_gene.
USE MHdatabase;

ALTER TABLE spatial_gene
  MODIFY symbol VARCHAR(64)
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  NOT NULL;
