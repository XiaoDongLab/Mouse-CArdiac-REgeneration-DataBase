import { AfterViewInit, Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
//import * as igv from 'igv'
// import igv from 'node_modules/igv/dist/igv.esm.js'
import igv from '../../../js/igv.esm.js'
import { Positions } from 'src/app/models/positions.model';
import { DatabaseService } from 'src/app/services/database.service';
import { ChartComponent, ApexAxisChartSeries, ApexChart, ApexPlotOptions, ApexXAxis, ApexTitleSubtitle } from "ng-apexcharts";
import { ChangeDetectorRef } from '@angular/core';
import { DiffExp } from 'src/app/models/diffExp.model';
import { Indices } from 'src/app/models/indices.model';
import { DatabaseConstsService } from 'src/app/services/database-consts.service';
import { LociService } from 'src/app/services/loci.service';
import { GeneCardComponent } from '../gene-card/gene-card.component';
import { clear, group } from 'console';
import { DxTagBoxModule } from 'devextreme-angular/ui/tag-box';
import GeneList from '../../../assets/geneDict.json'
import { setInterval, clearInterval } from 'timers';
import { GeneConversionService } from 'src/app/services/name-converter.service';
import { Router } from '@angular/router';
declare const bootstrap: any;

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  plotOptions: ApexPlotOptions;
  title: ApexTitleSubtitle
};

export class Gene {
  name: string;
  stableId?: string;
  reference: string;
}

@Component({
  selector: 'app-igv',
  templateUrl: './igv.component.html',
  styleUrls: ['./igv.component.css'],
  standalone: false,
})
export class IgvComponent implements AfterViewInit, OnDestroy {
  @ViewChild('igvdiv') igvDiv!: ElementRef;
  @ViewChild('temp') temp!: ElementRef;
  @ViewChild("chart") chart: ChartComponent;

  //to_child = new DiffExp('TEST GENE', ['1','2','3'],['2','3','4'],['0','1','2'],['1,1,1'],['1,1,1'])
  //IGV Variables
  browser: any;
  display_tab: string = 'Explore';
  genes_interested: string[];
  deg_sorted_list: Map<String, number>;
  load_progress: number;
  gene_interested: Gene[] = [];
  prevGene: string = "";
  nextGene: string = "";
  genesEntered: string = '';
  genes_index: number = 0;
  trackUrl = 'https://www.encodeproject.org/files/ENCFF092EKO/@@download/ENCFF092EKO.bigWig';
  options = {
    genome: "mm10",
    locus: 'chr8:14000000-15000000',
    tracks: [
      {
        name: 'Histone CHIP-seq (H3K27ac) : Heart Tissue Postnatal (0 days)',
        type: 'wig',
        format: 'bigWig',
        // url: this.trackUrl,
        url: 'https://www.encodeproject.org/files/ENCFF657GDL/@@download/ENCFF657GDL.bigWig',
        color: '#0078d7',
        autoscaleGroup: 'hist'
      }, // Add methylation marks
      {
        name: 'WGBS : Heart Tissue Postnatal (0 days)',
        type: 'wig',
        format: 'bigWig',
        // url: this.trackUrl,
        url: 'https://www.encodeproject.org/files/ENCFF980ZXR/@@download/ENCFF980ZXR.bigWig',
        color: '#6650e9',
        autoscaleGroup: 'meth'
      }
    ],
  };

  //Chart Variables
  public chartOptions: Partial<ChartOptions>;
  public chartOptions2: Partial<ChartOptions>;
  tissue_types: string[] = [];
  cell_types: string[] = [];

  selected_tissues: string[] = [];
  selected_cells: string[] = [];

  //Other Variables
  display?: Positions[];
  original_genes: DiffExp[];
  genes: DiffExp[] = [];
  initial_genes: any[] = [];
  grouped_genes: DiffExp[][] = [];
  original_grouped_genes: DiffExp[][] = [];
  selected_indices: Indices[];
  original_indices: Indices[];
  completely_loaded: boolean = false;
  pmid_tissue_dist: { [key: string]: number[] } = {}
  gene_names: string[] = [];
  found = false;
  loading: boolean = false;
  fakeInterval: any | undefined;


