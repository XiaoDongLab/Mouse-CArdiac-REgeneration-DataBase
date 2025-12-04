import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { saveAs } from 'file-saver';
import { DatabaseService } from 'src/app/services/database.service';
import { DatabaseConstsService } from '../../services/database-consts.service'
import { ApexNonAxisChartSeries, ApexResponsive, ApexChart, ApexLegend, ApexDataLabels, ApexPlotOptions, ApexTheme, ApexStroke, ApexAxisChartSeries, ApexXAxis, ApexYAxis, ApexGrid } from "ng-apexcharts";
import { Console } from 'console';
import * as JSZip from 'jszip';
import { type } from 'os';
import { isEmpty, sample } from 'rxjs';
import { ColDef, GridApi } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ModuleRegistry } from 'ag-grid-community';
declare const bootstrap: any;

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  legend: ApexLegend;
  data_labels: ApexDataLabels;
  options: ApexPlotOptions;
  theme: ApexTheme;
  stroke: ApexStroke;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  legend: ApexLegend;
  data_labels: ApexDataLabels;
  options: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  grid: ApexGrid;
  colors: string[];
};


interface DownloadData {
  blob: Blob;
  filename: string;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  standalone: false
})
export class SearchComponent implements OnInit {
  public tissue_chart_options: Partial<DonutChartOptions>;
  public sex_chart_options: Partial<DonutChartOptions>;
  public age_chart_options: Partial<BarChartOptions>;
  public health_chart_options: Partial<DonutChartOptions>;

  DISPLAY_DATA: any[];

  tissue_dict: any = {};
  sex_dict: any = {};
  age_dict: any = { '0-9': 0, '10-19': 0, '20-29': 0, '30-49': 0, '50-64': 0, '65-99': 0, '100+': 0, };
  age_dict_new: any = { 'Neonatal': 0, 'Postnatal': 0 };
  health_dict: any = { 'Healthy': 0, 'Cancer': 0, 'Other': 0, 'Unkown': 0 }
  cell_total: number;
  min_age = -1
  max_age = 1000

  tissue_types: string[] = [];
  cell_types: string[] = [];
  species: string[] = [];
  health: string[] = [];
  age_type: string[] = [];
  pmids: string[] = [];
  pmid: string = '';

  selected_tissues: string[] = [];
  selected_cells: string[] = [];
  selected_species: string[] = [];
  selected_age: number[] = [];
  selected_health: string[] = [];
  selected_age_type: string[] = [];
  selected_pmid: string[] = [];
  neonatal_selected: boolean;
  postnatal_selected: boolean;
  others_selected: boolean;
  goEnrich_selected: boolean;
  degResults_selected: boolean;
  expMatrix_selected: boolean;


  tooltip: any;
  checkBoxesMode: string;
  /*display might need to be display? */
  display: any[];
  selectedRowData: any[] = [];
  selectedRowKeys: any[] = [];
  downloadSize: string;
  query_completed = false;

  columnDefs: ColDef[] = [
    {
      width: 40, checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true
    },

    { field: 'study_id', headerName: 'PMID', filter: true },
    { field: 'cell_types', headerName: 'Cell Type', filter: true },
    { field: 'disease_status', headerName: 'Group', filter: true },
    { field: 'notes', headerName: 'Comparison', filter: true },
    // { field: 'age', headerName: 'Category', filter: true },
    // { field: 'platform', headerName: 'File name', filter: true },
    { field: 'species', headerName: 'File Type', filter: true }
  ];

  column_dicts = {
    'pmid': 'study_id',
    'cell-type': 'cell_types',
    'group': 'disease_status',
    'comparison': 'notes',
    'category': 'age',
    'file-name': 'platform',
    'file-type': 'species'
  }

  private gridApi!: GridApi;

  onGridReady(params: any) { this.gridApi = params.api; }


  maps = [{ text: "Tissue" }, { text: "Sex" }, { text: "Age" }, { text: "Health" }];
  displayed_map = 'Tissue';

  download_options: { name: string; }[] = []
  selected_download_method: string;

