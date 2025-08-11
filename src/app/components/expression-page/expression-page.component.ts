import { DiffExp } from 'src/app/models/diffExp.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DatabaseService } from 'src/app/services/database.service';
import { DatabaseConstsService } from 'src/app/services/database-consts.service';
import { GeneConversionService } from 'src/app/services/name-converter.service';
import { Observable, of, Subscription, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { 
  ApexAxisChartSeries, 
  ApexChart, 
  ApexDataLabels, 
  ApexPlotOptions, 
  ApexXAxis, 
  ApexYAxis,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexLegend
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  legend: ApexLegend;
};

@Component({
  standalone: false,
  selector: 'app-expression-page',
  templateUrl: './expression-page.component.html',
  styleUrls: ['./expression-page.component.css']
})

export class ExpressionPageComponent implements OnInit, OnDestroy {
  searchInput = '';
  expressionData: any[] = [];
  loading: boolean = false;
  selectedCellType = 'All Cells';
  selectedSurgery = 'All'; // New filter for Surgery (MI, Sham, All)
  selectedComparison = 'All'; // New filter for Comparison (P1vsP8, All)
  selectedNatalStatus = 'All'; // New filter for natal_status (Neonatal, Postnatal, All)
  cellTypes: string[] = [];
  surgeries: string[] = ['All', 'MI', 'Sham'];
  comparisons: string[] = ['All', 'P1vsP8'];
  natalStatuses: string[] = ['All', 'Neonatal', 'Postnatal'];
  logScale = true;
  recentGenes: string[] = [];
  private subscriptions: Subscription[] = [];
  splitByTime: boolean = true; // Default to showing split data


  chartOptions: ChartOptions = {
    series: [],
    chart: {
      height: 400,
      type: 'bar',
      toolbar: { show: true }
    },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        distributed: false
      }
    },
    xaxis: {
      type: 'category',
      categories: [],
      title: { text: 'Condition' }
    },
    yaxis: {
      title: { text: 'Expression Level' }
    },
    title: {
      text: 'Gene Expression Comparison',
      align: 'center',
      style: { fontSize: '16px' }
    },
    tooltip: { shared: true, intersect: false },
    legend: { show: true }
  };
  // Add this to your color definitions
  combinedColors = [
    '#FF6B6B', // MI
    '#4ECDC4', // P1
    '#45B7D1', // P8
    '#96CEB4'  // Sham
  ];
  splitColors = [
      '#FF6B6B', // MI_1 - Red
      '#FF8E8E', // MI_3 - Light Red
      '#4ECDC4', // P1_1 - Teal
      '#6FE7DE', // P1_3 - Light Teal
      '#45B7D1', // P8_1 - Blue
      '#6BC5E0', // P8_3 - Light Blue
      '#96CEB4', // Sham_1 - Green
      '#B5D6C7'  // Sham_3 - Light Green
    ];

  // Add this mapping for condition display names
  conditionDisplayNames: { [key: string]: string } = {
    'MI_1': 'MI (1d)',
    'MI_3': 'MI (3d)',
    'P1_1': 'P1 (1d)',
    'P1_3': 'P1 (3d)',
    'P8_1': 'P8 (1d)',
    'P8_3': 'P8 (3d)',
    'Sham_1': 'Sham (1d)',
    'Sham_3': 'Sham (3d)',
    'MI': 'MI',
    'P1': 'P1',
    'P8': 'P8',
    'Sham': 'Sham'
  };

  constructor(
    private databaseService: DatabaseService,
    private databaseConstService: DatabaseConstsService,
    private geneConversionService: GeneConversionService
  ) {}

  ngOnInit() {
    console.debug('[ExpressionPageComponent] ngOnInit: Initializing component');
    this.cellTypes = this.databaseConstService.getDECellTypes();
    console.debug('[ExpressionPageComponent] Fallback cell types:', this.cellTypes);
    this.loadCellTypes();
    this.loadRecentGenes();
  }

  ngOnDestroy() {
    console.debug('[ExpressionPageComponent] ngOnDestroy: Cleaning up subscriptions');
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadCellTypes() {
    console.debug('[ExpressionPageComponent] loadCellTypes: Fetching cell types from getGeneDiffExpGeneral');
    this.subscriptions.push(
      this.databaseService.getGeneDiffExpGeneral([]).pipe(
        map((data: DiffExp[]) => {
          console.debug('[ExpressionPageComponent] loadCellTypes: Raw API response:', data);
          const cellTypes = new Set<string>();
          data.forEach(row => {
            if (row.cell_type) cellTypes.add(row.cell_type);
            if (row.cell_type2) cellTypes.add(row.cell_type2);
            if (row.cell_type3) cellTypes.add(row.cell_type3);
          });
          const types = ['All Cells', ...Array.from(cellTypes).filter(type => type)];
          console.debug('[ExpressionPageComponent] loadCellTypes: Processed cell types:', types);
          return types;
        }),
        catchError(error => {
          console.error('[ExpressionPageComponent] loadCellTypes: Error fetching cell types:', error);
          return of(this.databaseConstService.getDECellTypes());
        })
      ).subscribe({
        next: (types) => {
          this.cellTypes = types.length > 1 ? types : this.databaseConstService.getDECellTypes();
          console.debug('[ExpressionPageComponent] loadCellTypes: Final cell types set:', this.cellTypes);
        },
        error: (e) => console.error('[ExpressionPageComponent] loadCellTypes: Failed to process cell types', e)
      })
    );
  }

  async loadExpression() {
    if (!this.searchInput.trim()) {
      alert('Please enter a valid gene symbol or Ensembl ID');
      return;
    }

    this.loading = true;

    try {
      const filteredData = await this.convertAndProcessGene(this.searchInput.trim());
      if (filteredData.length === 0) {
        alert('No data found for the selected gene and conditions');
      } else {
        this.finishDataProcessing(filteredData);
      }
    } catch (error) {
      console.error('Error loading expression:', error);
      alert('Failed to load gene data. Please try again.');
    } finally {
      this.loading = false;
      this.searchInput = ''; // Clear search input after adding
    }
  }

  private finishDataProcessing(filteredData: any[]) {
    console.log('[ExpressionPageComponent] finishDataProcessing: Adding filtered data');
    
    // For each gene, set displayName to geneSymbol if not already set
    filteredData.forEach(data => {
      if (!data.displayName) {
        data.displayName = data.geneSymbol || data.ensemblId;
      }
    });
    
    this.expressionData.push(...filteredData);
    this.updateRecentGenes();
    this.updateChart();
  }

  private updateRecentGenes() {
    this.recentGenes = [...new Set([this.searchInput, ...this.recentGenes])].slice(0, 5);
    this.saveRecentGenes();
  }

  
  // Modify the updateChart method
  private updateChart() {
    // Determine which conditions to show based on checkbox
    const conditions = this.splitByTime 
      ? ['MI_1', 'MI_3', 'P1_1', 'P1_3', 'P8_1', 'P8_3', 'Sham_1', 'Sham_3']
      : ['MI', 'P1', 'P8', 'Sham'];

    const geneNames = this.expressionData.map(data => data.geneSymbol || data.ensemblId);

    const series: ApexAxisChartSeries = conditions.map(condition => {
      const conditionValues = this.expressionData.map(data => {
        const values = data.conditions[condition] || [];
        
        if (!values.length) {
          console.log(`[updateChart] No values for '${condition}' in ${data.geneSymbol || data.ensemblId}`);
          return 0;
        }
        
        const transformedValues = this.logScale 
          ? values.map((v: number) => v > 0 ? Math.log10(v + 1) : 0) 
          : values;
        
        return this.getMean(transformedValues);
      });
      
      return {
        name: this.conditionDisplayNames[condition] || condition,
        data: conditionValues
      };
    });
    
    // Update chart options
    this.chartOptions = {
      ...this.chartOptions,
      series,
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: geneNames,
        title: { text: 'Genes' }
      },
      yaxis: {
        ...this.chartOptions.yaxis,
        title: { text: this.logScale ? 'Log10(Expression + 1)' : 'Expression Level' }
      },
      // ... rest remains the same
    };

    // Set colors based on split status
    (this.chartOptions as any).colors = this.splitByTime 
      ? this.splitColors 
      : this.combinedColors;
  }

  // Add this to refresh the chart when checkbox changes
  onSplitChange() {
    this.updateChart();
  }

  private fiveNumberSummary(values: number[]): [number, number, number, number, number] {
    if (!values || values.length === 0) return [0, 0, 0, 0, 0];
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    
    return [min, q1, median, q3, max];
  }

  getMean(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  refreshPlots() {
    this.updateChart();
  }

  removeGene(index: number) {
    console.debug('[ExpressionPageComponent] removeGene: Removing gene at index:', index);
    this.expressionData.splice(index, 1);
    this.updateChart();
  }

  private saveRecentGenes() {
    console.debug('[ExpressionPageComponent] saveRecentGenes: Saving recent genes:', this.recentGenes);
    localStorage.setItem('recentGenes', JSON.stringify(this.recentGenes));
  }

  private loadRecentGenes() {
    const saved = localStorage.getItem('recentGenes');
    if (saved) {
      this.recentGenes = JSON.parse(saved);
      console.debug('[ExpressionPageComponent] loadRecentGenes: Loaded recent genes:', this.recentGenes);
    }
  }

  private fetchGeneData(genes: string[], useGeneralEndpoint: boolean = true): Observable<any[]> {
    const serviceMethod = useGeneralEndpoint ? 
      this.databaseService.getGeneDiffExpGeneral(genes) : 
      this.databaseService.getGeneDiffExp(genes);
    
    return serviceMethod.pipe(
      switchMap((data: DiffExp[]) => from(this.processGeneData(data))),
      catchError(error => {
        console.error('Error fetching gene data:', error);
        return of([]);
      })
    );
  }

  private async processGeneData(data: DiffExp[]): Promise<any[]> {
    if (!data || data.length === 0) return [];
    
    // Create a promise for each row to handle the symbol conversion
    const rowPromises = data.map(async (row) => {
      console.log('[processGeneData] Processing row:', row);
      
      // Format Ensembl ID
      const temp_string = "00000000000" + row.gene;
      const ensemblId = "ENSMUSG" + temp_string.slice(-11);
      
      // Convert to gene symbol
      let geneSymbol = ensemblId;
      try {
        const symbol = await this.geneConversionService.convertEnsembleToGene(ensemblId);
        geneSymbol = symbol || ensemblId;
      } catch (error) {
        console.error('Error converting ensemble ID to gene:', error);
      }
      
      const conditionsData: { [key: string]: number[] } = {
        MI_1: [],
        MI_3: [],
        P1_1: [],
        P1_3: [],
        P8_1: [],
        P8_3: [],
        Sham_1: [],
        Sham_3: [],
        MI: [],
        Sham: [],
        Neonatal: [],
        Postnatal: [],
        P1: [],
        P8: []
      };

      // Process each condition type with their replicates
      const processConditionValues = (values: string[], conditionType: string) => {
        values.forEach((valueStr, index) => {
          if (valueStr) {
            const nums = valueStr.split(',').map((val: string) => Number(val)).filter((v: number) => !isNaN(v));
            const replicateKey = `${conditionType}_${index === 0 ? '1' : '3'}`;
            
            // Store in replicate-specific arrays
            conditionsData[replicateKey].push(...nums);
            
            // Also store in combined arrays for backward compatibility
            conditionsData[conditionType].push(...nums);
            
            // Also categorize by natal status if needed
            if (conditionType === 'P1' || conditionType === 'P8') {
              conditionsData['Postnatal'].push(...nums);
            }
          }
        });
      };

      // Process MI conditions
      processConditionValues([(row as any).MI_1, (row as any).MI_3].filter(Boolean), 'MI');
      
      // Process Sham conditions  
      processConditionValues([(row as any).Sham_1, (row as any).Sham_3].filter(Boolean), 'Sham');
      
      // Process P1 conditions
      processConditionValues([(row as any).P1_1, (row as any).P1_3].filter(Boolean), 'P1');
      
      // Process P8 conditions
      processConditionValues([(row as any).P8_1, (row as any).P8_3].filter(Boolean), 'P8');

      console.log('[processGeneData] conditionsData:', conditionsData);

      return {
        geneSymbol,
        ensemblId,
        displayName: geneSymbol, // Set displayName to the symbol
        cellType: row.cell_type || 'All Cells',
        conditions: conditionsData,
        sig_total: (row as any).sig_total || '',
      };
    });

    // Wait for all conversions to complete
    return Promise.all(rowPromises);
  }

  private async convertAndProcessGene(searchInput: string): Promise<any[]> {
    const input = searchInput.trim();
    let queryId = input;
    
    // Convert gene symbol to Ensembl ID if needed
    if (!input.startsWith('ENSMUSG')) {
      const ensemblId = await this.geneConversionService.convertGeneToEnsemble(input);
      if (ensemblId) {
        queryId = ensemblId;
      }
    }
    
    // Format for database query
    const dbGeneId = queryId.startsWith('ENSMUSG') 
      ? queryId.replace('ENSMUSG', '').replace(/^0+/, '') || '0'
      : queryId;
      
    // Fetch data
    const data = await this.fetchGeneData([dbGeneId]).toPromise();
    const filteredData = this.filterDataByConditions(data || []);
    
    return filteredData;
  }

  private filterDataByConditions(data: any[]): any[] {
    return data.filter(d => {
      const matchesCellType = this.selectedCellType === 'All Cells' || d.cellType?.toLowerCase() === this.selectedCellType.toLowerCase();
      return matchesCellType;
    });
  }
}