  constructor(private databaseService: DatabaseService, public databaseConstService: DatabaseConstsService, public lociService: LociService, private nameConverterService: GeneConversionService, public router: Router) {
    this.cell_types = databaseConstService.getDECellTypes();
    this.selected_cells = this.cell_types;
    this.load_progress = 0;
    this.pmid_tissue_dist = databaseConstService.getDePmidTissueDict();
    this.tissue_types = Object.keys(this.pmid_tissue_dist)
    this.genes_interested = ['ENSMUSG00000001517', 'ENSMUSG00000070348', 'ENSMUSG00000000184', 'ENSMUSG00000002068', 'ENSMUSG00000028212', 'ENSMUSG00000037169', 'ENSMUSG00000062991', 'ENSMUSG00000060275', 'ENSMUSG00000041014', 'ENSMUSG00000032311', 'ENSMUSG00000062312', 'ENSMUSG00000018166', 'ENSMUSG00000062209', 'ENSMUSG00000021765', 'ENSMUSG00000053110', 'ENSMUSG00000050966', 'ENSMUSG00000040021', 'ENSMUSG00000021959', 'ENSMUSG00000092341', 'ENSMUSG00000020160', 'ENSMUSG00000027210', 'ENSMUSG00000006932', 'ENSMUSG00000030867', 'ENSMUSG00000027699', 'ENSMUSG00000049604'];
    this.genes_interested.forEach(item => {
      this.nameConverterService.convertEnsembleToGene(item).then(result => {
        let gene = { name: result, stableId: item, reference: ' ' };
        this.gene_interested.push(gene);
      })
    })
    this.selected_tissues = this.tissue_types;
    this.deg_sorted_list = new Map<String, number>();
    this.databaseService.getIndices().subscribe({
      next: (data) => {
        this.selected_indices = data;
        this.original_indices = data;
      },
      error: (e) => console.error(e)
    });
    this.chartOptions = {
      series: [
        {
          data: [
            {
              x: "Study 1",
              y: [
                1, 3
              ]
            },
            {
              x: "Study 2",
              y: [
                2, 4
              ]
            },
            {
              x: "Study 3",
              y: [
                3, 5
              ]
            },
            {
              x: "Study 4",
              y: [
                4, 6
              ]
            }
          ]
        }
      ],
      chart: {
        height: 350,
        type: "rangeBar"
      },
      plotOptions: {
        bar: {
          horizontal: true
        }
      },
      xaxis: {
        type: "numeric"
      },
      title: {
        text: "Proof of Concept",
        align: "center"
      }
    };
  }

  ngAfterViewInit() {
    let loci = this.lociService.getLocus()

    if (loci != null) {
      this.options = {
        genome: "mm10",
        locus: loci,
        tracks: [
          {
            name: 'Histone CHIP-seq (H3K27ac) : Heart Tissue Postnatal (0 days)',
            type: 'wig',
            format: 'bigWig',
            // url: this.trackUrl,
            url: 'https://www.encodeproject.org/files/ENCFF657GDL/@@download/ENCFF657GDL.bigWig',
            color: '#0078d7',
            autoscaleGroup: 'hist'
          }, // Add methylation marks
          {
            name: 'WGBS : Heart Tissue Postnatal (0 days)',
            type: 'wig',
            format: 'bigWig',
            // url: this.trackUrl,
            url: 'https://www.encodeproject.org/files/ENCFF980ZXR/@@download/ENCFF980ZXR.bigWig',
            color: '#6650e9',
            autoscaleGroup: 'meth'
          }
        ],
      };
    }
    this.createBrowser();
  }

