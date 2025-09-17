import { Component, NgZone, OnInit, SimpleChanges, Type, ViewChild } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexPlotOptions, ApexXAxis, ApexTitleSubtitle, ApexTooltip, ApexYAxis, ApexMarkers, ApexFill, ApexAnnotations, ApexStroke, ApexDataLabels, ChartComponent, ApexTheme } from "ng-apexcharts";
import { GoTerm } from 'src/app/models/goTerm.model';
import { DatabaseService } from 'src/app/services/database.service';
import { GeneConversionService } from 'src/app/services/name-converter.service';
import { Router } from '@angular/router';
import { LociService } from 'src/app/services/loci.service';
import { PathwayinfoService } from 'src/app/services/pathwayinfo.service';
import { GiniScore } from 'src/app/models/giniScore.model';
import { DatabaseConstsService } from 'src/app/services/database-consts.service';
import { min, firstValueFrom } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { TranslateService } from '@ngx-translate/core';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  theme?: ApexTheme;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  annotations: ApexAnnotations;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  colors?: string[];
};

@Component({
  selector: 'app-go',
  templateUrl: './go.component.html',
  styleUrls: ['./go.component.css'],
  standalone: false,
})
export class GoComponent implements OnInit {
  @ViewChild('chart') chart!: ChartComponent;
  // Anthony
  comparisonTypes = [
    { text: 'P1 vs P8: MI - PSD1', value: '1' },  // text is correct value, young_old is becuase i am lazy to change
    { text: 'P1 vs P8: MI - PSD3', value: '2' },
    { text: 'P1 vs P8: Sham - PSD1', value: '3' },
    { text: 'P1 vs P8: Sham - PSD3', value: '4' },
    { text: 'Sham vs MI: P1/2 - PSD1', value: '5' },  // text is correct value, young_old is becuase i am lazy to change
    { text: 'Sham vs MI: P1/2 - PSD3', value: '6' },
    { text: 'Sham vs MI: P8 - PSD1', value: '7' },
    { text: 'Sham vs MI: P8 - PSD3', value: '8' }
  ];
  selectedComparisonType: string = '1'; // Default selection
  // Anthony Done

  loading: boolean = true;
  public go_chart_options: Partial<ChartOptions>;
  public pathway_chart_options: Partial<ChartOptions>;
  // public hist_chart_options: Partial<ChartOptions>;
  go_terms: GoTerm[] = [];
  term_selected = false;
  selected_term: GoTerm;
  selected_core_enrichment: string[] = []
  pathway_info: any;
  upreg_enrich_list: string[] = [];
  downreg_enrich_list: string[] = [];
  gini_scores: GiniScore[];
  gini_histogram_data: string;
  pathways: any;
  kegg_pathway_info: any;
  kegg_pathways: any;
  fdr_cutoff: number = isNaN(parseFloat(localStorage["fdrCutoff"])) ? 1 : parseFloat(localStorage["fdrCutoff"]);



  // Add to component properties
  filtered_go_terms: GoTerm[] = [];
  nes_min: number | null = null;   // Actual min filter (null = -Infinity)
  nes_max: number | null = null;   // Actual max filter (null = +Infinity)
  nes_min_bound: number = -10;     // Current min value for slider
  nes_max_bound: number = 10;      // Current max value for slider
  nes_slider_min: number = -10;    // Min possible value for slider
  nes_slider_max: number = 10;     // Max possible value for slider


