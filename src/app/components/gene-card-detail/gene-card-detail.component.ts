import { Component, Input, NgModule, SimpleChanges, ViewChild } from '@angular/core';
import { AppComponent } from 'src/app/app.component';
import { DiffExp } from 'src/app/models/diffExp.model';
import { Indices } from 'src/app/models/indices.model';
import { GeneConversionService } from 'src/app/services/name-converter.service';
import { MapsComponent } from '../maps/maps.component';
import { ApexAxisChartSeries, ApexChart, ApexPlotOptions, ApexXAxis, ApexTitleSubtitle, ApexTooltip, ApexYAxis, ApexMarkers, ApexFill, ApexAnnotations, ApexTheme, NgApexchartsModule, ChartComponent } from "ng-apexcharts";
import { AppModule } from 'src/app/app.module';
import { TranslateDirective, TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  theme?: ApexTheme;
  markers: ApexMarkers;
  annotations: ApexAnnotations;
  colors?: string[]; // Add colors property
};

@Component({
  selector: 'app-gene-card-detail',
  imports: [MapsComponent, RouterOutlet, RouterModule, CommonModule, NgbModule, TranslateModule, TranslatePipe, TranslateDirective, NgApexchartsModule],
  templateUrl: './gene-card-detail.component.html',
  styleUrl: './gene-card-detail.component.css',
  template: '<apx-chart></apx-chart>'
})
export class GeneCardDetailComponent {
  @Input() gene_list: any[] = [];
  @Input() indices: Indices[] = [];
  @Input() completely_loaded: boolean = false;
  @ViewChild('chart') child: MapsComponent;
  public model_chart_options1_Sham: Partial<ChartOptions>;
  public model_chart_options3_Sham: Partial<ChartOptions>;
  public model_chart_options1_MI: Partial<ChartOptions>;
  public model_chart_options3_MI: Partial<ChartOptions>;
  public model_chart_options: Partial<ChartOptions>;
  public model_chart_optionsP1_1: Partial<ChartOptions>;
  public model_chart_optionsP1_3: Partial<ChartOptions>;
  public model_chart_optionsP8_1: Partial<ChartOptions>;
  public model_chart_optionsP8_3: Partial<ChartOptions>;
  sum_1_Sham: number;
  series_1_Sham: number[];
  sum_1_MI: number;
  series_1_MI: number[];
  sum_3_MI: number;
  series_3_MI: number[];
  sum_3_Sham: number;
  series_3_Sham: number[];
  sum_1_P1: number;
  series_1_P1: number[];
  sum_1_P8: number;
  series_1_P8: number[];
  sum_3_P1: number;
  series_3_P1: number[];
  sum_3_P8: number;
  series_3_P8: number[];
  to_map: any;
  avg_fixed_effect: String;
  avg_p_val: String;
  temp: DiffExp[] = [];
  num_studies: Number;
  en_id: string;
  ensembl_id: string;
  sig_up_color: string = 'rgb(99, 99, 255)'
  sli_up_color: string = 'rgb(255, 99, 255)'
  no_change_color: string = 'rgb(0, 142, 0)'
  sli_dn_color: string = 'rgb(157, 136, 0)'
  sig_dn_color: string = 'rgb(255, 99, 99)'
  no_sig_fit_color: string = 'rgb(0, 0, 0)'
  progressbar_colors = [this.sig_dn_color, this.sli_dn_color, this.no_change_color, this.sli_up_color, this.sig_up_color, this.no_sig_fit_color].slice().reverse();
  labels = ["Significantly downregulated", "Slightly downregulated", "No change", "Slightly upregulated", "Significantly upregulated", "No significant fit"].slice().reverse();
  // lfc_sig_cutoff = 0.0116
  // lfc_minor_sig_cutoff = 0.0037
  lfc_sig_cutoff = 0.58
  lfc_minor_sig_cutoff = 0.25
  display = 'ShamMI';
  fdr_cutoff = 0.05;
  colorPreference: number = localStorage["colorPreference"] ? localStorage["colorPreference"] : 0;

  tooltipList: any[];

  model_selected = false;
  constructor(private geneConversionService: GeneConversionService, public appComponent: AppComponent) { }