  async createBrowser() {
    try {
      this.browser = await igv.createBrowser(this.igvDiv.nativeElement, this.options)

      //this.addTrackByUrl()
    } catch (e) {
      console.log(e)
    }
  }
  addTrackByUrl() {
    this.browser.loadTrack({
      url: this.trackUrl,
    })
  }
  getInRangeGenes() {
    // This function loads data **without any criteria**. After 'general' data is loaded, detailed data will be scanned at the backend.
    this.loading = true;
    this.completely_loaded = false;
    document.getElementById("btn-apply-detail")?.setAttribute('disabled', 'disabled');
    const loci = this.browser.currentLoci().split(':');
    const chr = loci[0].replace('chr', '')
    const start = Math.floor(loci[1].split('-')[0])
    const end = Math.ceil(loci[1].split('-')[1])
    this.databaseService.getInRangeGenes(start, end, chr)
      .subscribe({
        next: (data) => {
          this.display = data;
          console.log(data);
          this.getDiffExpGeneralData();
          // this.getDiffExpData()
        },
        error: (e) => console.error(e)
      });
  }

  getDiffExpGenesInterest() {
    this.loading = true;
    this.completely_loaded = false;
    const convertedList: number[] = this.genes_interested.map((str) => {
      // Remove 'ENSG' from the beginning of each string
      const strippedString = str.replace('ENSMUSG', '');
      // Convert the remaining string to a number
      return parseInt(strippedString, 10);
    });
    this.databaseService.getGeneDiffExpGeneral(convertedList)
      .subscribe({
        next: (data) => {
          this.genes_index = 0;
          console.log(data);
          this.initial_genes = data;
          this.grouped_genes = data.map(gene => [gene]);
          console.log(this.grouped_genes);
          this.grouped_genes = this.sortGenesByDEG(this.grouped_genes, null);
          this.genes = data;
          this.grouped_genes.forEach((gene, idx) => {
            this.deg_sorted_list.set(gene[0]?.gene?.toString() ?? '', idx);
          })
          this.nameConverterService.convertEnsembleToGene("ENSMUSG" + ("00000000000" + this.grouped_genes[0][0].gene).slice(-11)).then(data => {
            this.browser.search(data);
          });
          this.moveGenes(this.grouped_genes, 'none');
          // console.log(this.initial_genes[0]);
          // this.original_grouped_genes = this.convertDiffExpData(this.original_genes)
          // this.subsetCorrectCellAndTissueTypes()
          // console.log(this.grouped_genes);

          console.log("Get detailed data here");
          this.getDiffExpData(convertedList);
          //this.original_genes = this.assignGeneNames(this.original_genes)
          //this.genes = this.assignGeneNames(this.genes)
          // this.original_genes = this.prettyOrderer(this.original_genes)
          // this.genes = this.prettyOrderer(this.genes)
        },
        error: (e) => {
          console.error(e)
          this.loading = false;
          alert('Too Many or Too Few Genes Selected, Please Adjust Search Region')
        },
        complete: () => {
          this.loading = false
          this.found = true
        }
      });
  }

