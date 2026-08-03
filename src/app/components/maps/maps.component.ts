import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { DatabaseService } from 'src/app/services/database.service';
import { Image } from 'src/app/models/image.model';
import { DomSanitizer } from '@angular/platform-browser';
import { ApexAxisChartSeries, ApexChart, ApexPlotOptions, ApexXAxis, ApexTitleSubtitle, ApexTooltip, ApexYAxis, ApexMarkers, ApexFill, ApexAnnotations } from "ng-apexcharts";
import { PubmedService } from 'src/app/services/pubmed.service';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { SpatialPreviewComponent } from '../spatial-preview/spatial-preview.component';
import { SpatialSurgery } from 'src/app/services/spatial.service';
// var ncbi = require('node-ncbi');

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  markers: ApexMarkers;
  annotations: ApexAnnotations;
};

export interface GenomeBrowserSelection {
  pmid: number;
  cell_type: string;
  gene: string | number;
  cell_type2: string;
  cell_type3: string;
  slope: number;
  pvalue: number;
  intercept: number;
  lfc: number;
  g_id: number;
  PSD: number;
  Surgery: string;
  Comparison?: string;
}

export interface CuiSpatialContext {
  gene: string;
  cellType: string;
  surgery: SpatialSurgery;
  timepoint: '3 dpi';
  allowConditionSwitch: boolean;
}

const CUI_STUDY_PMIDS = new Set([32220304, 34489413]);
const HEART_STUDY_METADATA: Record<number, { title: string; author: string; year: string }> = {
  32220304: {
    title: 'Dynamic Transcriptional Responses to Injury of Regenerative and Non-regenerative Cardiomyocytes Revealed by Single-Nucleus RNA Sequencing.',
    author: 'Cui M',
    year: '2020'
  },
  34489413: {
    title: 'Nrf1 promotes heart regeneration and repair by regulating proteostasis and redox balance',
    author: 'Miao Cui',
    year: '2021'
  },
  33296652: {
    title: 'Cell-Type-Specific Gene Regulatory Networks Underlying Murine Neonatal Heart Regeneration at Single-Cell Resolution.',
    author: 'Wang Z',
    year: '2020'
  },
  38510108: {
    title: 'YAP induces a neonatal-like pro-renewal niche in the adult heart.',
    author: 'Li RG',
    year: '2024'
  }
};
const CUI_CELL_TYPE_MAP: Record<string, string> = {
  'cardiomyocyte': 'Cardiomyocytes',
  'cardiomyocytes': 'Cardiomyocytes',
  'cardiomyocyte 1': 'CM1',
  'cardiomyocyte 2': 'CM2',
  'cardiomyocyte 3': 'CM3',
  'cardiomyocyte 4': 'CM4',
  'cardiomyocyte 5': 'CM5',
  'cm1': 'CM1',
  'cm2': 'CM2',
  'cm3': 'CM3',
  'cm4': 'CM4',
  'cm5': 'CM5',
  'endothelial cell': 'Endothelial cells',
  'endothelial cells': 'Endothelial cells',
  'ec': 'EC',
  'endocardial cell': 'Endocardial cells',
  'endocardial cells': 'Endocardial cells',
  'endoec': 'EndoEC',
  'epicardial cell': 'Epicardial cells',
  'epicardial cells': 'Epicardial cells',
  'epi': 'EPI',
  'fibroblast': 'Fibroblasts',
  'fibroblasts': 'Fibroblasts',
  'fb': 'FB',
  'immune cell': 'Immune cells',
  'immune cells': 'Immune cells',
  'macrophage': 'Macrophage',
  'macrophages': 'Macrophage',
  'mural cell': 'Pericyte/SMC',
  'mural cells': 'Pericyte/SMC',
  'pericyte/smc': 'Pericyte/SMC',
  'pericyte / smc': 'Pericyte/SMC'
};

