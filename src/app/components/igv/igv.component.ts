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

export interface GenomeTrackOption {
  id: string;
  group: 'accessibility' | 'matched-histone' | 'developmental-reference';
  label: string;
  defaultVisible: boolean;
  populationId?: string;
  conditionId?: string;
  config: any;
}

interface GenomeTrackPreset {
  id: string;
  label: string;
  trackIds: readonly string[];
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
  genes_interested: string[] = ['ENSMUSG00000001517', 'ENSMUSG00000070348', 'ENSMUSG00000000184', 'ENSMUSG00000002068', 'ENSMUSG00000028212', 'ENSMUSG00000037169', 'ENSMUSG00000062991', 'ENSMUSG00000060275', 'ENSMUSG00000041014', 'ENSMUSG00000032311', 'ENSMUSG00000062312', 'ENSMUSG00000018166', 'ENSMUSG00000062209', 'ENSMUSG00000021765', 'ENSMUSG00000053110', 'ENSMUSG00000050966', 'ENSMUSG00000040021', 'ENSMUSG00000021959', 'ENSMUSG00000092341', 'ENSMUSG00000020160', 'ENSMUSG00000027210', 'ENSMUSG00000006932', 'ENSMUSG00000030867', 'ENSMUSG00000027699', 'ENSMUSG00000049604'];
  deg_sorted_list: Map<String, number>;
  load_progress: number;
  gene_interested: Gene[];
  prevGene: string = "";
  nextGene: string = "";
  genesEntered: string = '';
  genes_index: number = 0;
  show: boolean = false;
  trackUrl = 'https://www.encodeproject.org/files/ENCFF092EKO/@@download/ENCFF092EKO.bigWig';
  // mm10 defined inline instead of via genome id. IGV resolves a string genome
  // id ("mm10") against a remote registry (igv.org/genomes/genomes.json), which
  // is no longer CORS-accessible from the browser, causing "Unknown genome id:
  // mm10". An inline reference object bypasses that registry entirely. The data
  // URLs below are CORS-enabled (igv.org for sequence, UCSC for cytobands).
  static readonly MM10_REFERENCE = {
    id: 'mm10',
    name: 'Mouse (GRCm38/mm10)',
    fastaURL: 'https://igv.org/genomes/data/mm10/mm10.fa',
    indexURL: 'https://igv.org/genomes/data/mm10/mm10.fa.fai',
    cytobandURL: 'https://hgdownload.soe.ucsc.edu/goldenPath/mm10/database/cytoBand.txt.gz',
    // Genome-level annotation track (gene bodies). When mm10 was resolved via the
    // remote registry, IGV supplied this RefSeq track automatically; the inline
    // reference must declare it explicitly, otherwise no gene track is shown.
    tracks: [
      {
        name: 'RefSeq Curated',
        format: 'refgene',
        url: 'https://api.mcaredb.org:3305/downloads/ncbiRefSeqCurated.txt.gz',
        indexed: false,
        color: 'rgb(12,12,120)',
        order: 1000000,
        removable: false,
      },
    ],
  };
  static readonly TRACK_GROUPS = [
    { id: 'accessibility', label: 'scATAC accessibility — PSD3 pseudobulk' },
    { id: 'matched-histone', label: 'H3K27ac — PSD3' },
    { id: 'developmental-reference', label: 'P0 developmental references' },
  ] as const;

  static readonly SCATAC_POPULATIONS = [
    { id: 'all', label: 'All cells', trackLabel: 'All cells', slug: '' },
    { id: 'cm', label: 'Cardiomyocyte (CM)', trackLabel: 'CM', slug: 'cm' },
    { id: 'art-ec', label: 'Arterial endothelial (Art.EC)', trackLabel: 'Art.EC', slug: 'art_ec' },
    { id: 'vec', label: 'Vascular endothelial (VEC)', trackLabel: 'VEC', slug: 'vec' },
    { id: 'endo', label: 'Endocardial (Endo)', trackLabel: 'Endo', slug: 'endo' },
    { id: 'fb', label: 'Fibroblast (FB)', trackLabel: 'FB', slug: 'fb' },
    { id: 'smc-pericyte', label: 'SMC / pericyte', trackLabel: 'SMC/Pericyte', slug: 'smc_pericyte' },
    { id: 'epi', label: 'Epicardial (Epi)', trackLabel: 'Epi', slug: 'epi' },
    { id: 'macrophage', label: 'Macrophage', trackLabel: 'Macrophage', slug: 'macrophage' },
    { id: 'lymphocyte', label: 'Lymphocyte', trackLabel: 'Lymphocyte', slug: 'lymphocyte' },
  ] as const;

