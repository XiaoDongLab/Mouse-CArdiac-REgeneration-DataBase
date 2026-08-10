#!/usr/bin/env Rscript

# Generate condition-level pseudobulk BigWig tracks from the processed
# GSE153479 10x scATAC-seq peak-by-cell matrix.

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 4) {
  stop(
    "Usage: generate_wang_scatac_tracks.R <peak_matrix.h5> <chrom.sizes> ",
    "<bedGraphToBigWig> <output_directory>"
  )
}

h5_path <- normalizePath(args[[1]], mustWork = TRUE)
chrom_sizes_path <- normalizePath(args[[2]], mustWork = TRUE)
converter_path <- normalizePath(args[[3]], mustWork = TRUE)
output_directory <- args[[4]]

if (!requireNamespace("rhdf5", quietly = TRUE)) {
  stop("The Bioconductor rhdf5 package is required.")
}

dir.create(output_directory, recursive = TRUE, showWarnings = FALSE)

barcodes <- rhdf5::h5read(h5_path, "/matrix/barcodes")
features <- rhdf5::h5read(h5_path, "/matrix/features/name")
shape <- rhdf5::h5read(h5_path, "/matrix/shape")
indptr <- rhdf5::h5read(h5_path, "/matrix/indptr")

if (shape[[1]] != length(features) || shape[[2]] != length(barcodes)) {
  stop("Unexpected GSE153479 matrix dimensions.")
}

condition_names <- c("P1 MI", "P1 Sham", "P8 MI", "P8 Sham")
condition_files <- c(
  "wang2020_p1_mi_psd3.bw",
  "wang2020_p1_sham_psd3.bw",
  "wang2020_p8_mi_psd3.bw",
  "wang2020_p8_sham_psd3.bw"
)
condition_index <- as.integer(sub("^.*-", "", barcodes))
if (any(!condition_index %in% seq_along(condition_names))) {
  stop("Unexpected cell-barcode suffix in GSE153479.")
}

peak_counts <- matrix(
  0,
  nrow = length(features),
  ncol = length(condition_names),
  dimnames = list(NULL, condition_names)
)

# The HDF5 matrix is CSC. Read contiguous column blocks to avoid loading both
# ~207-million-entry sparse arrays into memory at once.
chunk_size <- 500L
for (first_column in seq.int(1L, length(barcodes), by = chunk_size)) {
  last_column <- min(first_column + chunk_size - 1L, length(barcodes))
  columns <- first_column:last_column
  nonzero_counts <- diff(indptr[first_column:(last_column + 1L)])
  first_value <- indptr[[first_column]] + 1L
  last_value <- indptr[[last_column + 1L]]

  if (last_value >= first_value) {
    value_range <- first_value:last_value
    rows <- rhdf5::h5read(h5_path, "/matrix/indices", index = list(value_range)) + 1L
    values <- rhdf5::h5read(h5_path, "/matrix/data", index = list(value_range))
    value_conditions <- rep(condition_index[columns], nonzero_counts)

    for (condition in seq_along(condition_names)) {
      selected <- value_conditions == condition
      if (any(selected)) {
        chunk_counts <- rowsum(
          as.numeric(values[selected]),
          rows[selected],
          reorder = FALSE
        )
        peak_rows <- as.integer(rownames(chunk_counts))
        peak_counts[peak_rows, condition] <-
          peak_counts[peak_rows, condition] + chunk_counts[, 1]
      }
    }
  }

  message("Processed ", last_column, " / ", length(barcodes), " cells")
}

peak_coordinates <- strcapture(
  "^([^:]+):([0-9]+)-([0-9]+)$",
  features,
  data.frame(chromosome = character(), start = integer(), end = integer())
)
chrom_sizes <- read.delim(
  chrom_sizes_path,
  header = FALSE,
  col.names = c("chromosome", "size"),
  stringsAsFactors = FALSE
)
chromosome_order <- match(peak_coordinates$chromosome, chrom_sizes$chromosome)
valid_peaks <- !is.na(chromosome_order) &
  peak_coordinates$start >= 0 &
  peak_coordinates$end > peak_coordinates$start &
  peak_coordinates$end <= chrom_sizes$size[chromosome_order]
ordered_peaks <- which(valid_peaks)[order(
  peak_coordinates$chromosome[valid_peaks],
  peak_coordinates$start[valid_peaks],
  peak_coordinates$end[valid_peaks],
  method = "radix"
)]

metadata <- data.frame(
  condition = condition_names,
  cells = as.integer(tabulate(condition_index, nbins = length(condition_names))),
  peak_counts = as.numeric(colSums(peak_counts)),
  normalization = "counts per million peak-matrix insertions",
  file = condition_files
)

for (condition in seq_along(condition_names)) {
  total <- metadata$peak_counts[[condition]]
  if (!is.finite(total) || total <= 0) {
    stop("No accessibility counts found for ", condition_names[[condition]], ".")
  }

  signal <- peak_counts[, condition] / total * 1e6
  selected_peaks <- ordered_peaks[signal[ordered_peaks] > 0]
  bedgraph_path <- tempfile(fileext = ".bedGraph")
  bedgraph <- data.frame(
    chromosome = peak_coordinates$chromosome[selected_peaks],
    start = peak_coordinates$start[selected_peaks],
    end = peak_coordinates$end[selected_peaks],
    signal = sprintf("%.6f", signal[selected_peaks])
  )
  write.table(
    bedgraph,
    bedgraph_path,
    quote = FALSE,
    sep = "\t",
    row.names = FALSE,
    col.names = FALSE
  )

  output_path <- file.path(output_directory, condition_files[[condition]])
  status <- system2(
    converter_path,
    c(bedgraph_path, chrom_sizes_path, output_path),
    stdout = TRUE,
    stderr = TRUE
  )
  unlink(bedgraph_path)
  if (!identical(attr(status, "status"), NULL) && attr(status, "status") != 0) {
    stop(paste(status, collapse = "\n"))
  }
}

write.table(
  metadata,
  file.path(output_directory, "track_metadata.tsv"),
  quote = FALSE,
  sep = "\t",
  row.names = FALSE
)

message("Created ", length(condition_files), " GSE153479 BigWig tracks in ", output_directory)