  search_modes = [
    { text: 'Name Contains', value: 'contains' },
    { text: 'Name Starts With', value: 'startsWith' }
  ];
  tissue_types: string[] = ['Heart'];
  selected_tissues: string[] = this.tissue_types;
  colorPreference: number = localStorage["colorPreference"] ? localStorage["colorPreference"] : 0;
  cell_types = [
    "All Cells",
    "Cardiac cell",
    "B cell",
    "T cell",
    "Red blood cell",
    "Granulocyte",
    "Cardiomyocyte",
    "Cardiomyocyte 1",
    "Cardiomyocyte 1 2",
    "Cardiomyocyte 1 3",
    "Cardiomyocyte 1 4",
    "Cardiomyocyte 2",
    "Cardiomyocyte 2 2",
    "Cardiomyocyte 2 3",
    "Cardiomyocyte 2 4",
    "Cardiomyocyte 3",
    "Cardiomyocyte 4",
    "Cardiomyocyte 4 2",
    "Sinoatrial node (SAN) cell",
    "Sinoatrial node cell",
    "Endothelial cell",
    "Endothelial cell 2",
    "Endothelial cell 3",
    "Endothelial cell 4",
    "Endothelial cell 5",
    "Endothelial cell 6",
    "Macrophage",
    "Macrophage 2",
    "M2 macrophage",
    "Fibroblast",
    "Fibroblast 2",
    "Fibroblast 3",
    "Fibroblast 4",
    "Fibroblast 5",
    "Fibroblast 6",
    "Mural cell",
    "Well-established epicardial progenitor cell",
    "Progenitor cell",
    "Activated fibroblast"
  ];
  upreg_gene_counts: { gene: string, count: string }[];
  downreg_gene_counts: { gene: string, count: string }[];
  selected_cell_types: string[] = this.cell_types;
  selected_pathway: string = 'G protein-coupled receptor signaling pathway';
  selected_pathway_kegg: string = 'Cytokine-cytokine receptor interaction';
  pathway_groupby_go: boolean = true; // False is KEGG
  pathway_groupby_kegg: boolean = false;

  constructor(private databaseService: DatabaseService, private geneConversionService: GeneConversionService, private router: Router, public lociService: LociService, private pathwayInfoService: PathwayinfoService, private zone: NgZone, public appComponent: AppComponent, private t: TranslateService) {
    this.go_chart_options = {
      series: [{
        name: 'TEST',
        data: [],
      }],
      chart: {
        height: "auto",
        type: "scatter",
        events: {
          dataPointSelection: (e, chart, opts) => {
            this.zone.run(() => {
              // Use filtered_go_terms instead of go_terms
              if (this.filtered_go_terms && this.filtered_go_terms.length > opts.dataPointIndex) {
                this.selected_term = this.filtered_go_terms[opts.dataPointIndex];
                this.getGeneSymbols(this.selected_term);
                this.term_selected = true;
              }
            });
          }
        },
        background: 'transparent',
        animations: {
          enabled: true
        },
        zoom: {
          enabled: false
        }
      },
      theme: {
        mode: this.getColorTheme() ? 'dark' : 'light'
      },
      tooltip: {
        enabled: true,    // Enable the tooltip
        shared: false,    // Only show the tooltip for the hovered point
        intersect: true,  // Tooltip appears only on exact hover
        // Enable the tooltip
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
          return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
        }
      },
      markers: {
        size: 5,
      },
      yaxis: {
        title: {
          text: localStorage["useYAxisType"] == '1' ? "P-Value" : "-Log10(Adjusted P-Value)",
          style: {
            fontSize: '1rem',
            fontFamily: 'var(--bs-body-font-family)',
          }
        },
      },
      xaxis: {
        title: {
          text: "Normalized Enrichment Score (NES)",
          style: {
            fontFamily: 'var(--bs-body-font-family)',
            fontSize: '1rem'
          }
        },
        labels: {
          style: {
            fontFamily: 'var(--bs-body-font-family)'
          }
        },
      },
      annotations: {
        yaxis: [
          {
            y: 0 - Math.log10(this.fdr_cutoff),
            borderColor: '#FF4560', // example color for FDR line
            strokeDashArray: 10,
            label: {
              text: `FDR cutoff: ${this.fdr_cutoff.toFixed(2)}`,
              style: {
                color: '#FF4560',
                background: 'transparent',
              },
            },
          }
        ],
        xaxis: [
          {
            x: -5,
            borderColor: '#008FFB',
            strokeDashArray: 5,
            label: {
              text: `NES min: ${(this.nes_min ?? this.nes_min_bound).toFixed(1)}`,
              style: {
                color: '#008FFB',
                background: 'transparent',
              },
            },
          },
          {
            x: 5,
            borderColor: '#14c71dff',
            strokeDashArray: 5,
            label: {
              text: `NES max: ${(this.nes_max ?? this.nes_max_bound).toFixed(1)}`,
              style: {
                color: '#14c71dff',
                background: 'transparent',
              },
            },
          },
        ]
      }

    };
    console.log(appComponent.getColorTheme() ? 'dark' : 'light');
    this.databaseService.loadKEGGInfo().subscribe({
      next: data => {
        this.kegg_pathway_info = data;
      }
    })
    // Get GO Pathways
    this.databaseService.getPathways().subscribe({
      next: (data) => {
        //this.pathways = data.slice(0,100);
        this.pathways = data.sort(([, a], [, b]) => b - a);
      },
      error: (e) => {
        console.error(e);
      },
      complete: () => { }
    });