  constructor(private databaseConstService: DatabaseConstsService, private databaseService: DatabaseService) {
    ModuleRegistry.registerModules([AllCommunityModule]);
    this.tissue_types = databaseConstService.getTissueTypes();
    //this.species = databaseConstService.getSpecies();
    //this.cell_types = databaseConstService.getCellTypes();
    this.health = ['All', 'Cancer', 'Healthy'];
    this.cell_types = databaseConstService.getSearchCellTypes();
    this.age_type = ['neonatal', 'postnatal'];

    this.selected_tissues = this.tissue_types;
    this.selected_cells = ["Cardiomyocyte",
      "Cardiomyocyte 1",
      "Cardiomyocyte 2",
      "Cardiomyocyte 3",
      "Cardiomyocyte 4"];
    this.selected_species = ["matrix", "barcodes", "tsne", "umap", "info", "features", "diffExp", "Pathway Enrich", "DEG Results"];
    this.species = [...this.selected_species];
    this.selected_age = [0, 110];
    this.selected_age_type = ['neonatal', 'postnatal'];
    this.pmids = ["32220304", "33296652", "38510108"];
    this.selected_pmid = [...this.pmids];
    this.selected_health = ['All'];
    this.neonatal_selected = true;
    this.postnatal_selected = true;
    this.others_selected = true;
    this.degResults_selected = true;
    this.expMatrix_selected = true;
    this.goEnrich_selected = true;
    this.tooltip = {
      enabled: true,
      showMode: 'always',
      position: 'bottom',
    };

    this.download_options = [{ name: 'Download Standardized Data' }, { name: 'Download Unformatted Data' }]
    this.selected_download_method = this.download_options[0].name
  }

  ngOnInit(): void {
    this.samplesTest();
    this.selected_species = this.species;
  }

  ngAfterViewInit(): void {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
  }

  cleanDisplay() {
    this.display.forEach(obj => {
      if (obj.disease_status.length > 0) {
        if (obj.disease_status.toLowerCase() == 'null') {
          obj.disease_status = 'Healthy'
        }
        obj.disease_status = obj.disease_status.charAt(0).toUpperCase() + obj.disease_status.slice(1);
      }
      obj.tissue = obj.tissue.charAt(0).toUpperCase() + obj.tissue.slice(1);
    });
  }

  onInputChange(event: any) {
    const pmid = event.target.value;
    console.log(this.display)
    if (!pmid) this.display = this.DISPLAY_DATA;
    else {
      this.display = this.DISPLAY_DATA.filter(item => item.study_id.toString().includes(pmid))
    }

    // this.samplesTest();

  }

  samplesTest() {
    this.query_completed = false;
    if (this.postnatal_selected && this.neonatal_selected) {
      this.selected_age = [0, 110];
    }
    else if (this.neonatal_selected) {
      this.selected_age = [0, 58];
    }
    else if (this.postnatal_selected) {
      this.selected_age = [59, 110];
    } else {
      this.selected_age = [0, 0];
    }

    this.selected_age[0] = this.others_selected ? -1 : 0; // All NA options are defined as age = -1

    let backend_tissue_select = [];
    let backend_health_select = [];
    if (this.selected_tissues.length == 0) {
      this.selected_tissues = this.tissue_types
    }
    backend_tissue_select = this.addBackendTissue(this.selected_tissues)

    if (this.selected_cells.length == 0) {
      this.selected_cells = this.cell_types
    }
    if (this.selected_health.length == 0) {
      this.selected_health = ["Healthy"];
    }
    backend_health_select = this.addBackendHealth(this.selected_health)

    let pmid_selected = this.pmid == '' ? 'undefined' : this.pmid;
    console.log(this.formatForDB(this.selected_cells))
    this.databaseService.getSamplesTest(this.selected_species, backend_tissue_select, this.formatForDB(this.selected_cells), this.selected_age, backend_health_select, this.selected_pmid.map(x => (x == '32220304' ? '34489413' : x)))
      .subscribe({
        next: (data) => {
          data = data.map(el =>
            el.study_id === 34489413
              ? { ...el, study_id: 32220304 }
              : el
          );

          this.DISPLAY_DATA = data;
          this.display = data;
          this, this.cleanDisplay();
          console.log(this.display)
          if (this.selected_cells.length != this.cell_types.length || this.selected_species.length != this.species.length) {
            this.display = this.display.filter(item => item.cell_types != '')
          }
          // this.tissue_chart_options = this.makeDonutChart(this.tissue_dict)
          // this.sex_chart_options = this.makeDonutChart(this.sex_dict)
          // this.age_chart_options = this.makeBarChart(this.age_dict)
          // this.age_chart_options = this.makeBarChart(this.age_dict_new);
          // this.health_chart_options = this.makeDonutChart(this.health_dict)
          this.query_completed = true;

          data.forEach(element => {
            // console.log(element.age);
            element.age = element.age == "-1" ? "Others" : Number.parseInt(String(element.age)) <= 58 ? "Neonatal" : "Postnatal";
          });
        },
        error: (e) => console.error(e)
      });
  }