  makeid(length: number): string {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  onItemSelected_Nav(text: any) {
    this.display = text;
  }

  getColorTheme(): boolean {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (prefersDark && this.colorPreference == 0 || this.colorPreference == 2);
  }

  ngOnInit(): void {
    this.num_studies = this.getNumUniqueStudies()
    this.temp.push(this.gene_list[0])
    let temp_string = "00000000000" + this.gene_list[0].gene?.toString()
    this.en_id = "ENSMUSG" + temp_string.slice(-11)
    this.ensembl_id = this.en_id;
    this.geneConversionService.convertEnsembleToGene(this.en_id).then((result: string) => {
      this.en_id = result == "" ? this.en_id : result;
      /*if(this.en_id.length<15){
        this.en_id += ' '.repeat(15-this.en_id.length)
      }*/
    }).catch((error: any) => {
      console.error('Error converting ensemble ID to gene:', error);
    });

    if (this.completely_loaded) {

      const isDarkMode = this.getColorTheme();
      const axisColor = isDarkMode ? '#FFFFFF' : '#000000';

      this.model_chart_options1_Sham = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          background: 'transparent',
          fontFamily: 'var(--bs-body-font-family)',
          events: {
            dataPointSelection: (e, chart, opts) => {
              // console.log("Cluster Clicked - DataPoint Index:", opts.dataPointIndex);
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 1 && gene.Surgery === 'Sham' && (gene.p_value !== 0)) : (gene.PSD === 1 && gene.Surgery === 'Sham'));
              let slected_gene = psd1_genes[opts.dataPointIndex];


              //let slected_gene = this.gene_list[opts.dataPointIndex]
              // Debug: Log what gene is being selected
              // console.log("Selected Gene Data:", slected_gene);



              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },
        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",
          },
          labels: {
            style: {
              colors: axisColor // Add this for x-axis labels
            }
          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          // text: this.gene_list[0].gene!.toString(),
          text: 'Sham - PSD1',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_options1_MI = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          fontFamily: 'var(--bs-body-font-family)',
          height: 300,
          type: "scatter",
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              // console.log("Cluster Clicked - DataPoint Index:", opts.dataPointIndex);
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 1 && gene.Surgery === 'MI' && gene.p_value !== 0) : (gene.PSD === 1 && gene.Surgery === 'MI'));
              let slected_gene = psd1_genes[opts.dataPointIndex];