  getDiffExpGeneralData(gene_names: any[] = this.display!.map((obj) => obj.en_id!), entered: boolean = false) {
    // this.gene_names = this.display!.map((obj) => obj.en_id!)
    const convertedList: number[] = gene_names.map((str) => {
      // Remove 'ENSG' from the beginning of each string
      const strippedString = str.replace('ENSMUSG', '');
      // Convert the remaining string to a number
      return parseInt(strippedString, 10);
    });
    
    this.databaseService.getGeneDiffExpGeneral(convertedList)
      .subscribe({
        next: (data) => {
          this.genes_index = 0;
          console.log(data);
          this.initial_genes = data;
          this.grouped_genes = data.map(gene => [gene]);
          console.log(this.grouped_genes);
          this.grouped_genes = this.sortGenesByDEG(this.grouped_genes, null);
          this.genes = data;
          this.grouped_genes.forEach((gene, idx) => {
            this.deg_sorted_list.set(gene[0]?.gene?.toString() ?? '', idx);
          })
          if (entered) {
            this.nameConverterService.convertEnsembleToGene("ENSMUSG" + ("00000000000" + this.grouped_genes[0][0].gene).slice(-11)).then(data => {
              this.browser.search(data);
            });
            this.moveGenes(this.grouped_genes, 'none');
          }
          console.log(this.deg_sorted_list);
          // console.log(this.initial_genes[0]);
          // this.original_grouped_genes = this.convertDiffExpData(this.original_genes)
          // this.subsetCorrectCellAndTissueTypes()
          // console.log(this.grouped_genes);

          console.log("Get detailed data here");
          this.getDiffExpData(convertedList);
          //this.original_genes = this.assignGeneNames(this.original_genes)
          //this.genes = this.assignGeneNames(this.genes)
          // this.original_genes = this.prettyOrderer(this.original_genes)
          // this.genes = this.prettyOrderer(this.genes)
        },
        error: (e) => {
          console.error(e)
          this.loading = false;
          alert('Too Many or Too Few Genes Selected, Please Adjust Search Region')
        },
        complete: () => {
          this.loading = false
          this.found = true
        }
      });
  }

  fakeProgress(list_length: number) {
    this.fakeInterval = window.setInterval(() => {
      this.load_progress += Math.random() * 3 + 1;
      if (this.load_progress >= 95) {
        window.clearInterval(this.fakeInterval)
        this.fakeInterval = undefined;
      }
    }, Math.random() * 10 + list_length * 15 + 150);
  }

  getDiffExpData(convertedList: number[]) {
    /* this.gene_names = this.display!.map((obj) => obj.en_id!)
    const convertedList: number[] = this.gene_names.map((str) => {
      // Remove 'ENSG' from the beginning of each string
      const strippedString = str.replace('ENSMUSG', '');
      // Convert the remaining string to a number
      return parseInt(strippedString, 10);
    });*/
    window.clearInterval(this.fakeInterval)
    this.load_progress = 0;
    this.fakeProgress(convertedList.length);

    setTimeout(() => {

      const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
      const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    }, 100);
    this.databaseService.getGeneDiffExp(convertedList)
      .subscribe({
        next: (data) => {
          window.clearInterval(this.fakeInterval)
          this.fakeInterval = undefined;
          this.load_progress = 100;
          this.original_genes = data;
          this.genes = data;
          this.original_grouped_genes = this.convertDiffExpData(this.original_genes)
          document.getElementById("btn-apply-detail")?.removeAttribute("disabled");
          // this.subsetCorrectCellAndTissueTypes()
          // console.log(this.grouped_genes)
          //this.original_genes = this.assignGeneNames(this.original_genes)
          //this.genes = this.assignGeneNames(this.genes)
          // this.original_genes = this.prettyOrderer(this.original_genes)
          // this.genes = this.prettyOrderer(this.genes)
        },
        error: (e) => {
          console.error(e)
          this.loading = false;
          alert('Too Many or Too Few Genes Selected, Please Adjust Search Region')
        },
        complete: () => {
          this.loading = false
          this.found = true
        }
      });
  }
  ngOnDestroy() {
    igv.removeAllBrowsers()
  }

  ngOnInit(): void {
    this.selected_cells = this.cell_types;
  }

  convertDiffExpData(gene_list: any[]) {
    for (let i = 0; i < gene_list.length; i++) {
      let original_name = gene_list[i].gene
      let temp_string = "00000000000" + original_name.toString()
      let gene_name = "ENSMUSG" + temp_string.slice(-11)
      gene_list[i].gene = gene_name
    }
    let groupedLists: { [gene: string]: DiffExp[] } = gene_list.reduce((acc, obj) => {
      if (!acc[obj.gene]) {
        acc[obj.gene] = [];
      }
      acc[obj.gene].push(obj);
      return acc;
    }, {} as { [gene: string]: DiffExp[] });
    // Convert the object to an array of arrays
    return (Object.values(groupedLists));
  }