  static readonly SCATAC_CONDITIONS = [
    { id: 'p1-mi', age: 'P1', treatment: 'MI', color: '#a92e50', fileSlug: 'p1_mi', order: 10 },
    { id: 'p1-sham', age: 'P1', treatment: 'Sham', color: '#dc8ca3', fileSlug: 'p1_sham', order: 20 },
    { id: 'p8-mi', age: 'P8', treatment: 'MI', color: '#28598f', fileSlug: 'p8_mi', order: 30 },
    { id: 'p8-sham', age: 'P8', treatment: 'Sham', color: '#86acd6', fileSlug: 'p8_sham', order: 40 },
  ] as const;

  static readonly SCATAC_TRACKS: readonly GenomeTrackOption[] = IgvComponent.SCATAC_POPULATIONS.flatMap(population =>
    IgvComponent.SCATAC_CONDITIONS.map(condition => {
      const allCells = population.id === 'all';
      const filePrefix = allCells ? 'wang2020' : `wang2020_${population.slug}`;
      return {
        id: `scatac-${population.id}-${condition.id}`,
        group: 'accessibility' as const,
        populationId: population.id,
        conditionId: condition.id,
        label: `${condition.age} · ${condition.treatment}`,
        defaultVisible: population.id === 'cm',
        config: {
          name: allCells
            ? `scATAC · ${condition.age} · ${condition.treatment} · PSD3`
            : `scATAC · ${population.trackLabel} · ${condition.age} · ${condition.treatment} · PSD3`,
          type: 'wig',
          format: 'bigWig',
          url: `assets/tracks/scatac/${filePrefix}_${condition.fileSlug}_psd3.bw`,
          color: condition.color,
          autoscaleGroup: `wang-scatac-${population.id}-psd3`,
          height: 55,
          order: condition.order,
          removable: false,
        },
      };
    })
  );