export function getCuiSpatialContext(
  selection: GenomeBrowserSelection | null | undefined,
  gene: string | undefined
): CuiSpatialContext | null {
  if (!selection || !CUI_STUDY_PMIDS.has(Number(selection.pmid)) || Number(selection.PSD) !== 3) return null;

  const normalizedSurgery = selection.Surgery?.trim().toLocaleLowerCase();
  const isConditionComparison = !normalizedSurgery && selection.Comparison === 'ShamvsMI';
  if (normalizedSurgery !== 'mi' && normalizedSurgery !== 'sham' && !isConditionComparison) return null;

  const mappedCellTypes = [selection.cell_type, selection.cell_type2, selection.cell_type3]
    .map(label => label?.trim().replace(/\s+/g, ' ').toLocaleLowerCase())
    .filter(label => label && label !== 'na' && label !== 'none')
    .map(label => {
      const cardiomyocyteMatch = label.match(/^(?:cardiomyocyte|cm)\s*([1-5])(?:\s+\d+)?$/);
      return cardiomyocyteMatch ? `CM${cardiomyocyteMatch[1]}` : CUI_CELL_TYPE_MAP[label];
    })
    .filter((cellType): cellType is string => Boolean(cellType));
  const cellType = mappedCellTypes.find(candidate => /^CM[1-5]$/.test(candidate)) ?? mappedCellTypes[0];
  const symbol = gene?.trim();
  const isUnresolvedEnsemblId = /^ENSMUSG\d+(?:\.\d+)?$/i.test(symbol ?? '');
  if (!cellType || !symbol || isUnresolvedEnsemblId) return null;

  return {
    gene: symbol,
    cellType,
    surgery: normalizedSurgery === 'sham' ? 'Sham' : 'MI',
    timepoint: '3 dpi',
    allowConditionSwitch: isConditionComparison
  };
}

@Component({
  selector: 'app-maps',
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.css'],
  imports: [TranslatePipe, TranslateDirective, SpatialPreviewComponent],
  standalone: true
})
export class MapsComponent implements OnInit {
  @Input() selected_info!: GenomeBrowserSelection;
  @Input() en_id!: string | undefined;
  image: Image[];
  tsne: any;
  umap: any;
  lin_reg_data: any;
  title: string;
  author: string;
  year: string;
  ages: number[];
  exp: number[];
  points_data: any[];
  line_data: any[];
  decade_change: number;
  spatialContext: CuiSpatialContext | null = null;
  private initialized = false;

  public linReg_chart_options: Partial<ChartOptions>;


  maps = [{ text: "UMAP" }, { text: "TSNE" }, { text: "Model Visualization" }, { text: "Meta Info" }];
  display = 'UMAP';

  constructor(private databaseService: DatabaseService, private sanitizer: DomSanitizer, private pubmedService: PubmedService) { }

  ngOnInit(): void {
    this.initialized = true;
    this.loadSelectionData();
    this.updateSpatialContext();
  }

  getClusterImages() {
    //this.databaseService.getImage(this.selected_info.pmid, 1).subscribe({
    this.databaseService.getImage(this.selected_info.pmid, 1).subscribe({
      next: (data) => {
        console.log("TEST: Received image data:", data);
        this.image = data;
        this.umap = this.decodeImage(this.image[0].UMAP!)
        if (this.image[0].TSNE! != null) {
          this.tsne = this.decodeImage(this.image[0].TSNE!)
        }
        else {
          this.tsne = null
        }
      },
      error: (e) => console.error("TEST: Error fetching images", e)
    });
  }

  getLinRegGraphData() {
    this.databaseService.getLinRegData(
      this.selected_info.g_id
    ).subscribe({
      next: (data) => {
        this.ages = data[0].age.replace('"', '').split(',')
        this.exp = data[0].exp.replace('"', '').split(',')
        console.log(this.exp[0])
        this.prepGraphData()
        this.makeLinRegGraph()
      },
      error: (e) => console.error(e)
    });
  }