  async subsetCorrectCellAndTissueTypes() {
    this.loading = true;
    this.grouped_genes = JSON.parse(JSON.stringify(this.original_grouped_genes));
    console.log(this.grouped_genes);
    this.selected_cells = this.selected_cells.length == 0 ? this.databaseConstService.getDECellTypes() : this.selected_cells;
    let selected_pmids: number[] = [];
    for (const key in this.pmid_tissue_dist) {
      if (this.selected_tissues.includes(key)) {
        selected_pmids.push(...this.pmid_tissue_dist[key]);
      }
    }
    for (let i = this.grouped_genes.length - 1; i >= 0; i--) {
      let geneset = this.grouped_genes[i];
      for (let j = geneset.length - 1; j >= 0; j--) {
        let gene = geneset[j];
        let cleaned_celltype = gene.cell_type?.replace(/\s+\d+$/, '');
        if (gene.cell_type?.includes('All')) {
          continue;
        }
        if (!this.selected_cells.includes(cleaned_celltype!) || !selected_pmids.includes(gene.pmid!)) {
          console.log('Splicing');
          console.log(gene);
          this.grouped_genes[i].splice(j, 1);
        }
      }
    }
    this.grouped_genes = this.sortGenesByDEG(this.grouped_genes, this.deg_sorted_list);
    console.log(this.grouped_genes[0].length);
    this.loading = false;
    this.completely_loaded = true;
  }



  //  assignGeneNames(gene_list:DiffExp[]){
  //   let id_name_map = new Map<string|undefined,string|undefined>();
  //   this.display?.map(item => id_name_map.set(item.en_id,item.gene_name));
  //   for(let i = 0; i<gene_list.length; i++){
  //     let id: string|undefined = gene_list[i].gene
  //     let name = id_name_map.get(id)
  //     if(name != ''){
  //       gene_list[i].gene = name
  //     }
  //   }
  //   return(gene_list)
  //  }

  onTissuesChanged($event: any) {
    this.selected_tissues = $event.value
  }

  onCellChanged($event: any) {
    this.selected_cells = $event.value
  }

  // applyFilter(){
  //   let new_indices = []
  //   for(let i = 0; i< this.original_indices.length; i++){
  //     if(this.selected_tissues.includes(this.original_indices[i].tissue_type!) && this.selected_cells.includes(this.original_indices[i].cell_type!)){
  //       new_indices.push(i)
  //     }
  //   }
  //   let filtered_genes = [];
  //   console.log(this.original_genes)
  //   for(let i = 0; i<this.original_genes.length; i++){
  //     let gene = this.original_genes[i]
  //     let temp = new DiffExp(
  //       gene.gene!,
  //       this.reorder(gene.fixed_effect, new_indices),
  //       this.reorder(gene.conf_high, new_indices),
  //       this.reorder(gene.conf_low, new_indices),
  //       this.reorder(gene.y_int, new_indices),
  //       this.reorder(gene.p_val, new_indices)
  //     )
  //     filtered_genes.push(temp)
  //   }
  //   console.log(filtered_genes)
  //   this.genes = filtered_genes
  //   this.selected_indices = this.reorder(this.original_indices, new_indices)
  // }