              //let slected_gene = this.gene_list[opts.dataPointIndex]
              // Debug: Log what gene is being selected
              // console.log("Selected Gene Data:", slected_gene);



              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },
        xaxis: {
          labels: {

          },
        },
        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",

          },
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",

          }
        },
        title: {
          text: 'MI - PSD1',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };





      this.model_chart_options3_Sham = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        chart: {
          height: 300,
          type: "scatter",
          background: 'transparent',
          fontFamily: 'var(--bs-body-font-family)',
          events: {
            dataPointSelection: (e, chart, opts) => {
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 3 && gene.Surgery === 'Sham' && gene.p_value !== 0) : (gene.PSD === 3 && gene.Surgery === 'Sham'));
              let slected_gene = psd1_genes[opts.dataPointIndex];
              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },

        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",

          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          text: 'Sham - PSD3',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_options3_MI = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          fontFamily: 'var(--bs-body-font-family)',
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 3 && gene.Surgery === 'MI' && gene.p_value !== 0) : (gene.PSD === 3 && gene.Surgery === 'MI'));
              let slected_gene = psd1_genes[opts.dataPointIndex];
              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },

        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",

          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          text: 'MI - PSD3',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_optionsP1_1 = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          fontFamily: 'var(--bs-body-font-family)',
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              // console.log("Cluster Clicked - DataPoint Index:", opts.dataPointIndex);
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 1 && gene.Surgery === '' && (gene.natal_status == 'P1' || gene.natal_status == 'P2') && gene.Comparison === 'ShamvsMI' && gene.p_value !== 0) : (gene.PSD === 1 && gene.Surgery === '' && (gene.natal_status == 'P1' || gene.natal_status == 'P2') && gene.Comparison === 'ShamvsMI'));
              let slected_gene = psd1_genes[opts.dataPointIndex];


              //let slected_gene = this.gene_list[opts.dataPointIndex]
              // Debug: Log what gene is being selected
              // console.log("Selected Gene Data:", slected_gene);



              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },
        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",

          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",

          }
        },
        title: {
          text: 'P1 - PSD1',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_optionsP1_3 = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          fontFamily: 'var(--bs-body-font-family)',
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              // console.log("Cluster Clicked - DataPoint Index:", opts.dataPointIndex);
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 3 && gene.Surgery === '' && (gene.natal_status == 'P1' || gene.natal_status == 'P2') && gene.Comparison === 'ShamvsMI' && gene.p_value !== 0) : (gene.PSD === 3 && gene.Surgery === '' && (gene.natal_status == 'P1' || gene.natal_status == 'P2') && gene.Comparison === 'ShamvsMI'));
              // console.log(psd1_genes);
              // console.log("^^ psd1 genes ^^")
              let slected_gene = psd1_genes[opts.dataPointIndex];


              //let slected_gene = this.gene_list[opts.dataPointIndex]
              // Debug: Log what gene is being selected
              // console.log("Selected Gene Data:", slected_gene);



              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },

        markers: {
          size: 5
        },
        yaxis: {
          logarithmic: true,
          logBase: 10,
          title: {
            text: "-Log10(Adjusted P-Value)",

          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          text: 'P1 - PSD3',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_optionsP8_1 = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          fontFamily: 'var(--bs-body-font-family)',
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 1 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI' && gene.p_value !== 0) : (gene.PSD === 1 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI'));
              let slected_gene = psd1_genes[opts.dataPointIndex];
              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },

        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",

          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          text: 'P8 - PSD1',
          align: "center",

        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };

      this.model_chart_optionsP8_3 = {
        series: [{
          name: this.gene_list[0].gene?.toString(),
          data: [],
        }
        ],
        theme: {
          mode: this.getColorTheme() ? 'dark' : 'light'
        },
        chart: {
          height: 300,
          type: "scatter",
          fontFamily: 'var(--bs-body-font-family)',
          background: 'transparent',
          events: {
            dataPointSelection: (e, chart, opts) => {
              const psd1_genes = this.gene_list.filter(gene => !JSON.parse(localStorage["showNogSigCluster"] ?? false) ? (gene.PSD === 3 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI' && gene.p_value !== 0) : (gene.PSD === 3 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI'));
              let slected_gene = psd1_genes[opts.dataPointIndex];
              this.to_map = {
                pmid: slected_gene.pmid,
                cell_type: slected_gene.cell_type,
                gene: slected_gene.gene,
                cell_type2: slected_gene.cell_type2,
                cell_type3: slected_gene.cell_type3,
                slope: slected_gene.slope,
                pvalue: slected_gene.p_value,
                intercept: slected_gene.inter,
                lfc: slected_gene.lfc,
                g_id: slected_gene.plotting_id
              };
              this.model_selected = true;
            }
          },
          zoom: {
            enabled: false
          }
        },
        markers: {
          size: 5
        },
        yaxis: {
          title: {
            text: "-Log10(Adjusted P-Value)",
            style: {
              fontSize: '1rem'
            }
          }
        },
        fill: {
          type: "pattern",
          pattern: {
            style: "verticalLines",
          }
        },
        title: {
          text: 'P8 - PSD3',
          align: "center",
        },
        tooltip: {
          enabled: true,    // Enable the tooltip
          shared: false,    // Only show the tooltip for the hovered point
          intersect: true,  // Tooltip appears only on exact hover
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
            return `<div style="font-size: 14px;">${dataPoint.label}</div>`;
          }
        },
        annotations: {
          yaxis: [
            {
              y: 0 - Math.log10(this.fdr_cutoff),
              strokeDashArray: 10,
            }
          ],
          xaxis: [
            {
              x: 0.25,
              strokeDashArray: 7,
            },
            {
              x: 0.58,
              strokeDashArray: 7,
            },
            {
              x: -0.25,
              strokeDashArray: 7,
            },
            {
              x: -0.58,
              strokeDashArray: 7,
            },
          ]
        }
      };
      this.createDisplayData();
    } else {
      this.createInitialDisplayData();
    }
  }



  ngOnChanges(changes: SimpleChanges): void {
    if (changes['gene_list'] && !changes['gene_list'].firstChange && this.completely_loaded) {
      // Update charts when gene_list input changes
      /// console.log("ggg");
      this.createDisplayData();
    }
  }

  removeNullString(data: any): String {
    return data == null ? '0,0,0,0,0,0' : data;
  }

  removeNullNumber(data: any) {
    return data == null ? 0 : Number.parseInt(data);
  }

  createInitialDisplayData() {
    let P1_3_temp = this.removeNullString(this.gene_list[0].P1_3).split(',');
    let meta_series_infoP1_3 = P1_3_temp.map(val => this.removeNullNumber(val));
    const P1_3_sum = meta_series_infoP1_3.reduce((sum, p) => sum + p);
    this.sum_3_P1 = P1_3_sum;
    this.series_3_P1 = meta_series_infoP1_3.slice().reverse();

    let P1_1_temp = this.removeNullString(this.gene_list[0].P1_1).split(',');
    let meta_series_infoP1_1 = P1_1_temp.map(val => this.removeNullNumber(val));
    const P1_1_sum = meta_series_infoP1_1.reduce((sum, p) => sum + p);
    this.sum_1_P1 = P1_1_sum;
    this.series_1_P1 = meta_series_infoP1_1.slice().reverse();

    let P8_3_temp = this.removeNullString(this.gene_list[0].P8_3).split(',');
    let meta_series_infoP8_3 = P8_3_temp.map(val => this.removeNullNumber(val));
    const P8_3_sum = meta_series_infoP8_3.reduce((sum, p) => sum + p);
    this.sum_3_P8 = P8_3_sum;
    this.series_3_P8 = meta_series_infoP8_3.slice().reverse();

    let P8_1_temp = this.removeNullString(this.gene_list[0].P8_1).split(',');
    let meta_series_infoP8_1 = P8_1_temp.map(val => this.removeNullNumber(val));
    const P8_1_sum = meta_series_infoP8_1.reduce((sum, p) => sum + p);
    this.sum_1_P8 = P8_1_sum;
    this.series_1_P8 = meta_series_infoP8_1.slice().reverse();

    let Sham_3_temp = this.removeNullString(this.gene_list[0].Sham_3).split(',');
    let meta_series_infoSham_3 = Sham_3_temp.map(val => this.removeNullNumber(val));
    const Sham_3_sum = meta_series_infoSham_3.reduce((sum, p) => sum + p);
    this.sum_3_Sham = Sham_3_sum;
    this.series_3_Sham = meta_series_infoSham_3.slice().reverse();

    let Sham_1_temp = this.removeNullString(this.gene_list[0].Sham_1).split(',');
    let meta_series_infoSham_1 = Sham_1_temp.map(val => this.removeNullNumber(val));
    const Sham_1_sum = meta_series_infoSham_1.reduce((sum, p) => sum + p);
    this.sum_1_Sham = Sham_1_sum;
    this.series_1_Sham = meta_series_infoSham_1.slice().reverse();

    let MI_3_temp = this.removeNullString(this.gene_list[0].MI_3).split(',');
    let meta_series_infoMI_3 = MI_3_temp.map(val => this.removeNullNumber(val));
    const MI_3_sum = meta_series_infoMI_3.reduce((sum, p) => sum + p);
    this.sum_3_MI = MI_3_sum;
    this.series_3_MI = meta_series_infoMI_3.slice().reverse();

    let MI_1_temp = this.removeNullString(this.gene_list[0].MI_1).split(',');
    let meta_series_infoMI_1 = MI_1_temp.map(val => this.removeNullNumber(val));
    const MI_1_sum = meta_series_infoMI_1.reduce((sum, p) => sum + p);
    this.sum_1_MI = MI_1_sum;
    this.series_1_MI = meta_series_infoMI_1.slice().reverse();

  }

  createDisplayData() {


    // Split gene_list into PSD groups P1vsP8
    const group1_Sham = this.gene_list.filter(gene => gene.PSD === 1 && gene.Surgery === 'Sham' && gene.Comparison === 'P1vsP8');
    const group1_MI = this.gene_list.filter(gene => gene.PSD === 1 && gene.Surgery === 'MI' && gene.Comparison === 'P1vsP8');
    const group3_MI = this.gene_list.filter(gene => gene.PSD === 3 && gene.Surgery === 'MI' && gene.Comparison === 'P1vsP8');
    const group3_Sham = this.gene_list.filter(gene => gene.PSD === 3 && gene.Surgery === 'Sham' && gene.Comparison === 'P1vsP8');

    // Sham Vs MI
    const groupP1_1 = this.gene_list.filter(gene => gene.PSD === 1 && gene.Surgery === '' && gene.natal_status === 'P1' && gene.Comparison === 'ShamvsMI');
    const groupP1_3 = this.gene_list.filter(gene => gene.PSD === 3 && gene.Surgery === '' && (gene.natal_status == 'P1' || gene.natal_status == 'P2') && gene.Comparison === 'ShamvsMI');
    const groupP8_1 = this.gene_list.filter(gene => gene.PSD === 1 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI');
    const groupP8_3 = this.gene_list.filter(gene => gene.PSD === 3 && gene.Surgery === '' && gene.natal_status === 'P8' && gene.Comparison === 'ShamvsMI');


    // Initialize variables for both groups P1vsP8
    let model_data1_Sham: { x: number; y: number; fillColor: string }[] = [];
    let model_data3_Sham: { x: number; y: number; fillColor: string }[] = [];
    let meta_series_info1_Sham = [0, 0, 0, 0, 0, 0];
    let meta_series_info3_Sham = [0, 0, 0, 0, 0, 0];
    let cluster_number1_Sham = group1_Sham.length;
    let cluster_number3_Sham = group3_Sham.length;

    // Initialize variables for both groups
    let model_data1_MI: { x: number; y: number; fillColor: string }[] = [];
    let model_data3_MI: { x: number; y: number; fillColor: string }[] = [];
    let meta_series_info1_MI = [0, 0, 0, 0, 0, 0];
    let meta_series_info3_MI = [0, 0, 0, 0, 0, 0];
    let cluster_number1_MI = group1_MI.length;
    let cluster_number3_MI = group3_MI.length;

    // Track ranges separately for each group
    let min_lfc1_Sham = Number.POSITIVE_INFINITY;
    let max_lfc1_Sham = Number.NEGATIVE_INFINITY;
    let max_p_val1_Sham = 100;

    let min_lfc3_Sham = Number.POSITIVE_INFINITY;
    let max_lfc3_Sham = Number.NEGATIVE_INFINITY;
    let max_p_val3_Sham = 100;
    // Track ranges separately for each group
    let min_lfc1_MI = Number.POSITIVE_INFINITY;
    let max_lfc1_MI = Number.NEGATIVE_INFINITY;
    let max_p_val1_MI = 100;

    let min_lfc3_MI = Number.POSITIVE_INFINITY;
    let max_lfc3_MI = Number.NEGATIVE_INFINITY;
    let max_p_val3_MI = 100;


    // Initialize variables for both groups ShamvsMI
    let model_dataP1_1: { x: number; y: number; fillColor: string }[] = [];
    let model_dataP8_1: { x: number; y: number; fillColor: string }[] = [];
    let meta_series_infoP1_1 = [0, 0, 0, 0, 0, 0];
    let meta_series_infoP8_1 = [0, 0, 0, 0, 0, 0];
    let cluster_numberP1_1 = groupP1_1.length;
    let cluster_numberP8_1 = groupP8_1.length;

    // Initialize variables for both groups
    let model_dataP1_3: { x: number; y: number; fillColor: string }[] = [];
    let model_dataP8_3: { x: number; y: number; fillColor: string }[] = [];
    let meta_series_infoP1_3 = [0, 0, 0, 0, 0, 0];
    let meta_series_infoP8_3 = [0, 0, 0, 0, 0, 0];
    let cluster_numberP1_3 = groupP1_3.length;
    let cluster_numberP8_3 = groupP8_3.length;

    // Track ranges separately for each group
    let min_lfcP1_1 = Number.POSITIVE_INFINITY;
    let max_lfcP1_1 = Number.NEGATIVE_INFINITY;
    let max_p_valP1_1 = 100;

    let min_lfcP8_1 = Number.POSITIVE_INFINITY;
    let max_lfcP8_1 = Number.NEGATIVE_INFINITY;
    let max_p_valP8_1 = 100;

    // Track ranges separately for each group
    let min_lfcP1_3 = Number.POSITIVE_INFINITY;
    let max_lfcP1_3 = Number.NEGATIVE_INFINITY;
    let max_p_valP1_3 = 100;

    let min_lfcP8_3 = Number.POSITIVE_INFINITY;
    let max_lfcP8_3 = Number.NEGATIVE_INFINITY;
    let max_p_valP8_3 = 100;

    for (let i = 0; i < cluster_number1_Sham; i++) {
      let gene = group1_Sham[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_info1_Sham = this.updateMetaSeriesInfo(meta_series_info1_Sham, lfc, p_value);

      if (lfc < min_lfc1_Sham) min_lfc1_Sham = lfc;
      if (lfc > max_lfc1_Sham) max_lfc1_Sham = lfc;
      if (p_value > max_p_val1_Sham) max_p_val1_Sham = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;

      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_data1_Sham.push(formatted_data);
    }

    for (let i = 0; i < cluster_number3_Sham; i++) {
      let gene = group3_Sham[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_info3_Sham = this.updateMetaSeriesInfo(meta_series_info3_Sham, lfc, p_value);


      if (lfc < min_lfc3_Sham) min_lfc3_Sham = lfc;
      if (lfc > max_lfc3_Sham) max_lfc3_Sham = lfc;
      if (p_value > max_p_val3_Sham) max_p_val3_Sham = p_value;


      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);

      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_data3_Sham.push(formatted_data);
    }


    for (let i = 0; i < cluster_number1_MI; i++) {
      let gene = group1_MI[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_info1_MI = this.updateMetaSeriesInfo(meta_series_info1_MI, lfc, p_value);

      if (lfc < min_lfc1_MI) min_lfc1_MI = lfc;
      if (lfc > max_lfc1_MI) max_lfc1_MI = lfc;
      if (p_value > max_p_val1_MI) max_p_val1_MI = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_data1_MI.push(formatted_data);
    }

    // Process PSD 3 group
    for (let i = 0; i < cluster_number3_MI; i++) {
      let gene = group3_MI[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_info3_MI = this.updateMetaSeriesInfo(meta_series_info3_MI, lfc, p_value);

      if (lfc < min_lfc3_MI) min_lfc3_MI = lfc;
      if (lfc > max_lfc3_MI) max_lfc3_MI = lfc;
      if (p_value > max_p_val3_MI) max_p_val3_MI = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_data3_MI.push(formatted_data);
    }

    for (let i = 0; i < cluster_numberP1_1; i++) {
      let gene = groupP1_1[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_infoP1_1 = this.updateMetaSeriesInfo(meta_series_infoP1_1, lfc, p_value);

      if (lfc < min_lfcP1_1) min_lfcP1_1 = lfc;
      if (lfc > max_lfcP1_1) max_lfcP1_1 = lfc;
      if (p_value > max_p_valP1_1) max_p_valP1_1 = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);

      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_dataP1_1.push(formatted_data);
    }

    for (let i = 0; i < cluster_numberP8_1; i++) {
      let gene = groupP8_1[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_infoP8_1 = this.updateMetaSeriesInfo(meta_series_infoP8_1, lfc, p_value);

      if (lfc < min_lfcP8_1) min_lfcP8_1 = lfc;
      if (lfc > max_lfcP8_1) max_lfcP8_1 = lfc;
      if (p_value > max_p_valP8_1) max_p_valP8_1 = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;

      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_dataP8_1.push(formatted_data);
    }


    for (let i = 0; i < cluster_numberP1_3; i++) {
      let gene = groupP1_3[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_infoP1_3 = this.updateMetaSeriesInfo(meta_series_infoP1_3, lfc, p_value);

      if (lfc < min_lfcP1_3) min_lfcP1_3 = lfc;
      if (lfc > max_lfcP1_3) max_lfcP1_3 = lfc;
      if (p_value > max_p_valP1_3) max_p_valP1_3 = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_dataP1_3.push(formatted_data);
    }

    // console.log(model_dataP1_3);
    // console.log("^^ data ^^");

    // Process PSD 3 group
    for (let i = 0; i < cluster_numberP8_3; i++) {
      let gene = groupP8_3[i];
      let lfc = Number(gene.lfc);
      let p_value = Number(gene.p_value);

      if (isNaN(lfc) || isNaN(p_value)) continue;

      meta_series_infoP8_3 = this.updateMetaSeriesInfo(meta_series_infoP8_3, lfc, p_value);

      if (lfc < min_lfcP8_3) min_lfcP8_3 = lfc;
      if (lfc > max_lfcP8_3) max_lfcP8_3 = lfc;
      if (p_value > max_p_valP8_3) max_p_valP8_3 = p_value;

      let fill_color = this.getFillColor(p_value, lfc, gene.cell_type);
      if (p_value == 0 && !JSON.parse(localStorage["showNogSigCluster"] ?? false)) continue;
      let formatted_data = { x: lfc, y: p_value, fillColor: fill_color, label: gene.cell_type };
      model_dataP8_3.push(formatted_data);
    }



    // Calculate ranges for both groups
    let temp1_Sham = Math.max(Math.abs(min_lfc1_Sham), max_lfc1_Sham);
    min_lfc1_Sham = -temp1_Sham - 0.1;
    max_lfc1_Sham = temp1_Sham + 0.1;

    let temp3_Sham = Math.max(Math.abs(min_lfc3_Sham), max_lfc3_Sham);
    min_lfc3_Sham = -temp3_Sham - 0.1;
    max_lfc3_Sham = temp3_Sham + 0.1;

    max_p_val1_Sham = Math.ceil(max_p_val1_Sham + 1)
    max_p_val3_Sham = Math.ceil(max_p_val3_Sham + 1)

    // Calculate ranges for both groups
    let temp1_MI = Math.max(Math.abs(min_lfc1_MI), max_lfc1_MI);
    min_lfc1_MI = -temp1_MI - 0.1;
    max_lfc1_MI = temp1_MI + 0.1;

    let temp3_MI = Math.max(Math.abs(min_lfc3_MI), max_lfc3_MI);
    min_lfc3_MI = -temp3_MI - 0.1;
    max_lfc3_MI = temp3_MI + 0.1;

    max_p_val1_MI = Math.ceil(max_p_val1_MI + 1)
    max_p_val3_MI = Math.ceil(max_p_val3_MI + 1)



    // Calculate ranges for both groups
    let tempP1_1 = Math.max(Math.abs(min_lfcP1_1), max_lfcP1_1);
    min_lfcP1_1 = -tempP1_1 - 0.1;
    max_lfcP1_1 = tempP1_1 + 0.1;

    let tempP1_3 = Math.max(Math.abs(min_lfcP1_3), max_lfcP1_3);
    min_lfcP1_3 = -tempP1_3 - 0.1;
    max_lfcP1_3 = tempP1_3 + 0.1;

    max_p_valP1_1 = Math.ceil(max_p_valP1_1 + 1)
    max_p_valP1_3 = Math.ceil(max_p_valP1_3 + 1)

    // Calculate ranges for both groups
    let tempP8_1 = Math.max(Math.abs(min_lfcP8_1), max_lfcP8_1);
    min_lfcP8_1 = -tempP8_1 - 0.1;
    max_lfcP8_1 = tempP8_1 + 0.1;

    let tempP8_3 = Math.max(Math.abs(min_lfcP8_3), max_lfcP8_3);
    min_lfcP8_3 = -tempP8_3 - 0.1;
    max_lfcP8_3 = tempP8_3 + 0.1;

    max_p_valP8_1 = Math.ceil(max_p_valP8_1 + 1)
    max_p_valP8_3 = Math.ceil(max_p_valP8_3 + 1)

    let num_ticks = 5

    //Setup ModelChart
    this.model_chart_options1_Sham.series = [{ data: model_data1_Sham }];


    this.model_chart_options1_Sham.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfc1_Sham,
      max: max_lfc1_Sham
    }
    this.model_chart_options1_Sham.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_val1_Sham))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Set Heights Model Graph
    let scaler_Sham = cluster_number1_Sham > 15 ? cluster_number1_Sham : 15
    let height_Sham = (scaler_Sham * 15).toString() + 'px'
    //this.model_chart_options.chart!.height = height

    //Setup ModelChart
    this.model_chart_options1_MI.series = [{ data: model_data1_MI }]

    this.model_chart_options1_MI.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfc1_MI,
      max: max_lfc1_MI
    }
    this.model_chart_options1_MI.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_val1_MI))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Set Heights Model Graph
    let scaler = cluster_number1_MI > 15 ? cluster_number1_MI : 15
    let height = (scaler * 15).toString() + 'px'

    //Setup ModelChart
    this.model_chart_options3_Sham.series = [{ data: model_data3_Sham }]
    this.model_chart_options3_Sham.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfc3_Sham,
      max: max_lfc3_Sham
    }
    this.model_chart_options3_Sham.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_val3_Sham))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Setup ModelChart
    this.model_chart_options3_MI.series = [{ data: model_data3_MI }]
    this.model_chart_options3_MI.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfc3_MI,
      max: max_lfc3_MI
    }
    this.model_chart_options3_MI.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_val3_MI))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Setup ModelChart
    this.model_chart_optionsP1_1.series = [{ data: model_dataP1_1 }]

    this.model_chart_optionsP1_1.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfcP1_1,
      max: max_lfcP1_1
    }
    this.model_chart_optionsP1_1.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_valP1_1))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Setup ModelChart
    this.model_chart_optionsP1_3.series = [{ data: model_dataP1_3 }]

    this.model_chart_optionsP1_3.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfcP1_3,
      max: max_lfcP1_3
    }
    this.model_chart_optionsP1_3.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_valP1_3))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Setup ModelChart
    this.model_chart_optionsP8_1.series = [{ data: model_dataP8_1 }]
    this.model_chart_optionsP8_1.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfcP8_1,
      max: max_lfcP8_1
    }
    this.model_chart_optionsP8_1.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_valP8_1))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    //Setup ModelChart
    this.model_chart_optionsP8_3.series = [{ data: model_dataP8_3 }]
    this.model_chart_optionsP8_3.xaxis = {
      title: {
        text: "Fixed Effect (Log2 Fold Change)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      tooltip: {
        enabled: false
      },
      type: "numeric",
      tickAmount: num_ticks,
      min: min_lfcP8_3,
      max: max_lfcP8_3
    }
    this.model_chart_optionsP8_3.yaxis = {
      logarithmic: true,
      logBase: 10,
      title: {
        text: "-Log10(Adjusted P-Value)",
        style: {
          fontSize: '1rem',
          fontFamily: 'var(--bs-body-font-family)'
        }
      },
      min: 0.01,
      max: Math.pow(10, Math.ceil(Math.log10(max_p_valP8_3))),
      labels: {
        formatter: function (val) {
          // Round the y-axis label to an integer
          return "1e" + Math.round(Math.log10(val));
        }
      }
    }

    const P1_3_sum = meta_series_infoP1_3.reduce((sum, p) => sum + p);
    this.sum_3_P1 = P1_3_sum;
    this.series_3_P1 = meta_series_infoP1_3.slice().reverse();

    const P1_1_sum = meta_series_infoP1_1.reduce((sum, p) => sum + p);
    this.sum_1_P1 = P1_1_sum;
    this.series_1_P1 = meta_series_infoP1_1.slice().reverse();

    const P8_3_sum = meta_series_infoP8_3.reduce((sum, p) => sum + p);
    this.sum_3_P8 = P8_3_sum;
    this.series_3_P8 = meta_series_infoP8_3.slice().reverse();

    const P8_1_sum = meta_series_infoP8_1.reduce((sum, p) => sum + p);
    this.sum_1_P8 = P8_1_sum;
    this.series_1_P8 = meta_series_infoP8_1.slice().reverse();

    const Sham_3_sum = meta_series_info3_Sham.reduce((sum, p) => sum + p);
    this.sum_3_Sham = Sham_3_sum;
    this.series_3_Sham = meta_series_info3_Sham.slice().reverse();

    const Sham_1_sum = meta_series_info1_Sham.reduce((sum, p) => sum + p);
    this.sum_1_Sham = Sham_1_sum;
    this.series_1_Sham = meta_series_info1_Sham.slice().reverse();

    const MI_3_sum = meta_series_info3_MI.reduce((sum, p) => sum + p);
    this.sum_3_MI = MI_3_sum;
    this.series_3_MI = meta_series_info3_MI.slice().reverse();

    const MI_1_sum = meta_series_info1_MI.reduce((sum, p) => sum + p);
    this.sum_1_MI = MI_1_sum;
    this.series_1_MI = meta_series_info1_MI.slice().reverse();

    document.querySelectorAll('.tooltip').forEach(item => { item.remove() });
  }

  updateMetaSeriesInfo(info: number[], lfc: number, pval: number) {
    let i = -1
    if (pval < 0 - Math.log10(this.fdr_cutoff)) {
      i = 5
    }
    else if (lfc <= -this.lfc_sig_cutoff) {
      i = 0
    }
    else if (lfc > -this.lfc_sig_cutoff && lfc < -this.lfc_minor_sig_cutoff) {
      i = 1
    }
    else if (lfc >= -this.lfc_minor_sig_cutoff && lfc <= this.lfc_minor_sig_cutoff) {
      i = 2
    }
    else if (lfc > this.lfc_minor_sig_cutoff && lfc < this.lfc_sig_cutoff) {
      i = 3
    }
    else {
      i = 4
    }
    info[i] = info[i] + 1;
    return (info)
  }

  reorder(list: any, ids: any) {
    let new_list = []
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i]
      new_list.push(list[id])
    }
    return (new_list)
  }
  getNumUniqueStudies() {
    let pmids = []
    for (let i = 0; i < this.gene_list.length; i++) {
      pmids.push(this.gene_list[i].pmid)
    }
    let set = new Set(pmids)
    return (set.size)
  }



  getFillColor(p_val: number, lfc: number, cell_type: string) {
    if (p_val < 0 - Math.log10(this.fdr_cutoff)) {
      return 'rgba(0, 0, 0, ' + (!cell_type.includes("All") ? "1)" : "0.5)");
    }
    if (lfc < -this.lfc_sig_cutoff) {
      return !cell_type.includes("All") ? this.sig_dn_color : this.sig_dn_color.replace("rgb", "rgba")
        .replace(")", ", .5)");
    }
    else if (lfc < -this.lfc_minor_sig_cutoff && lfc >= -this.lfc_sig_cutoff) {
      return !cell_type.includes("All") ? this.sli_dn_color : this.sli_dn_color.replace("rgb", "rgba")
        .replace(")", ", .5)");
    }
    else if (lfc > this.lfc_sig_cutoff) {
      return !cell_type.includes("All") ? this.sig_up_color : this.sig_up_color.replace("rgb", "rgba")
        .replace(")", ", .5)");
    }
    else if (lfc > this.lfc_minor_sig_cutoff && lfc <= this.lfc_sig_cutoff) {
      return !cell_type.includes("All") ? this.sli_up_color : this.sli_up_color.replace("rgb", "rgba")
        .replace(")", ", .5)");
    }
    else return !cell_type.includes("All") ? this.no_change_color : this.no_change_color.replace("rgb", "rgba")
      .replace(")", ", .5)");;
  }

  hideToastControl(control_id: string): void {
    const changelogToast = document.getElementById(control_id);
    document.getElementById("shadow-bg")!.style.display = "none";
    changelogToast!.style.display = "none";
  }
  // cleanArrays(){
  //   let ordered_ids = sortIds(this.gene.fixed_effect);
  //   let num_values = this.gene.fixed_effect!.length;
  //   for(let i = 0; i < this.gene.fixed_effect!.length; i++){
  //     let value = this.gene.fixed_effect![i];
  //     num_values = value=='NA' ? (num_values-1): num_values;
  //   }
  //   ordered_ids = ordered_ids.slice(0,num_values);
  //   this.gene.fixed_effect = this.reorder(this.gene.fixed_effect, ordered_ids)
  //   this.gene.conf_high = this.reorder(this.gene.conf_high, ordered_ids)
  //   this.gene.conf_low = this.reorder(this.gene.conf_low, ordered_ids)
  //   this.gene.p_val = this.reorder(this.gene.p_val, ordered_ids)
  //   this.indices = this.reorder(this.indices, ordered_ids)
  // }
}
