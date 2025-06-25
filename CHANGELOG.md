# Version history

The latest version is **1.2506.50.0**, compiled on 25 June 2025.

## 1.2506.50.0 - 25 June 2025

### Important to Know

- **New data**: We're uploading new datasets to the server.

- **Angular version**: We've updated the angular version to 20. All DevExtreme controls in the previous version were deprecated in this version.

### New Features

- **Redesigned Search & Download page**: We've updated the data grid control and multiple selection bar.

- **Scatter plots in differential expression results**: All data points marked as "All Cells, Heart" will be shown as semi-transparent points in the charts.

- **Redesigned gene cards**: We've updated the style of UMAP, TSNE and general info boxes in the gene card. This control will now fit your screen or viewport width.

- **Settings page**: Now you can adjust your preferred color theme, font sizes and contrast in the new settings page.

### Fixed Issues

- Fixed an issue that the gene cards can't be sorted by regulation significance.

- Fixed an issue that the "Selected Cluster" card will not display unless you drag the viewport.

- Fixed an issue that the scatter plots may not display correctly.

- Fixed an issue that the PubMed ID will not display due to access control checks.

- Fixed an issue that the download page could not initiate download process correctly.

### Known Issues

- You may need to wait a few seconds before the differential expression results have loaded.

## 0.2506.19.0 - 13 June 2025

### New Features

- **Redesigned Genome Browser**: The IGV and genome browser page was redesigned to fit large devices

- **Redesigned navigation bar**: The navbar was redesigned to fit the modern design.

### Fixed Issues

- Now in the Go term enrichment page, you can view descriptions of the selected pathway.

- Deprecated Gini index graph was removed from the Go term enrichment page.

### Known Issues

- Sometimes the IGV will return empty sets of gene cards, even if you have selected multiple genes.

- Downloading large or multiple files may cause temporary slow down or crash of your browser.

## 0.2506.7.0 - 11 June 2025

### New features

- **Download all data**: Now you can download all available data from the search & download page. Please notice that sorting cell types is not possible at this time.

### Known issues

- You may experience temporary stuck when downloading large files or multiple files.

## 0.2505.35.0 - 09 May 2025

### New features

- **Refreshed search & download page**: The search and download page now has a new design which fits both desktop and mobile devices.

- **Refreshed Go Enrichment page**: The GO enrichment page now has a new design which fits both desktop and mobile devices.

## 0.2505.24.0 - 08 May 2025

### Fixed issues

- Now all controls should be able to display correctly in dark mode.

- Dropdown menus should be collapsed and shown correctly.

- Colors in IGV were changed to adapt color themes.

## 0.2505.2.0 - 07 May 2025

### New features

- **Dark mode**: Now the website could adapt to your system's settings in default. You can also switch website theme manually.

- **Changelog**: You can view new features, fixed issues and known issues by clicking the link in footer.

- **Citation**: Citation of this website is provided when you click the citation link in footer.

### Fixed issues

- Fixed an issue that empty gene cards were displayed randomly.

### Known issues

- Dropdown menu will not be hidden in mobile layout.