    this.databaseService.getKEGGPathways().subscribe({
      next: (data) => {
        this.kegg_pathways = data
      },
      error: (err) => {
        console.error(err);
      }
    });
    this.prepareData()
  }

  ngOnInit(): void {
    this.prepareData().then(() => {

      if (this.go_terms.length > 0) {
        const full_min_nes = Math.min(...this.go_terms.map(t => t.nes));
        const full_max_nes = Math.max(...this.go_terms.map(t => t.nes));
        this.go_terms.forEach(term => {
          term.color = this.getColorForValue(term.nes, full_min_nes, full_max_nes);
        });
      }

      // Apply initial filtering
      this.nes_min = this.nes_min_bound;
      console.log("NES min:", this.nes_min);
      this.nes_max = this.nes_max_bound;
      this.nesFilterChanged().then(() => {
        this.go_chart_options.annotations = {
          xaxis: [
            {
              x: this.nes_min ?? this.nes_min_bound,
              borderColor: '#008FFB',
              strokeDashArray: 5,
              label: {
                text: `NES min: ${(this.nes_min ?? this.nes_min_bound).toFixed(1)}`,
                style: {
                  color: '#008FFB',
                  background: 'transparent',
                },
              },
            },
            {
              x: this.nes_max ?? this.nes_max_bound,
              borderColor: '#14c71dff',
              strokeDashArray: 5,
              label: {
                text: `NES max: ${(this.nes_max ?? this.nes_max_bound).toFixed(1)}`,
                style: {
                  color: '#14c71dff',
                  background: 'transparent',
                },
              },
            },
          ],
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              borderColor: '#FF4560', // example color for FDR line
              strokeDashArray: 10,
              label: {
                text: `FDR cutoff: ${this.fdr_cutoff.toFixed(2)}`,
                style: {
                  color: '#FF4560',
                  background: 'transparent',
                },
              },
            }
          ]
        }
      });
    });
  }


  // Update nesMinChanged and nesMaxChanged
  nesMinChanged(): void {
    if (this.nes_min_bound > this.nes_max_bound) {
      this.nes_min_bound = this.nes_max_bound;
    }

    // Save to localStorage
    localStorage["nes_min_bound"] = this.nes_min_bound;

    // Apply filtering - use actual values, not null
    this.nes_min = this.nes_min_bound;

    console.log(`Min changed: ${this.nes_min_bound}`);

    // Recreate the chart data
    this.createDisplayData();
  }

  nesMaxChanged(): void {
    if (this.nes_max_bound < this.nes_min_bound) {
      this.nes_max_bound = this.nes_min_bound;
    }

    // Save to localStorage
    localStorage["nes_max_bound"] = this.nes_max_bound;

    // Apply filtering - use actual values, not null
    this.nes_max = this.nes_max_bound;

    console.log(`Max changed: ${this.nes_max_bound}`);

    // Recreate the chart data
    this.createDisplayData();
  }


  async nesFilterChanged(): Promise<void> {
    // Save to localStorage
    localStorage["nes_min_bound"] = this.nes_min_bound;
    localStorage["nes_max_bound"] = this.nes_max_bound;

    // Apply filtering
    this.nes_min = this.nes_min_bound === this.nes_slider_min ? null : this.nes_min_bound;
    this.nes_max = this.nes_max_bound === this.nes_slider_max ? null : this.nes_max_bound;

    // Recreate the chart data
    await this.createDisplayData();
  }


  async createDisplayData() {
    console.log('Starting createDisplayData');
    console.log(`NES Filter: min=${this.nes_min}, max=${this.nes_max}`);
    console.log(`NES Slider Bounds: min_bound=${this.nes_min_bound}, max_bound=${this.nes_max_bound}`);
    console.log(`Data Range: min=${Math.min(...this.go_terms.map(t => t.nes))}, max=${Math.max(...this.go_terms.map(t => t.nes))}`);

    let filteredTerms = this.go_terms.filter(term => {
      const nes = term.nes;

      const fdr = term.P_Value; // Or term.FDR if that's how your data names it
      const passMin = this.nes_min === null ? true : nes >= this.nes_min;
      const passMax = this.nes_max === null ? true : nes <= this.nes_max;
      const passFDR = this.fdr_cutoff === null ? true : fdr <= this.fdr_cutoff;

      if (!passMin) console.log(`Filtered out (min): ${term.cell_type} NES=${nes} < ${this.nes_min}`);
      if (!passMax) console.log(`Filtered out (max): ${term.cell_type} NES=${nes} > ${this.nes_max}`);
      if (!passFDR) console.log(`Filtered out (FDR): ${term.cell_type} FDR=${fdr} > ${this.fdr_cutoff}`);

      return passMin && passMax && passFDR;
    });

    console.log(`Filtered terms count: ${filteredTerms.length}/${this.go_terms.length}`);

    // Calculate min/max from filtered data
    let min_nes = filteredTerms.reduce((prev, cur) => (prev.nes < cur.nes) ? prev : cur).nes;
    let max_nes = filteredTerms.reduce((prev, cur) => (prev.nes > cur.nes) ? prev : cur).nes;

    // Respect nes_min and nes_max filters for axis bounds
    min_nes = this.nes_min !== null ? Math.floor(Math.min(this.nes_min, min_nes)) : Math.floor(min_nes - 1);
    max_nes = this.nes_max !== null ? Math.ceil(Math.max(this.nes_max, max_nes)) : Math.ceil(max_nes + 1);

    console.log(`Calculated min_nes: ${min_nes}, max_nes: ${max_nes}`);

    // NOW USE FILTERED TERMS FOR THE REST OF THE FUNCTION
    this.upreg_enrich_list = [];
    this.downreg_enrich_list = [];
    let go_data = [];

    let max_p_val = -Math.log10(Number(this.go_terms.reduce((prev, cur) => {
      return (prev && prev.P_Value < cur.P_Value) ? prev : cur;
    }).P_Value));

    // Loop through FILTERED TERMS, not this.go_terms
    for (let i = 0; i < filteredTerms.length; i++) {
      let go_term = filteredTerms[i]; // Use filtered term

      let color = go_term.color
      let label = go_term.cell_type;

      if (label.includes("All")) {
        color = color.replace("rgb", "rgba").replace(")", ",.5)");
      }

      // Convert adjusted p-value to -log10(p-value)
      let pval_transformed = 0 - Math.log10(Number(go_term.P_Value));
      let formatted_data = {
        x: Number(go_term.nes),
        y: Math.round(pval_transformed * 10 ** 3) / 10 ** 3,
        fillColor: color,
        label: label
      };

      go_data.push(formatted_data);
      this.filtered_go_terms = filteredTerms;

      // Set core enrichment values
      let enrich_list = go_term.coreenrichment.split('/');
      if (Number(go_term.nes >= 0)) {
        this.upreg_enrich_list = this.upreg_enrich_list.concat(enrich_list);
      } else {
        this.downreg_enrich_list = this.downreg_enrich_list.concat(enrich_list);
      }
    };

    console.log(go_data)

    let displayed_cluster_length = go_data.length

    //calculte gene prevalance
    this.countOccurrences(this.upreg_enrich_list, 'UP', displayed_cluster_length)
    this.countOccurrences(this.downreg_enrich_list, 'DOWN', displayed_cluster_length)
    max_p_val = Math.ceil(max_p_val + 1)
    let num_ticks = max_nes - min_nes
    this.go_chart_options.series = [{ data: go_data }];
    this.go_chart_options.xaxis = {
      title: {
        text: "Normalized Enrichment Score (NES)",
        style: {
          fontFamily: 'var(--bs-body-font-family)',
          fontSize: '1rem'
        }
      },
      labels: {
        style: {
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      type: "numeric", // Ensure x-axis is numeric
      tooltip: {
        enabled: false
      },
      tickAmount: num_ticks, // Adjust the number of ticks
      min: min_nes, // Set minimum value if needed
      max: max_nes // Set maximum value if needed
    }
    this.go_chart_options.yaxis = {
      title: {
        text: localStorage["useYAxisType"] == '1' ? "P-Value" : "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0,
      max: max_p_val,
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return localStorage["useYAxisType"] == '1' ? ("1e" + -Math.round(val)) : (Math.round(val).toString());
        },
        style: {
          fontFamily: 'var(--bs-body-font-family)'
        }
      }
    }
  }

  getColorForValue(value: number, min_val: number, max_val: number): string {
    // Normalize value to be between 0 and 1
    const min_value = min_val;
    const max_value = max_val;
    const normalizedValue = (value - min_value) / (max_value - min_value);

    // Define the colors
    const colorMidnightBlue = [25, 25, 112];
    const colorWhite = [255, 255, 255];
    const colorFirebrick = [178, 34, 34];

    // Determine position within the gradient
    let r: number, g: number, b: number;

    if (normalizedValue <= 0.5) {
      // Interpolate between Midnight Blue and White
      const percentage = normalizedValue * 2; // Map to range [0, 1]
      r = Math.round(colorMidnightBlue[0] + (colorWhite[0] - colorMidnightBlue[0]) * percentage);
      g = Math.round(colorMidnightBlue[1] + (colorWhite[1] - colorMidnightBlue[1]) * percentage);
      b = Math.round(colorMidnightBlue[2] + (colorWhite[2] - colorMidnightBlue[2]) * percentage);
    } else {
      // Interpolate between White and Firebrick Red
      const percentage = (normalizedValue - 0.5) * 2; // Map to range [0, 1]
      r = Math.round(colorWhite[0] + (colorFirebrick[0] - colorWhite[0]) * percentage);
      g = Math.round(colorWhite[1] + (colorFirebrick[1] - colorWhite[1]) * percentage);
      b = Math.round(colorWhite[2] + (colorFirebrick[2] - colorWhite[2]) * percentage);
    }
    return `rgb(${r},${g},${b})`;
  }

  getColorTheme(): boolean {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (prefersDark && this.colorPreference == 0 || this.colorPreference == 2);
  }

  getGeneSymbols(selected_term: GoTerm): void {
    let ensemble_list = selected_term.coreenrichment.split('/')
    this.geneConversionService.convertEnsemblListToGeneList(ensemble_list)
      .then((result: string[]) => {
        let selected_gene_counts = selected_term.nes > 0 ? this.upreg_gene_counts : this.downreg_gene_counts
        const geneOrderMap = new Map(selected_gene_counts.map(item => [item.gene, item.count]));
        // Filter and sort `result` based on the order in `gene_counts`
        this.selected_core_enrichment = result
          .filter(gene => geneOrderMap.has(gene)) // Keep only genes present in `gene_counts`
          .sort((a, b) => {
            const indexA = selected_gene_counts.findIndex(item => item.gene === a);
            const indexB = selected_gene_counts.findIndex(item => item.gene === b);
            return indexA - indexB;
          }).reverse();

      })
      .catch((error: any) => {
        console.error('Error converting ensemble ID to gene:', error);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.prepareData();
  }

  countOccurrences(gene_list: string[], direction: string, displayed_cluster_length: number): void {
    this.geneConversionService.convertEnsemblListToGeneList(gene_list)
      .then((result: string[]) => {
        const counts: { [gene: string]: number } = {};

        // Count occurrences
        for (const str of result) {
          counts[str] = (counts[str] || 0) + 1;
        }

        // Convert the object to an array of key-value pairs and sort them
        const sortedCounts = Object.entries(counts).sort(([, a], [, b]) => b - a);

        // Convert to array of objects
        const sortedCountsArray = sortedCounts.map(([gene, count]) => ({
          gene,
          count: ((count / displayed_cluster_length) * 100).toFixed(1) + '%'
        }));
        if (direction == 'UP') {
          this.upreg_gene_counts = sortedCountsArray;
        }
        if (direction == 'DOWN') {
          this.downreg_gene_counts = sortedCountsArray;
        }
      })
      .catch((error: any) => {
        console.error('Error converting ensemble ID to gene:', error);
      });
  }

  // Re-wrote
  geneRerout(item: string) {
    this.lociService.setLocus(item);
    this.router.navigate(['/igv']);
  }

  removeItemAll(arr: GoTerm[], value: string) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i].cell_type !== value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
  }

  getPathDisplayData() { //Go pathway
    if (this.pathway_groupby_go) {
      this.pathwayInfoService.getPathwayInfo(this.go_terms[0].goid).subscribe({
        next: (data) => {
          this.pathway_info = data.results[0]
          this.pathway_info.name = this.pathway_info.name.replace(/\b\w/g, (char: string) => char.toUpperCase());
        },
        complete: () => {
        }
      })
    } else {
      console.log(this.kegg_pathway_info)
      this.pathway_info = this.kegg_pathway_info[this.go_terms[0].pathway];
      console.log(this.pathway_info)
    }
  }

  getColorStyle(item: any, direction: string): { [key: string]: string } {
    // Normalize value to be between 0 and 1
    let clean_count = Number(item.count.replace('%', ''))
    const min_value = 0;
    const max_value = 20;
    const normalizedValue = (clean_count - min_value) / (max_value - min_value);

    // Define the colors
    const colorMidnightBlue = [25, 25, 112];
    const colorSkyBlue = [135, 206, 250];
    const colorFirebrick = [178, 34, 34];
    const colorRose = [240, 128, 128];


    // Determine position within the gradient
    let r: number, g: number, b: number;

    if (direction == 'DOWN') {
      // Interpolate between Midnight Blue and White
      const percentage = normalizedValue * 2; // Map to range [0, 1]
      r = Math.round(colorSkyBlue[0] + (colorMidnightBlue[0] - colorSkyBlue[0]) * percentage);
      g = Math.round(colorSkyBlue[1] + (colorMidnightBlue[1] - colorSkyBlue[1]) * percentage);
      b = Math.round(colorSkyBlue[2] + (colorMidnightBlue[2] - colorSkyBlue[2]) * percentage);
    } else {
      // Interpolate between White and Firebrick Red
      const percentage = (normalizedValue - 0.5) * 2; // Map to range [0, 1]
      r = Math.round(colorRose[0] + (colorFirebrick[0] - colorRose[0]) * percentage);
      g = Math.round(colorRose[1] + (colorFirebrick[1] - colorRose[1]) * percentage);
      b = Math.round(colorRose[2] + (colorFirebrick[2] - colorRose[2]) * percentage);
    }
    return { color: `rgb(${r},${g},${b})` };
  }

  async prepareData() {
    this.loading = true;
    this.selected_pathway ??= (this.pathway_groupby_go ? this.pathways[0] : this.kegg_pathways[0]);
    this.selected_cell_types = this.selected_cell_types.length === 0 ? this.cell_types : this.selected_cell_types;

    if (this.pathway_groupby_go) {
      try {
        const data = await firstValueFrom(
          this.databaseService.getGoTerms(this.selected_tissues, this.selected_cell_types, this.selected_pathway, this.selectedComparisonType)
        );
        console.log('Raw GO terms data:', data);
        // Map data to GoTerm class
        this.go_terms = (data || []).map(item => new GoTerm(
          String(item.pathway || this.selected_pathway || ''),
          String(item.goid || ''),
          Number(item.nes || 0),
          Number(item.P_Value || 0),
          String(item.coreenrichment || ''),
          String(item.cell_type || ''),
          String(item.tissue || this.selected_tissues.join(',') || ''),
          Number(item.pmid || 0),
          ''
        ));
        console.log('Mapped go_terms:', this.go_terms);

        if (this.go_terms.length > 0) {
          const full_min_nes = Math.min(...this.go_terms.map(t => t.nes));
          const full_max_nes = Math.max(...this.go_terms.map(t => t.nes));
          this.go_terms.forEach(term => {
            term.color = this.getColorForValue(term.nes, full_min_nes, full_max_nes);
            console.log(`Assigned color to ${term.cell_type}: ${term.color} for NES=${term.nes}`);
          });
        } else {
          console.warn('No GO terms available to assign colors');
        }

        this.filtered_go_terms = [];
        if (this.go_terms.length > 0) {
          const minNES = Math.min(...this.go_terms.map(term => term.nes));
          const maxNES = Math.max(...this.go_terms.map(term => term.nes));
          this.nes_slider_min = Math.floor(minNES - (maxNES - minNES) * 0.1);
          this.nes_slider_max = Math.ceil(maxNES + (maxNES - minNES) * 0.1);
          this.nes_min_bound = this.nes_slider_min;
          this.nes_max_bound = this.nes_slider_max;
          this.nes_min = this.nes_min_bound;
          this.nes_max = this.nes_max_bound;
        }
        this.createDisplayData();
        this.getPathDisplayData();
        this.loading = false;
      } catch (e) {
        console.error('Error loading GO terms:', e);
        this.loading = false;
      }
    } else {
      try {
        const data = await firstValueFrom(
          this.databaseService.getKEGGTerms(this.selected_tissues, this.selected_cell_types, this.selected_pathway_kegg, this.selectedComparisonType)
        );
        console.log('Raw KEGG terms data:', data);
        // Map data to GoTerm class
        this.go_terms = (data || []).map(item => new GoTerm(
          String(item.pathway || this.selected_pathway_kegg || ''),
          String(item.goid || ''),
          Number(item.nes || 0),
          Number(item.P_Value || 0),
          String(item.coreenrichment || ''),
          String(item.cell_type || ''),
          String(item.tissue || this.selected_tissues.join(',') || ''),
          Number(item.pmid || 0),
          ''
        ));
        console.log('Mapped go_terms:', this.go_terms);

        if (this.go_terms.length > 0) {
          const full_min_nes = Math.min(...this.go_terms.map(t => t.nes));
          const full_max_nes = Math.max(...this.go_terms.map(t => t.nes));
          this.go_terms.forEach(term => {
            term.color = this.getColorForValue(term.nes, full_min_nes, full_max_nes);
            console.log(`Assigned color to ${term.cell_type}: ${term.color} for NES=${term.nes}`);
          });
        } else {
          console.warn('No KEGG terms available to assign colors');
        }

        this.filtered_go_terms = [];
        if (this.go_terms.length > 0) {
          const minNES = Math.min(...this.go_terms.map(term => term.nes));
          const maxNES = Math.max(...this.go_terms.map(term => term.nes));
          this.nes_slider_min = Math.floor(minNES - (maxNES - minNES) * 0.1);
          this.nes_slider_max = Math.ceil(maxNES + (maxNES - minNES) * 0.1);
          this.nes_min_bound = this.nes_slider_min;
          this.nes_max_bound = this.nes_slider_max;
          this.nes_min = this.nes_min_bound;
          this.nes_max = this.nes_max_bound;
        }
        this.createDisplayData();
        this.getPathDisplayData();
        this.loading = false;
      } catch (e) {
        console.error('Error loading KEGG terms:', e);
        this.loading = false;
      }
    }
  }

  getNewData() {
    this.loading = true;
    this.term_selected = false;
    this.prepareData()
    this.resetAnnotations()
  }

  onSearchModeChanged(event: any): void {
    console.log('Selected Search Mode:', event.value);
    this.resetAnnotations()
  }

  onCellsChanged() {
    if (this.selected_cell_types.length > 0) {
      this.prepareData().then(() => {
        this.go_chart_options.annotations = {
          xaxis: [
            {
              x: this.nes_min ?? this.nes_min_bound,
              borderColor: '#008FFB',
              strokeDashArray: 5,
              label: {
                text: `NES min: ${(this.nes_min ?? this.nes_min_bound).toFixed(1)}`,
                style: {
                  color: '#008FFB',
                  background: 'transparent',
                },
              },
            },
            {
              x: this.nes_max ?? this.nes_max_bound,
              borderColor: '#14c71dff',
              strokeDashArray: 5,
              label: {
                text: `NES max: ${(this.nes_max ?? this.nes_max_bound).toFixed(1)}`,
                style: {
                  color: '#14c71dff',
                  background: 'transparent',
                },
              },
            },
          ],
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              borderColor: '#FF4560', // example color for FDR line
              strokeDashArray: 10,
              label: {
                text: `FDR cutoff: ${this.fdr_cutoff.toFixed(2)}`,
                style: {
                  color: '#FF4560',
                  background: 'transparent',
                },
              },
            }
          ]
        }
      });
    }
    this.resetAnnotations()
  }
  onPathwayChange() {
    this.prepareData().then(() => {
      this.go_chart_options.annotations = {
        xaxis: [
          {
            x: this.nes_min ?? this.nes_min_bound,
            borderColor: '#008FFB',
            strokeDashArray: 5,
            label: {
              text: `NES min: ${(this.nes_min ?? this.nes_min_bound).toFixed(1)}`,
              style: {
                color: '#008FFB',
                background: 'transparent',
              },
            },
          },
          {
            x: this.nes_max ?? this.nes_max_bound,
            borderColor: '#14c71dff',
            strokeDashArray: 5,
            label: {
              text: `NES max: ${(this.nes_max ?? this.nes_max_bound).toFixed(1)}`,
              style: {
                color: '#14c71dff',
                background: 'transparent',
              },
            },
          },
        ],
        yaxis: [
          {
            y: 0 - Math.log10(this.fdr_cutoff),
            borderColor: '#FF4560', // example color for FDR line
            strokeDashArray: 10,
            label: {
              text: `FDR cutoff: ${this.fdr_cutoff.toFixed(2)}`,
              style: {
                color: '#FF4560',
                background: 'transparent',
              },
            },
          }
        ]
      }
    });
    this.resetAnnotations();
  }

  CutoffChanged() {
    this.createDisplayData();
    this.go_chart_options.annotations = {
      xaxis: [
        {
          x: this.nes_min,
          borderColor: '#008FFB',
          strokeDashArray: 5,
          label: {
            text: `NES min: ${(this.nes_min ?? this.nes_min_bound).toFixed(1)}`,
            style: {
              color: '#008FFB',
              background: 'transparent',
            },
          },
        },
        {
          x: this.nes_max,
          borderColor: '#14c71dff',
          strokeDashArray: 5,
          label: {
            text: `NES max: ${(this.nes_max ?? this.nes_max_bound).toFixed(1)}`,
            style: {
              color: '#14c71dff',
              background: 'transparent',
            },
          },
        },
      ],
      yaxis: [
        {
          y: 0 - Math.log10(this.fdr_cutoff),
          borderColor: '#FF4560', // example color for FDR line
          strokeDashArray: 10,
          label: {
            text: `FDR cutoff: ${this.fdr_cutoff.toFixed(2)}`,
            style: {
              color: '#FF4560',
              background: 'transparent',
            },
          },
        }
      ]
    }
  }

  getRandom(min: number, max: number) {
    return Math.floor((max - min) * Math.random() + min)
  }

  // Method to reset annotations
  resetAnnotations() {
    this.go_chart_options.annotations = {
      yaxis: [],
      xaxis: []
    };
    // If using ng-apexcharts, update the chart explicitly
    if (this.chart && this.chart.updateOptions) {
      this.zone.run(() => {
        this.chart.updateOptions({
          annotations: {
            yaxis: [],
            xaxis: []
          }
        }, true);
      });
    }
  }


}
