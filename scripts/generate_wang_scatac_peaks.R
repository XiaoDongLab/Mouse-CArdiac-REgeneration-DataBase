#!/usr/bin/env Rscript

# Export the consensus peak coordinates stored in the processed GSE153479
# peak-by-cell matrix as an IGV-compatible BED annotation track.

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2) {
  stop("Usage: generate_wang_scatac_peaks.R <peak_matrix.h5> <output.bed>")
}

if (!requireNamespace("rhdf5", quietly = TRUE)) {
  stop("The Bioconductor rhdf5 package is required.")
}

h5_path <- normalizePath(args[[1]], mustWork = TRUE)
output_path <- args[[2]]
dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)

features <- rhdf5::h5read(h5_path, "/matrix/features/name")
peaks <- strcapture(
  "^([^:]+):([0-9]+)-([0-9]+)$",
  features,
  data.frame(chromosome = character(), start = integer(), end = integer())
)

valid <- !is.na(peaks$start) & peaks$end > peaks$start
peaks <- peaks[valid, , drop = FALSE]
chromosome_number <- suppressWarnings(as.integer(sub("^chr", "", peaks$chromosome)))
chromosome_rank <- ifelse(
  !is.na(chromosome_number),
  chromosome_number,
  match(peaks$chromosome, c("chrX", "chrY", "chrM")) + 19L
)
peaks <- peaks[order(chromosome_rank, peaks$start, peaks$end, method = "radix"), , drop = FALSE]
peaks$name <- sprintf("Wang_scATAC_peak_%06d", seq_len(nrow(peaks)))

write.table(
  peaks[, c("chromosome", "start", "end", "name")],
  output_path,
  quote = FALSE,
  sep = "\t",
  row.names = FALSE,
  col.names = FALSE
)

message("Created ", nrow(peaks), " consensus peaks in ", output_path)
