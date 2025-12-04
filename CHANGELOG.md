# Version history

The latest stable version is **2.2512.01.1**, compiled on 04 December 2025.

## 2.2512.01.1 (main) - 4 Dec 2025

### Miscellaneous

- Changed PMID #34489413 to #32220304.

## 2.2509.42.1 (main) - 8 Sep 2025

### Miscellaneous

- We migrated bootstrap to ng-bootstrap to utilize max capability. Some issues of ng-bootstrap is still fixing. 
  
- We changed the main font to `Rubik`. Several other design languages are updated.

## 2.2509.9.1 (main) - 8 Sep 2025

### New Features

- **Gene Expression**: In this page you can view how genes expressed differently across conditions through a box plot. You can add multiple genes with separated conditions to compare, and you may be able to select which column(s) you want to show or hide.

- **Documentation**: This page gives you a summary of the experimental, statistical and cellular terminology.

### Miscellaneous

- We add a NES cutoff selector in the Pathway Enrichment page. This will show a cutoff line in the central chart.
  
- We temporarily disabled multi language mode since the translation is still incomplete.

## 2.2508.0.1 (main) - 1 Aug 2025

### Fixed issues

- Fixed an issue that the search grid will return empty results when selecting more than two cell types.

- Fixed an issue that selecting PMID will not result in filtering data.

- Fixed an issue that the tooltip will remain on the page when loading DEG results.

- Fixed an issue that the search grid will always show miscellaneous files in the front rows.

### Miscellaneous

- We added `Reset` buttons for cell type, pmid and file type selection in Search and Download, as well as cell type selection in Pathway Enrichment. Now, clearing all selections will not result in a new data inquiry.

- We changed the icon for light/dark mode switch on the navbar.


## 2.2507.150.1 (main) - 28 July 2025

### New Features

- **Adjust threshold P-value**: You can adjust your default threshold p-value in settings.

- **Language support**: Now support for Chinese/Simplified is fully configured.

### Miscellaneous

- We adjusted some designs to fit the accessibility standards.

## 2.2507.11.0 (feature-i18n) - 24 July 2025

### New Features

- **Multilanguage support**: We're configuring support for Chinese (Simplified), Chinese (Traditional) and Japanese. Some of the pages are still under translation.
  
### Miscellaneous

- Now in Genome Browser, you can see the cluster number of each group by hovering the metaplots.

## 1.2507.124.1 (main) - 23 July 2025

### New Features

- **Cutoff popover**: You can now view the cutoff values of P-value and Log2FC by clicking the buttons in the selection bar in Genome Browser.

### Fixed issues

- We have added missing animations to charts in Pathway Enrichment page.
  
- We fixed an issue that you may not able to view modelplots when you use the website first time.

- We fixed an issue that the website may receive error response if you clear all cell type selections.
  
- We fixed an issue that changing cell types will not result in a new query.

### Miscellaneous

- We added MIT license to the [Github repo](https://github.com/AnthonyShea/MouseHeartDatabase/) as well as the settings page.

- We added our modified `igv.js` submodule to the [Github repo](https://github.com/AnthonyShea/MouseHeartDatabase/).

- We updated colors in ApexCharts to avoid any color inverts in dark mode.
  
- P-value and Log2FC cutoffs are now displaying on the modelplot as well as descriptions.

- More icons were added to the website.

## 1.2507.88.1 - 18 July 2025

### Important to Know

- **Legends**: We add legends on the home page for neonatal and postnatal mice. 

### New Features

- **Citation link**: You can now cite this webcite by clicking the copy button on the home page. The citation text will automatically paste in your clipboard.

- **View non-significant clusters**: You can switch whether you want to display extremely non-significant (i.e. -Log<sub>10</sub>(Adj P-value) = 0) clusters in the settings page.

- **Switch between Y-axis types**: You can choose your preference in logarithmic P-value axis or -Log<sub>10</sub>(Adj P-value) axis in the pathway enrichment page.
  
### Miscellaneous

- We adjusted the colors in the differential expression page. Please note that these colors have not passed grayscale test, therefore it is suggested to use threshold lines in the modelplots to determine Log<sub>2</sub>FC.
  
- The database is adjusted to fit the new data. Threshold values were also changed to adapt previous corrections.

## 1.2507.75.0 - 16 July 2025

### New Features

- **navigate between genes**: When you are viewing DEG results of `Genes interested` or `Genes entered manually`, you can navigate IGV viewport between genes. Orders are determined by expression results.

### Miscellaneous

- Now IGV viewport will always display in three tabs in Genome Browser.

- We updated stylesheets in `igv.js` to fit mobile devices and dark theme. When you check the buttons in IGV navbar, please move your mouse out of the button container to view the status. Otherwise, they may always show as selected since the hover style is the same as checked style.

## 1.2507.55.0 - 11 July 2025

### New Features

- **Pathway browser**: We added a pathway button in `Pathway Enrichment` page which is linked to `biocyc.org` for GO or `kegg.jp` for KEGG.

- **Searching multiple genes**: You can now perform searching DEG data for multiple genes, even they aren't on the same chromosome.

### Fixed Issues

- Now you can run DEG searching without always receiving `Too many or too few genes selected`. This is because you have to run it after `igv.esm.js` loaded. Now, the buttons are disabled before it is completely loaded.

### Known Issues

- When you switch between tabs in `Genome Browser`, you may see the IGV control disappeared. Simply refresh the webpage to get it back.

### Miscellaneous

- Ensembl IDs will be shown in default for DEG results.

- We refreshed some controls in `igv.esm.js` in order to fit the design themes.

## 1.2507.37.0 - 8 July 2025

### Important to Know

- **New KEGG Version**: We used a newer KEGG pathway version to perform NES calculation.

### New Features

- **KEGG Pathway information**: Now you can view the KEGG pathway information. Note that some descriptions aren't available on the kegg.jp website.

- **Command search**: You can use optional commands `--[option1]=<value1>, --[option2]=<value2>` to search files.

### Miscellaneous

- We updated the y-axis for the P-value / log2 Fold change chart to be logarithmic.

## 1.2507.13.0 - 2 July 2025

### Important to Know

- **KEGG Pathways**: We've added Kyoto Encyclopedia of Genes and Genomes (KEGG) data to our database.

- **Clusters display**: All clusters on the pathway enrichment scatter plot will be shown as semi-transparent if the cell type is "All Cells". 

### New Features

- **Pathway selector**: You can select GO or KEGG pathways in the new **Pathway Enrichment** page, previously Go Term Enrichment.

### Fixed Issues

- Fixed an issue that the PubMed publish date could not display properly.

- Fixed an issue that the pathway information popover could not display after switching pathway category.

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