  static readonly TRACK_CATALOG: readonly GenomeTrackOption[] = [
    ...IgvComponent.SCATAC_TRACKS,
    ...[
      { id: 'h3k27ac-p1-mi-r1', gsm: 'GSM3514873', age: 'P1', treatment: 'MI', replicate: 1, color: '#a92e50', order: 100 },
      { id: 'h3k27ac-p1-mi-r2', gsm: 'GSM3514874', age: 'P1', treatment: 'MI', replicate: 2, color: '#a92e50', order: 101 },
      { id: 'h3k27ac-p1-sham-r1', gsm: 'GSM3514879', age: 'P1', treatment: 'Sham', replicate: 1, color: '#dc8ca3', order: 102 },
      { id: 'h3k27ac-p1-sham-r2', gsm: 'GSM3514880', age: 'P1', treatment: 'Sham', replicate: 2, color: '#dc8ca3', order: 103 },
      { id: 'h3k27ac-p8-mi-r1', gsm: 'GSM3514909', age: 'P8', treatment: 'MI', replicate: 1, color: '#28598f', order: 104 },
      { id: 'h3k27ac-p8-mi-r2', gsm: 'GSM3514910', age: 'P8', treatment: 'MI', replicate: 2, color: '#28598f', order: 105 },
      { id: 'h3k27ac-p8-sham-r1', gsm: 'GSM3514915', age: 'P8', treatment: 'Sham', replicate: 1, color: '#86acd6', order: 106 },
      { id: 'h3k27ac-p8-sham-r2', gsm: 'GSM3514916', age: 'P8', treatment: 'Sham', replicate: 2, color: '#86acd6', order: 107 },
    ].map(track => ({
      id: track.id,
      group: 'matched-histone' as const,
      label: `${track.age} · ${track.treatment} · Rep ${track.replicate}`,
      defaultVisible: false,
      config: {
        name: `H3K27ac · ${track.age} · ${track.treatment} · PSD3 · R${track.replicate}`,
        type: 'wig',
        format: 'bigWig',
        url: `https://ftp.ncbi.nlm.nih.gov/geo/samples/GSM3514nnn/${track.gsm}/suppl/${track.gsm}_${track.age}_3${track.treatment}_rep${track.replicate}_H3K27ac.fc.signal.bw`,
        color: track.color,
        autoscaleGroup: 'wang-h3k27ac-psd3',
        height: 55,
        order: track.order,
        removable: false,
      },
    })),
    {
      id: 'reference-p0-h3k27ac',
      group: 'developmental-reference',
      label: 'H3K27ac · uninjured heart',
      defaultVisible: false,
      config: {
        name: 'H3K27ac · P0 · uninjured reference',
        type: 'wig',
        format: 'bigWig',
        url: 'https://api.mcaredb.org:3305/downloads/ENCFF657GDL.bigWig',
        color: '#087f8c',
        autoscaleGroup: 'encode-p0-h3k27ac',
        height: 55,
        order: 200,
        removable: false,
      },
    },
    ...[
      {
        id: 'reference-p0-wgbs-r1-plus', replicate: 1, strand: '+', accession: 'ENCFF870MPN',
        url: 'https://encode-public.s3.amazonaws.com/2022/01/10/191dbc77-c232-47a3-82ca-b88dab350e3d/ENCFF870MPN.bigWig',
        color: '#5946b2', order: 210,
      },
      {
        id: 'reference-p0-wgbs-r1-minus', replicate: 1, strand: '−', accession: 'ENCFF280ZWP',
        url: 'https://encode-public.s3.amazonaws.com/2022/01/10/909c118a-1eed-488d-b5dc-b5073de268b1/ENCFF280ZWP.bigWig',
        color: '#8676d1', order: 211,
      },
      {
        id: 'reference-p0-wgbs-r2-plus', replicate: 2, strand: '+', accession: 'ENCFF382VDQ',
        url: 'https://encode-public.s3.amazonaws.com/2022/01/10/ab01eb17-7964-47ec-a2d2-b943ed3e8771/ENCFF382VDQ.bigWig',
        color: '#5946b2', order: 212,
      },
      {
        id: 'reference-p0-wgbs-r2-minus', replicate: 2, strand: '−', accession: 'ENCFF880AXC',
        url: 'https://encode-public.s3.amazonaws.com/2022/01/10/5dc525da-e1b9-461e-9721-33f98c094582/ENCFF880AXC.bigWig',
        color: '#8676d1', order: 213,
      },
    ].map(track => ({
      id: track.id,
      group: 'developmental-reference' as const,
      label: `WGBS · Rep ${track.replicate} · ${track.strand} strand`,
      defaultVisible: false,
      config: {
        name: `WGBS (%) · P0 · R${track.replicate} · ${track.strand} strand`,
        type: 'wig',
        format: 'bigWig',
        url: track.url,
        color: track.color,
        autoscale: false,
        min: 0,
        max: 100,
        height: 55,
        order: track.order,
        removable: false,
      },
    })),
  ];

  static readonly RECOMMENDED_TRACK_IDS = IgvComponent.TRACK_CATALOG
    .filter(track => track.defaultVisible)
    .map(track => track.id);

  static readonly DATA_TRACKS = IgvComponent.TRACK_CATALOG
    .filter(track => track.defaultVisible)
    .map(track => ({ ...track.config }));