  criteriaChanged() {
    let display_template: any[] = [];
    this.DISPLAY_DATA.forEach(val => display_template.push(Object.assign({}, val)));
    if (!this.neonatal_selected) {
      display_template = this.removeItemAll(display_template, "Neonatal");
    }
    if (!this.postnatal_selected) {
      display_template = this.removeItemAll(display_template, "Postnatal");
    }
    if (!this.others_selected) {
      display_template = this.removeItemAll(display_template, "Others");
    }

    if (!this.expMatrix_selected) {
      display_template = this.removeFileTypesAll(display_template, "matrix");
    }
    this.display = display_template;
  }

  removeItemAll(arr: any[], value: any) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i].age === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
  }

  removeFileTypesAll(arr: any[], value: any) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i].species === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
  }
  onSpeciesChanged($event: any) {
    console.log(this.selected_pmid)
    if (this.selected_species.length > 0 && this.selected_cells.length > 0 && this.selected_pmid.length > 0) {
      this.samplesTest();
    }
  }
  onAgeSelectionChanged($event: any) {
    this.selected_age_type = [];
    if ((<HTMLInputElement>document.getElementById("btncheck1")).checked) {
      this.selected_age_type.push('neonetal');
    }
    if ((<HTMLInputElement>document.getElementById("btncheck2")).checked) {
      this.selected_age_type.push('postnetal');
    }
  }
  addBackendTissue(tissue_list: any[]) {
    let backend_tissue_select = [...tissue_list]
    if (backend_tissue_select.includes('Intestine')) {
      backend_tissue_select.push('SmallInt')
      backend_tissue_select.push('Large')
    }
    if (backend_tissue_select.includes('Rectum')) {
      backend_tissue_select.push('REC')
    }

    if (backend_tissue_select.includes('Appendix')) {
      backend_tissue_select.push('APD')
    }

    if (backend_tissue_select.includes('Dermis')) {
      backend_tissue_select.push('skin')
    }

    if (backend_tissue_select.includes('Blood')) {
      backend_tissue_select.push('PBMC')
    }

    if (backend_tissue_select.includes('Bone Marrow')) {
      backend_tissue_select.push('marrow')
    }

    if (backend_tissue_select.includes('Common Bile Duct')) {
      backend_tissue_select.push('Common bule duct')
    }
    return (backend_tissue_select)
  }


  addBackendHealth(health_list: any[]) {
    let backend_health_select = [...health_list]
    if (backend_health_select.includes('Healthy')) {
      backend_health_select.push('normal')
    }
    if (backend_health_select.includes('Cancer')) {
      backend_health_select.push('carcinoma')
    }

    return (backend_health_select)
  }

  onSelectionChanged(event: any) {
    this.selectedRowKeys = event.selectedRowKeys;
    this.selectedRowData = event.selectedRowsData;
    let selected_ids = this.selectedRowData.map(row => row.sample_id);
    if (selected_ids.length == 0) {
      this.downloadSize = "0 B"
    } else {
      console.log(selected_ids)
      this.databaseService.getTarSize(selected_ids).subscribe({
        next: (data) => {
          if (data.sum >= 1024 ** 3) {
            this.downloadSize = (data.sum / (1024 ** 3)).toFixed(2) + ' GB';
          } else if (data.sum >= 1024 ** 2) {
            this.downloadSize = (data.sum / (1024 ** 2)).toFixed(2) + ' MB';
          } else if (data.sum >= 1024) {
            this.downloadSize = (data.sum / (1024)).toFixed(2) + ' KB';
          } else {
            this.downloadSize = (data.sum / 1).toFixed(0) + ' Bytes';
          }
          console.log(data.sum)
          console.log(this.downloadSize)
        },
        error: (e) => {
          console.error(e);
        }
      });
    }
  }

  onSelectionChanged_New() {
    const rows = this.gridApi.getSelectedRows();
    let selected_ids = this.selectedRowKeys = rows.map(r => r.sample_id);
    if (selected_ids.length == 0) {
      this.downloadSize = "0 Bytes"
    } else {
      console.log(selected_ids)
      this.databaseService.getTarSize(selected_ids).subscribe({
        next: (data) => {
          if (data.sum >= 1024 ** 3) {
            this.downloadSize = (data.sum / (1024 ** 3)).toFixed(2) + ' GB';
          } else if (data.sum >= 1024 ** 2) {
            this.downloadSize = (data.sum / (1024 ** 2)).toFixed(2) + ' MB';
          } else if (data.sum >= 1024) {
            this.downloadSize = (data.sum / (1024)).toFixed(2) + ' KB';
          } else {
            this.downloadSize = (data.sum / 1).toFixed(0) + ' Bytes';
          }
          console.log(data.sum)
          console.log(this.downloadSize)
        },
        error: (e) => {
          console.error(e);
        }
      });
    }
  }

  containsAnyValue(string: string, values: string[]): boolean {
    return values.some(value => string.includes(value));
  }

  downloadWrapper() {
    document.getElementById("downloadButton")?.setAttribute("disabled", "true");
    // alert('Download Started');
    this.selected_download_method = 'Download Standardized Data';
    let selected_ids = this.gridApi.getSelectedRows().map(row => row.study_id.toString().replace("32220304", "34489413") + '/' + row.platform)
    if (this.selected_download_method == 'Download Standardized Data' && selected_ids.length > 0) {
      this.downloadStandaradizedData(selected_ids)
    }
    document.getElementById("downloadButton")?.removeAttribute("disabled");
  }

  downloadStandaradizedData(file_names: string[]) {
    this.databaseService.staticDownload(file_names)
  }


  /* NEW STUFF, QUESTIONABLE */

  onItemSelected($event: any) {
    this.displayed_map = $event.itemData.text;
  }

  formatRow($event: any) {
    if ($event.rowType == 'header') {
      $event.rowElement.style.backgroundColor = "#EAE7DC";
      $event.rowElement.style.color = "black";
      $event.rowElement.style.fontWeight = 700;


    }
    else if ($event.key % 2 == 0) {
      $event.rowElement.style.backgroundColor = "#EAE7DC";
    }
    else {
      $event.rowElement.style.backgroundColor = "#E0DCCC";
    }
  }

  getDownloadedMetaData(formatted_sample_ids: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.databaseService.getDownloadedMetaData(formatted_sample_ids)
        .subscribe({
          next: (data) => {
            const csv = this.convertToCSV(data);
            resolve(csv);
          },
          error: (e) => {
            console.error(e);
            reject(e);
          }
        });
    });
  }

  convertToCSV(data: any[]) {
    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data.map(obj => {
      return Object.values(obj).map(value => {
        // If the value contains a comma or double quote, enclose it in double quotes and escape any existing double quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      }).join(',');
    });
    return header + rows.join('\n');
  }

  formatForDB(selection: string[]) {
    let mod_selection = selection.map(value => value.toLowerCase().replace(/\s+/g, '_'));
    return (mod_selection)
  }

  getAge(age: any) {
    let ret_age = -10
    if (age.toLowerCase().includes('w') || age.toLowerCase().includes('f')) {
      ret_age = 0
    }
    else if (age.includes('-')) {
      let ages = age.split('-')
      ret_age = (Number(ages[0]) + Number(ages[1])) / 2
    }
    else if (age.includes('+')) {
      ret_age = Number(age.replace("+", ""))
    }
    else {
      ret_age = Number(age)
    }
    return (ret_age)
  }

  getRandom(min: number, max: number) {
    return Math.floor((max - min) * Math.random() + min)
  }

  commandChanged($event: any) {
    const inputVal: string = $event.target.value.toString();

    if (inputVal.includes("--")) {
      // 清空 quick filter
      this.gridApi.setGridOption('quickFilterText', '');

      // 解析参数
      const params = inputVal.split(/\n| |\t|,/).filter(x => x !== "");

      // 用来存放 field -> filter value 的映射
      const filterModel: { [key: string]: any } = {};

      params.forEach((element: string) => {
        if (element.startsWith("--")) {
          const config = element.replace("--", "").split("=");
          const field = config[0];
          const value = config[1] || "";
          const lowerKeys = Object.keys(this.column_dicts).map(k => k.toLowerCase());
          if (lowerKeys.includes(field.toLowerCase())) {
            // 填充 filter model
            console.log(field.toLowerCase() as keyof typeof this.column_dicts);
            console.log(lowerKeys)
            filterModel[this.column_dicts[field.toLowerCase() as keyof typeof this.column_dicts]] = {
              filterType: 'text',
              type: 'contains',
              filter: value.replace("-", " "),
            };
          }
          console.log(config)
          console.log(filterModel)
        }
      });

      // 设置 grid filter model
      this.gridApi.setFilterModel(filterModel);

      // 通知 grid 重新过滤
      this.gridApi.onFilterChanged();

    } else {
      // 如果是普通 quick filter
      this.gridApi.setGridOption('quickFilterText', inputVal);

      // 清空已有 filter model
      this.gridApi.setFilterModel(null);
    }
  }

}