  prepGraphData() {
    //Prepare Point Data
    let points = []
    for (let i = 0; i < this.ages.length; i++) {
      let point = [Number(this.ages[i]), Number(this.exp[i]).toFixed(3)]
      points.push(point)
    };
    console.log(points)
    let line_data = []
    for (let i = 1; i < 100; i++) {
      let y = (Number(this.selected_info.slope) * i + Number(this.selected_info.intercept)).toFixed(3)
      let point = [i, y]
      line_data.push(point)
    }

    this.points_data = points
    this.line_data = line_data
  }

  makeLinRegGraph() {
    this.linReg_chart_options = {
      series: [{
        name: 'Cell',
        type: 'scatter',
        data: this.points_data
      }, {
        name: 'Linear Visualization',
        type: 'line',
        data: this.line_data
      }],
      chart: {
        height: 350,
        type: 'line'
      },
      fill: {
        type: 'solid',
      },
      markers: {
        size: [6, 0]
      },
      tooltip: {
        shared: false,
        intersect: true,
      },
      xaxis: {
        tickAmount: 10,
        title: {
          text: 'Age (Year)',
          offsetY: 80
        }
      },
      yaxis: {
        labels: {
          formatter: function (value) {
            return (value.toFixed(0)).toString(); // Round the tick value to the nearest whole number
          }
        },
        title: {
          text: 'Normalized Expression',
          offsetX: 0
        }
      }
    }
  }

  arrayBufferToBase64(buffer: any) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  decodeImage(buffer: any) {
    let data = buffer.data
    let base64 = this.arrayBufferToBase64(data)
    return (this.sanitizer.bypassSecurityTrustResourceUrl(`data:image/png;base64, ${base64}`))
  }
  onItemSelected($event: any) {
    this.display = $event.itemData.text
  }

  onItemSelected_Nav(text: any) {
    this.display = text;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selected_info']?.currentValue) {
      this.selected_info = changes['selected_info'].currentValue;
      if (this.initialized) this.loadSelectionData();
    }

    this.updateSpatialContext();
  }

  formatOtherCellTypes() {
    this.selected_info.cell_type2 = this.selected_info.cell_type2 == 'NA' ? '' : (this.selected_info.cell_type2);
    this.selected_info.cell_type3 = this.selected_info.cell_type3 == 'NA' ? '' : (this.selected_info.cell_type3);
    if (this.selected_info.cell_type2 == '' && this.selected_info.cell_type3 == '') {
      this.selected_info.cell_type2 = 'None'
    }
  }

  calculateDecadeChange() {
    console.log(this.selected_info.lfc)
    //this.decade_change = Number((this.selected_info.lfc *1).toFixed(4))
    this.decade_change = Number(((Math.pow(2, this.selected_info.lfc) - 1) * 100).toFixed(4));

  }

  private loadSelectionData(): void {
    if (!this.selected_info) return;

    this.formatOtherCellTypes();
    this.calculateDecadeChange();
    this.getClusterImages();

    const fallback = HEART_STUDY_METADATA[Number(this.selected_info.pmid)];
    if (fallback) {
      this.title = fallback.title;
      this.author = fallback.author;
      this.year = fallback.year;
    }

    this.pubmedService.getPubmedJson(this.selected_info.pmid).subscribe({
      next: pubmed => {
        if (pubmed.title && pubmed.title !== 'Unknown') this.title = pubmed.title;
        if (pubmed.first_author && pubmed.first_author !== 'Unknown') this.author = pubmed.first_author;
        if (pubmed.publish_year && pubmed.publish_year !== 'Unknown') this.year = pubmed.publish_year.toString();
      },
      error: error => console.error('Unable to fetch PubMed metadata', error)
    });
  }

  private updateSpatialContext(): void {
    this.spatialContext = getCuiSpatialContext(this.selected_info, this.en_id);
    if (!this.spatialContext && this.display === 'Spatial') this.display = 'UMAP';
  }

}