  reorder(list: any, ids: any) {
    let new_list = []
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i]
      new_list.push(list[id])
    }
    return (new_list)
  }

  sortGenesByNumber(list: any): any {
    return [...list].sort((a, b) => {
      // 保险：内层可能为空时给 ''
      const geneA = (a[0]?.gene ?? '').toLocaleString();
      const geneB = (b[0]?.gene ?? '').toLocaleString();

      // 忽略大小写 + 按英文字母顺序
      return geneA.localeCompare(geneB, 'en', { sensitivity: 'base' });
    });
  }

  sortGenesByDEG(list: any, map: Map<String, number> | null): any {
    if (map == null) {
      return [...list].sort((a, b) =>
        (b[0]?.sig_total ?? 0) - (a[0]?.sig_total ?? 0)
      );
    } else {
      return [...list].sort((a, b) => {
        const rankA = map.get(a[0]?.gene.replace('ENSMUSG', '').replace(/^0+/, '')) ?? Number.POSITIVE_INFINITY;
        const rankB = map.get(b[0]?.gene.replace('ENSMUSG', '').replace(/^0+/, '')) ?? Number.POSITIVE_INFINITY;
        return rankA - rankB;          // 按汇总表既定顺序排
      })
    }
  }

  getEN_ID(gene: string | number | undefined) {
    for (let i = 0; i < this.display!.length; i++) {
      let position = this.display![i]
      if (position.en_id == gene || position.gene_name == gene) {
        return (position.en_id)
      }
    }
    return ('ERROR NO GENE OF THIS NAME FOUND')
  }

  onItemSelected_Nav(text: any) {
    this.display_tab = text;
  }

  async getDiffExpGenesEntered() {
    let gene_list = this.genesEntered.split(",").map(item => item.trim());
    let false_genes: string[] = [];
    let check_passed = true;
    for (let i = 0; i < gene_list.length; i++) {
      if (!gene_list[i].startsWith("ENSMUSG") && gene_list[i] != '' && isNaN(Number(gene_list[i]))) {
        try {
          const result = await this.nameConverterService.convertGeneToEnsemble(gene_list[i]);
          gene_list[i] = result;
          console.log(result);
        } catch (e) {
          check_passed = false;
          false_genes.push(gene_list[i])
        }
      } else {
        if (await this.nameConverterService.isEnsembleNotIncluded(gene_list[i])) {
          check_passed = false;
          false_genes.push("ENSMUSG" + ("00000000000" + gene_list[i].replace("ENSMUSG", "")).slice(-11))
        }
      }
    }
    console.log(gene_list);
    console.log(false_genes)
    if (check_passed) {
      this.loading = true;
      this.completely_loaded = false;
      this.getDiffExpGeneralData(gene_list, true);
    } else alert(`Entered gene(s): ${false_genes.join(", ")} not found!`)
  }

  // prettyOrderer(diff_list: DiffExp[]){
  //   let named_list = []
  //   let ensg_list = []
  //   for(let i = 0; i<diff_list.length; i++){
  //     let item = diff_list[i]
  //     if(item.gene!.startsWith('ENSG')){
  //       ensg_list.push(item)
  //     }
  //     else{
  //       named_list.push(item)
  //     }
  //   }
  //   named_list.sort((a, b) => (a.gene! > b.gene!) ? 1 : -1)
  //   ensg_list.sort((a, b) => (a.gene! > b.gene!) ? 1 : -1)
  //   return(named_list.concat(ensg_list))
  // }

  moveGenes(gene_group: DiffExp[][], direction: 'left' | 'right' | 'none') {
    if (direction == 'right') {
      this.nameConverterService.convertEnsembleToGene(
        "ENSMUSG" + ("00000000000" + gene_group[this.getIndex(++this.genes_index, gene_group.length)][0].gene).slice(-11)
      ).then(data => {
        this.browser.search(data);
      });
    } else if (direction == 'left') {
      this.nameConverterService.convertEnsembleToGene(
        "ENSMUSG" + ("00000000000" + gene_group[this.getIndex(--this.genes_index, gene_group.length)][0].gene).slice(-11)
      ).then(data => {
        this.browser.search(data);
      })
    }
    this.nameConverterService.convertEnsembleToGene(
      "ENSMUSG" + ("00000000000" + gene_group[this.getIndex(this.genes_index + 1, gene_group.length)][0].gene).slice(-11)
    ).then(data => {
      this.nextGene = data;
    });
    this.nameConverterService.convertEnsembleToGene(
      "ENSMUSG" + ("00000000000" + gene_group[this.getIndex(this.genes_index - 1, gene_group.length)][0].gene).slice(-11)
    ).then(data => {
      this.prevGene = data;
    });
  }

  getIndex(x: number, length: number): number {
    return x - length * Math.floor(x / length);
  }

}