  readonly trackGroups = IgvComponent.TRACK_GROUPS;
  readonly trackCatalog = IgvComponent.TRACK_CATALOG;
  readonly recommendedTrackIds = IgvComponent.RECOMMENDED_TRACK_IDS;
  readonly scAtacPopulations = IgvComponent.SCATAC_POPULATIONS;
  selectedTrackIds = new Set(IgvComponent.RECOMMENDED_TRACK_IDS);
  selectedScAtacPopulationId = 'cm';
  loadingTrackIds = new Set<string>();
  expandedTrackGroupIds = new Set<GenomeTrackOption['group']>(['accessibility']);
  options: any = {
    reference: IgvComponent.MM10_REFERENCE,
    locus: 'chr7:45,211,501-45,231,177',
    tracks: IgvComponent.DATA_TRACKS.map(track => ({ ...track })),
    showMultiSelectButton: false,
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
  general_grouped_genes: DiffExp[][] = [];
  selected_indices: Indices[];
  original_indices: Indices[];
  completely_loaded: boolean = false;
  pmid_tissue_dist: { [key: string]: number[] } = {}
  gene_names: string[] = [];
  found = false;
  loading: boolean = false;
  fakeInterval: any | undefined;
  automaticApplyFrame: number | undefined;
  automaticApplyTimer: number | undefined;
  readonly eagerPlotGeneLimit = 20;
  detailedDataLoaded = false;
  lazyPlotMode = false;
  expandedGeneKeys = new Set<string>();
  plotReadyGeneKeys = new Set<string>();
  detailedGenesByKey = new Map<string, DiffExp[]>();


  constructor(private databaseService: DatabaseService, public databaseConstService: DatabaseConstsService, public lociService: LociService, private nameConverterService: GeneConversionService, public router: Router, private changeDetector: ChangeDetectorRef) {
    this.cell_types = databaseConstService.getMajorCellTypes();
    this.selected_cells = this.cell_types;
    this.load_progress = 0;
    this.pmid_tissue_dist = databaseConstService.getDePmidTissueDict();
    this.tissue_types = Object.keys(this.pmid_tissue_dist)
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
        ...this.options,
        locus: loci,
      };
    }
    this.createBrowser();
  }

  async createBrowser() {
    try {
      this.browser = await igv.createBrowser(this.igvDiv.nativeElement, this.options)

      // This vendored IGV build still creates its multi-track selection button
      // when showMultiSelectButton is false. Hide it so the MCaReDB track picker
      // is the single, unambiguous place for choosing tracks.
      this.browser.navbar?.multiTrackSelectButton?.setVisibility(false);

      //this.addTrackByUrl()
    } catch (e) {
      console.log(e)
    }
  }

  get visibleTrackCount(): number {
    return this.selectedTrackIds.size;
  }

  get selectableTrackCount(): number {
    return this.trackGroups.reduce((total, group) => total + this.tracksForGroup(group.id).length, 0);
  }

  get selectedScAtacPopulation() {
    return IgvComponent.SCATAC_POPULATIONS.find(population =>
      population.id === this.selectedScAtacPopulationId
    )!;
  }

  get trackPresets(): readonly GenomeTrackPreset[] {
    return [
      {
        id: 'accessibility',
        label: 'PSD3 accessibility',
        trackIds: this.tracksForGroup('accessibility').map(track => track.id),
      },
      {
        id: 'histone',
        label: 'PSD3 H3K27ac',
        trackIds: this.trackCatalog
          .filter(track => track.group === 'matched-histone')
          .map(track => track.id),
      },
      {
        id: 'developmental',
        label: 'Developmental references',
        trackIds: this.trackCatalog
          .filter(track => track.group === 'developmental-reference')
          .map(track => track.id),
      },
      {
        id: 'all',
        label: 'All tracks',
        trackIds: this.trackGroups.flatMap(group => this.tracksForGroup(group.id).map(track => track.id)),
      },
    ];
  }

  get trackSelectionBusy(): boolean {
    return this.loadingTrackIds.size > 0;
  }

  tracksForGroup(groupId: GenomeTrackOption['group']): readonly GenomeTrackOption[] {
    return this.trackCatalog.filter(track =>
      track.group === groupId &&
      (groupId !== 'accessibility' || track.populationId === this.selectedScAtacPopulationId)
    );
  }

  async setScAtacPopulation(populationId: string): Promise<void> {
    if (populationId === this.selectedScAtacPopulationId || this.trackSelectionBusy) {
      return;
    }
    if (!IgvComponent.SCATAC_POPULATIONS.some(population => population.id === populationId)) {
      return;
    }

    const currentTracks = this.tracksForGroup('accessibility');
    const visibleConditions = new Set(
      currentTracks
        .filter(track => this.selectedTrackIds.has(track.id))
        .map(track => track.conditionId)
    );

    if (this.browser) {
      for (const track of currentTracks.filter(track => this.selectedTrackIds.has(track.id))) {
        await this.setTrackVisible(track.id, false);
      }
    } else {
      currentTracks.forEach(track => this.selectedTrackIds.delete(track.id));
    }

    this.selectedScAtacPopulationId = populationId;
    const requestedTracks = this.tracksForGroup('accessibility').filter(track =>
      visibleConditions.has(track.conditionId)
    );
    if (this.browser) {
      for (const track of requestedTracks) {
        await this.setTrackVisible(track.id, true);
      }
    } else {
      requestedTracks.forEach(track => this.selectedTrackIds.add(track.id));
    }
    this.changeDetector.detectChanges();
  }

  isTrackGroupVisible(groupId: GenomeTrackOption['group']): boolean {
    return this.tracksForGroup(groupId).every(track => this.selectedTrackIds.has(track.id));
  }

  selectedTrackCountForGroup(groupId: GenomeTrackOption['group']): number {
    return this.tracksForGroup(groupId).filter(track => this.selectedTrackIds.has(track.id)).length;
  }

  isTrackGroupExpanded(groupId: GenomeTrackOption['group']): boolean {
    return this.expandedTrackGroupIds.has(groupId);
  }

  toggleTrackGroupExpanded(groupId: GenomeTrackOption['group']): void {
    if (this.expandedTrackGroupIds.has(groupId)) {
      this.expandedTrackGroupIds.delete(groupId);
    } else {
      this.expandedTrackGroupIds.add(groupId);
    }
  }

  isTrackPresetActive(trackIds: readonly string[]): boolean {
    return trackIds.length === this.selectedTrackIds.size &&
      trackIds.every(trackId => this.selectedTrackIds.has(trackId));
  }

  isTrackGroupLoading(groupId: GenomeTrackOption['group']): boolean {
    return this.tracksForGroup(groupId).some(track => this.loadingTrackIds.has(track.id));
  }

  isTrackVisible(trackId: string): boolean {
    return this.selectedTrackIds.has(trackId);
  }

  async setTrackVisible(trackId: string, visible: boolean): Promise<void> {
    const track = this.trackCatalog.find(item => item.id === trackId);
    if (!track || !this.browser || this.loadingTrackIds.has(trackId)) {
      return;
    }

    if (visible === this.selectedTrackIds.has(trackId)) {
      return;
    }

    this.loadingTrackIds.add(trackId);
    try {
      if (visible) {
        await this.browser.loadTrack({ ...track.config });
        this.selectedTrackIds.add(trackId);
      } else {
        this.browser.removeTrackByName(track.config.name);
        this.selectedTrackIds.delete(trackId);
      }
    } catch (error) {
      console.error(`Unable to update genome-browser track ${track.config.name}`, error);
    } finally {
      this.loadingTrackIds.delete(trackId);
      this.changeDetector.detectChanges();
    }
  }

  async applyTrackPreset(trackIds: readonly string[]): Promise<void> {
    if (!this.browser) {
      return;
    }

    const requestedIds = new Set(trackIds);
    const tracksToHide = this.trackCatalog.filter(track =>
      this.selectedTrackIds.has(track.id) && !requestedIds.has(track.id)
    );
    const tracksToShow = this.trackCatalog.filter(track =>
      requestedIds.has(track.id) && !this.selectedTrackIds.has(track.id)
    );

    for (const track of tracksToHide) {
      await this.setTrackVisible(track.id, false);
    }
    for (const track of tracksToShow) {
      await this.setTrackVisible(track.id, true);
    }
  }

  async showTrackGroup(groupId: GenomeTrackOption['group']): Promise<void> {
    const tracksToShow = this.tracksForGroup(groupId).filter(track =>
      !this.selectedTrackIds.has(track.id)
    );

    for (const track of tracksToShow) {
      await this.setTrackVisible(track.id, true);
    }
  }

  async hideTrackGroup(groupId: GenomeTrackOption['group']): Promise<void> {
    const tracksToHide = this.tracksForGroup(groupId).filter(track =>
      this.selectedTrackIds.has(track.id)
    );

    for (const track of tracksToHide) {
      await this.setTrackVisible(track.id, false);
    }
  }

  async toggleTrackGroupVisibility(groupId: GenomeTrackOption['group']): Promise<void> {
    if (this.isTrackGroupVisible(groupId)) {
      await this.hideTrackGroup(groupId);
    } else {
      await this.showTrackGroup(groupId);
    }
  }

  addTrackByUrl() {
    this.browser.loadTrack({
      url: this.trackUrl,
    })
  }
  getInRangeGenes() {
    // This function loads data **without any criteria**. After 'general' data is loaded, detailed data will be scanned at the backend.
    this.resetDetailedPlotState();
    this.loading = true;
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
    this.resetDetailedPlotState();
    this.loading = true;
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
          this.general_grouped_genes = this.grouped_genes;
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
          this.general_grouped_genes = this.grouped_genes;
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
    this.databaseService.getGeneDiffExp(convertedList)
      .subscribe({
        next: (data) => {
          window.clearInterval(this.fakeInterval)
          this.fakeInterval = undefined;
          this.load_progress = 100;
          this.original_genes = data;
          this.genes = data;
          this.original_grouped_genes = this.convertDiffExpData(this.original_genes)
          this.detailedGenesByKey = new Map(
            this.original_grouped_genes.map(geneset => [this.getGeneKey(geneset), geneset])
          );
          this.refreshCellTypeOptions(data);
          this.detailedDataLoaded = true;
          this.lazyPlotMode = this.original_grouped_genes.length > this.eagerPlotGeneLimit;
          this.scheduleAutomaticApply();
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
    window.clearInterval(this.fakeInterval)
    if (this.automaticApplyFrame !== undefined) {
      window.cancelAnimationFrame(this.automaticApplyFrame)
    }
    window.clearTimeout(this.automaticApplyTimer)
    igv.removeAllBrowsers()
  }

  async ngOnInit() {
    this.selected_cells = this.cell_types;
    this.gene_interested = await Promise.all(
      this.genes_interested.map(async item => {
        const result = await this.nameConverterService.convertEnsembleToGene(item);
        return {
          name: result,
          stableId: item,
          reference: ' '
        } as Gene;
      })
    );
    console.log(this.gene_interested)
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

  private scheduleAutomaticApply() {
    if (this.automaticApplyFrame !== undefined) {
      window.cancelAnimationFrame(this.automaticApplyFrame);
    }
    window.clearTimeout(this.automaticApplyTimer);
    this.automaticApplyFrame = window.requestAnimationFrame(() => {
      this.automaticApplyFrame = undefined;
      this.automaticApplyTimer = window.setTimeout(() => {
        this.automaticApplyTimer = undefined;
        if (this.lazyPlotMode) {
          this.hydrateExpandedGenePlots();
        } else {
          this.subsetCorrectCellAndTissueTypes(false);
        }
      });
    });
  }

  subsetCorrectCellAndTissueTypes(showLoadingOverlay = true) {
    if (showLoadingOverlay) {
      if (this.automaticApplyFrame !== undefined) {
        window.cancelAnimationFrame(this.automaticApplyFrame);
        this.automaticApplyFrame = undefined;
      }
      window.clearTimeout(this.automaticApplyTimer);
      this.automaticApplyTimer = undefined;
      this.loading = true;
    }

    if (this.lazyPlotMode) {
      this.refreshExpandedGenePlots();
      if (showLoadingOverlay) {
        this.loading = false;
      }
      return;
    }

    const selectedCells = this.getSelectedCells();
    const selectedPmids = this.getSelectedPmids();
    const filteredGenes = this.original_grouped_genes.map(geneset =>
      this.filterGeneSet(geneset, selectedCells, selectedPmids)
    );

    this.grouped_genes = this.sortGenesByDEG(filteredGenes, this.deg_sorted_list);
    this.completely_loaded = true;
    if (showLoadingOverlay) {
      this.loading = false;
    }
  }

  onGeneExpanded(geneList: DiffExp[]) {
    const key = this.getGeneKey(geneList);
    this.expandedGeneKeys.add(key);
    if (this.lazyPlotMode && this.detailedDataLoaded) {
      this.hydrateGenePlots(key);
    }
  }

  onGeneCollapsed(geneList: DiffExp[]) {
    this.expandedGeneKeys.delete(this.getGeneKey(geneList));
  }

  isGeneExpanded(geneList: DiffExp[]) {
    return this.expandedGeneKeys.has(this.getGeneKey(geneList));
  }

  isGenePlotReady(geneList: DiffExp[]) {
    return this.completely_loaded || this.plotReadyGeneKeys.has(this.getGeneKey(geneList));
  }

  getGeneKey(geneList: DiffExp[]) {
    return geneList[0]?.gene?.toString().replace('ENSMUSG', '').replace(/^0+/, '') ?? '';
  }

  private hydrateGenePlots(key: string) {
    if (this.plotReadyGeneKeys.has(key)) {
      return;
    }

    const detailedGenes = this.detailedGenesByKey.get(key);
    const geneIndex = this.grouped_genes.findIndex(geneset => this.getGeneKey(geneset) === key);
    if (!detailedGenes || geneIndex < 0) {
      return;
    }

    const filteredGenes = this.filterGeneSet(
      detailedGenes,
      this.getSelectedCells(),
      this.getSelectedPmids()
    );
    const nextGroupedGenes = [...this.grouped_genes];
    nextGroupedGenes[geneIndex] = filteredGenes;
    this.plotReadyGeneKeys.add(key);
    this.grouped_genes = nextGroupedGenes;
  }

  private refreshExpandedGenePlots() {
    this.completely_loaded = false;
    const previouslyReadyKeys = new Set(this.plotReadyGeneKeys);
    this.grouped_genes = this.grouped_genes.map(geneset => {
      const key = this.getGeneKey(geneset);
      if (!previouslyReadyKeys.has(key)) {
        return geneset;
      }
      return this.general_grouped_genes.find(generalGenes => this.getGeneKey(generalGenes) === key) ?? geneset;
    });
    this.plotReadyGeneKeys.clear();
    this.hydrateExpandedGenePlots();
  }

  private hydrateExpandedGenePlots() {
    [...this.expandedGeneKeys].forEach(key => this.hydrateGenePlots(key));
  }

  private filterGeneSet(geneset: DiffExp[], selectedCells: string[], selectedPmids: Set<number>) {
    return geneset.filter(gene => {
      if (gene.cell_type?.includes('All')) {
        return true;
      }
      // Rows are matched at major-cell-type level: the picker lists families, not
      // sub-clusters, so "Cardiomyocyte" has to catch "Cardiomyocyte 1" through
      // "Cardiomyocyte 5" and the double-numbered duplicates alike.
      const family = gene.cell_type ? this.cellTypeFamily(gene.cell_type) : '';
      return selectedCells.includes(family) && selectedPmids.has(gene.pmid!);
    });
  }

  clearSelectedCells() {
    this.onCellChanged([]);
  }

  selectAllCells() {
    this.onCellChanged(this.cell_types.slice());
  }


  // "Cardiomyocyte 1", "Cardiomyocyte 5" and "Cardiomyocyte 2 2" are all sub-clusters
  // of one major type. Every trailing index is stripped rather than only the last,
  // so the double-numbered duplicates land on the same family as their siblings.
  private cellTypeFamily(cellType: string) {
    return cellType.replace(/(\s+\d+)+$/, '');
  }

  private refreshCellTypeOptions(rows: DiffExp[]) {
    // Options are the major cell types present in the genes currently loaded, taken
    // from the data rather than a hand-maintained list (the two had drifted: the old
    // list omitted "Cardiomyocyte 5" and offered entries that never occur). Selecting
    // a major type matches every sub-cluster under it. "All Cells" is excluded because
    // filterGeneSet keeps those rows unconditionally.
    const options = [...new Set(
      rows
        .map(row => row.cell_type)
        .filter((cellType): cellType is string => !!cellType && !cellType.includes('All'))
        .map(cellType => this.cellTypeFamily(cellType))
    )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    this.cell_types = options;
    this.selected_cells = options.slice();
  }

  private getSelectedCells() {
    // An empty selection is honoured rather than reset to everything: filterGeneSet
    // always keeps the pooled "All Cells" rows, so clearing narrows the cards to
    // that series instead of leaving the picker impossible to empty.
    return this.selected_cells;
  }

  private getSelectedPmids() {
    const selectedPmids = new Set<number>();
    for (const key in this.pmid_tissue_dist) {
      if (this.selected_tissues.includes(key)) {
        this.pmid_tissue_dist[key].forEach(pmid => selectedPmids.add(pmid));
      }
    }
    return selectedPmids;
  }

  private resetDetailedPlotState() {
    if (this.automaticApplyFrame !== undefined) {
      window.cancelAnimationFrame(this.automaticApplyFrame);
      this.automaticApplyFrame = undefined;
    }
    window.clearTimeout(this.automaticApplyTimer);
    this.automaticApplyTimer = undefined;
    this.completely_loaded = false;
    this.detailedDataLoaded = false;
    this.lazyPlotMode = false;
    this.expandedGeneKeys.clear();
    this.plotReadyGeneKeys.clear();
    this.detailedGenesByKey.clear();
  }

  onTissuesChanged($event: any) {
    this.selected_tissues = $event.value
    this.refreshPlotsAfterFilterChange();
  }

  onCellChanged(selectedCells: string[] | null) {
    this.selected_cells = selectedCells ?? [];
    this.refreshPlotsAfterFilterChange();
  }

  private refreshPlotsAfterFilterChange() {
    if (this.detailedDataLoaded) {
      this.subsetCorrectCellAndTissueTypes(false);
    }
  }

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
      this.resetDetailedPlotState();
      this.loading = true;
      this.getDiffExpGeneralData(gene_list, true);
    } else alert(`Entered gene(s): ${false_genes.join(", ")} not found!`)
  }

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
