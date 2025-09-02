import { DiffExp } from 'src/app/models/diffExp.model';
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
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
  ApexLegend,
  ChartComponent
} from "ng-apexcharts";

export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  colors?: string[];
};

// Updated interface to store gene-specific filter criteria
interface GeneExpressionData {
  geneSymbol: string;
  ensemblId: string;
  displayName: string;
  conditions: { [key: string]: number[] };
  filterCriteria: {
    cellType: string;
    surgery: string;
    natalStatus: string;
  };
  sig_total?: string;
  rawData?: DiffExp[]; // Store raw data for reference
}

@Component({
  standalone: false,
  selector: 'app-expression-page',
  templateUrl: './expression-page.component.html',
  styleUrls: ['./expression-page.component.css']
})

export class ExpressionPageComponent implements OnInit, OnDestroy {
  searchInput = '';
  expressionData: GeneExpressionData[] = [];
  loading: boolean = false;
  selectedCellType = 'All Cells';
  selectedSurgery = 'All';
  selectedComparison = 'All';
  selectedNatalStatus = 'All';
  cellTypes: string[] = [];
  surgeries: string[] = ['All', 'MI', 'Sham'];
  comparisons: string[] = ['All', 'P1vsP8'];
  natalStatuses: string[] = ['All', 'P1', 'P8', 'P2'];
  logScale = true;
  recentGenes: string[] = [];
  private subscriptions: Subscription[] = [];
  splitByTime: boolean = true;
  @ViewChild('chartObj') chart!: ChartComponent; // Reference to the apx-chart component

  chartOptions: ChartOptions = {
    series: [],
    chart: {
      height: 800,
      type: 'boxPlot',
      toolbar: { show: true },
      zoom: { enabled: false } // Disable zoom to avoid preventDefault warnings
    },
    dataLabels: { enabled: false },
    plotOptions: {
      boxPlot: {
        colors: {
          upper: '#ea99c1',
          lower: '#c983a6ff'
        }
      }
    },
    xaxis: {
      type: 'category',
      categories: [],
      title: { text: 'Genes' },
      labels: {
        rotate: -45,
        maxHeight: 150,
        style: {
          fontSize: '8px'
        }
      }
    },
    yaxis: {
      title: { 
        text: 'Expression Level' 
      },
      labels: {
        formatter: function (value: number) {
          return value.toFixed(2);
        }
      }
    },
    title: {
      text: 'Gene Expression Distribution Comparison',
      align: 'center',
      style: { fontSize: '16px' }
    },
    tooltip: {
    enabled: true,
    shared: false,
    intersect: true,
    followCursor: false,
    custom: (params) => {
      const { series, seriesIndex, dataPointIndex, w } = params;
      
      try {
        const data = w.config.series[seriesIndex].data[dataPointIndex];
        const fullLabel = w.config.xaxis.categories[dataPointIndex];
        
        // Parse the label to extract gene name and condition
        // Format is: "GeneName (optional filter info) (ConditionName)"
        const lastParenIndex = fullLabel.lastIndexOf('(');
        const genePart = fullLabel.substring(0, lastParenIndex).trim();
        const conditionPart = fullLabel.substring(lastParenIndex + 1, fullLabel.length - 1);
        
        // Get display name for condition
        const conditionDisplayName = this.conditionDisplayNames[conditionPart] || conditionPart;
        
        return `
          <div class="apexcharts-tooltip-box apexcharts-tooltip-boxPlot" style="padding: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
            <div style="margin-bottom: 4px;">Gene: <strong>${genePart}</strong></div>
            <div style="margin-bottom: 4px;">Condition: <strong>${conditionDisplayName}</strong></div>
            <div style="margin-bottom: 2px;">Max: <strong>${data.y[4]?.toFixed(2)}</strong></div>
            <div style="margin-bottom: 2px;">Q3: <strong>${data.y[3]?.toFixed(2)}</strong></div>
            <div style="margin-bottom: 2px;">Median: <strong>${data.y[2]?.toFixed(2)}</strong></div>
            <div style="margin-bottom: 2px;">Q1: <strong>${data.y[1]?.toFixed(2)}</strong></div>
            <div>Min: <strong>${data.y[0]?.toFixed(2)}</strong></div>
          </div>
        `;
      } catch (error) {
        console.error('Tooltip error:', error);
        return `<div>Error displaying tooltip</div>`;
      }
    }
  },
    legend: { show: true, position: 'top' },
    colors: [] // Initialize colors array
  };
  
  onSplitChange() {
    this.updateChart();
  }

  ngAfterViewInit() {
    this.updateChart();
  }

  // Helper function to calculate box plot statistics
  private calculateBoxPlotStats(values: number[]): number[] {
    if (!values || values.length === 0) return [0, 0, 0, 0, 0];
    
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    const min = sorted[0];
    const max = sorted[n - 1];
    
    // Calculate quartiles
    const q1Index = Math.floor(n * 0.25);
    const medianIndex = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    const q1 = n > 1 ? sorted[q1Index] : min;
    const median = n > 1 ? sorted[medianIndex] : min;
    const q3 = n > 1 ? sorted[q3Index] : max;
    
    return [min, q1, median, q3, max];
  }

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
    private geneConversionService: GeneConversionService,
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cellTypes = this.databaseConstService.getDECellTypes();
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
      // Store current filter state for this specific gene
      const currentFilters = {
        cellType: this.selectedCellType,
        surgery: this.selectedSurgery,
        natalStatus: this.selectedNatalStatus
      };


      const filteredData = await this.convertAndProcessGene(this.searchInput.trim(), currentFilters);
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

  private finishDataProcessing(filteredData: GeneExpressionData[]) {
    
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

  updateChart() {
    console.log('=== updateChart called ===');
    console.log('Current expressionData length:', this.expressionData.length);
    console.log('Current filters:', {
      selectedSurgery: this.selectedSurgery,
      selectedNatalStatus: this.selectedNatalStatus,
      selectedCellType: this.selectedCellType
    });

    // For each gene, determine which conditions should be shown based on its individual filter criteria
    const getConditionsForGene = (geneData: any) => {
      const availableConditions = Object.keys(geneData.conditions).filter(condition => {
        const values = geneData.conditions[condition];
        return values && values.length > 0;
      });

      if (this.splitByTime) {
        // Show separate PSD1 and PSD3 conditions
        return availableConditions.filter(condition => {
          return condition.includes('_PSD1') || condition.includes('_PSD3');
        }).sort();
      } else {
        // Group by base condition (without PSD suffix) but don't modify original data
        const baseConditions = new Set<string>();
        
        availableConditions.forEach(condition => {
          if (condition.includes('_PSD1') || condition.includes('_PSD3')) {
            // Extract base condition (e.g., "P1_MI_PSD1" -> "P1_MI")
            const baseCondition = condition.replace(/_PSD[13]$/, '');
            baseConditions.add(baseCondition);
          }
        });
        
        return Array.from(baseConditions).sort();
      }
    };

    // Helper function to get merged values for a base condition
    const getMergedValues = (geneData: any, baseCondition: string) => {
      const psd1Condition = `${baseCondition}_PSD1`;
      const psd3Condition = `${baseCondition}_PSD3`;
      
      const psd1Values = geneData.conditions[psd1Condition] || [];
      const psd3Values = geneData.conditions[psd3Condition] || [];
      
      return [...psd1Values, ...psd3Values];
    };

    const geneNames = this.expressionData.map(data => {
      const filters = data.filterCriteria;
      const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
      return filterText ? `${data.geneSymbol || data.ensemblId} (${filterText})` : data.geneSymbol || data.ensemblId;
    });

    console.log('Expression data available:', this.expressionData);
    console.log('Split by time:', this.splitByTime);

    // Create flat series (one series, many data points)
    const series: ApexAxisChartSeries = [{
      name: 'Expression',
      type: 'boxPlot',
      data: this.expressionData.flatMap(data => {
        const filters = data.filterCriteria;
        const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
        const geneName = filterText ? `${data.geneSymbol || data.ensemblId} (${filterText})` : data.geneSymbol || data.ensemblId;
        
        // Get conditions specific to this gene based on its own data and splitByTime preference
        const geneConditions = getConditionsForGene(data);
        console.log(`Conditions for ${geneName}:`, geneConditions);
        
        return geneConditions.map(condition => {
          let values;
          if (this.splitByTime) {
            // Use original condition data
            values = data.conditions[condition];
          } else {
            // Use merged values from PSD1 and PSD3
            values = getMergedValues(data, condition);
          }
          
          const transformedValues = this.logScale
            ? values.map((v: number) => (v > 0 ? Math.log10(v + 1) : 0))
            : values;
          const boxStats = this.calculateBoxPlotStats(transformedValues);
          
          console.log(`Box stats for ${geneName} (${condition}):`, boxStats);
          
          return {
            x: `${geneName} (${this.conditionDisplayNames[condition] || condition})`,
            y: boxStats
          };
        });
      })
    }];

    const flatCategories = this.expressionData.flatMap(data => {
      const filters = data.filterCriteria;
      const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
      const geneName = filterText ? `${data.geneSymbol || data.ensemblId} (${filterText})` : data.geneSymbol || data.ensemblId;
      
      // Get conditions specific to this gene
      const geneConditions = getConditionsForGene(data);
      
      return geneConditions.map(condition => `${geneName} (${this.conditionDisplayNames[condition] || condition})`);
    });

    const conditionDisplayNames = this.conditionDisplayNames;

    // Define new options for update
    const newOptions: Partial<ChartOptions> = {
      series,
      tooltip: {
        enabled: true,
        custom: function(opts) {
          console.log('Tooltip opts:', opts); // Debug log
          
          const { series, seriesIndex, dataPointIndex, w } = opts;
    
          try {
            // Try multiple ways to get the label
            let fullLabel = w.globals.categoryLabels?.[dataPointIndex] 
                        || w.config.xaxis?.categories?.[dataPointIndex]
                        || w.globals.labels?.[dataPointIndex]
                        || w.config.series[seriesIndex].data[dataPointIndex].x
                        || `Data Point ${dataPointIndex}`;
            
            const boxData = w.config.series[seriesIndex].data[dataPointIndex].y;
            
            // Simple parsing with null check
            let genePart = fullLabel;
            let conditionPart = '';
            
            if (fullLabel && typeof fullLabel === 'string') {
              const lastParenIndex = fullLabel.lastIndexOf('(');
              if (lastParenIndex > 0) {
                genePart = fullLabel.substring(0, lastParenIndex).trim();
                conditionPart = fullLabel.substring(lastParenIndex + 1, fullLabel.length - 1);
              }
            }
            
            const conditionDisplayName = conditionDisplayNames[conditionPart] || conditionPart;
            
            // Safe access to box plot data with fallbacks
            const min = boxData?.[0] ?? 'N/A';
            const q1 = boxData?.[1] ?? 'N/A';
            const median = boxData?.[2] ?? 'N/A';
            const q3 = boxData?.[3] ?? 'N/A';
            const max = boxData?.[4] ?? 'N/A';
            
            return `
              <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div><strong>Gene:</strong> ${genePart}</div>
                <div><strong>Condition:</strong> ${conditionDisplayName}</div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
                <div>Max: <strong>${typeof max === 'number' ? max.toFixed(2) : max}</strong></div>
                <div>Q3: <strong>${typeof q3 === 'number' ? q3.toFixed(2) : q3}</strong></div>
                <div>Median: <strong>${typeof median === 'number' ? median.toFixed(2) : median}</strong></div>
                <div>Q1: <strong>${typeof q1 === 'number' ? q1.toFixed(2) : q1}</strong></div>
                <div>Min: <strong>${typeof min === 'number' ? min.toFixed(2) : min}</strong></div>
              </div>
            `;
          } catch (error) {
            console.error('Tooltip error:', error);
            return `<div style="padding: 8px; background: #fee; border: 1px solid #fcc;">Error: ${error}</div>`;
          }
        }
      },
      chart: {
        ...this.chartOptions.chart,
        type: 'boxPlot',
        height: 800
      },
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: flatCategories,
        title: { text: 'Gene (Condition)' },
        labels: {
          rotate: -45,
          maxHeight: 150,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        ...this.chartOptions.yaxis,
        title: { text: this.logScale ? 'Log10(Expression + 1)' : 'Expression Level' },
        labels: {
          formatter: function (value: number) {
            return value.toFixed(2);
          }
        }
      },
      plotOptions: {
        ...this.chartOptions.plotOptions,
        bar: {
          columnWidth: '50%' // Single series, wider is fine
        }
      },
      
      legend: {
        ...this.chartOptions.legend,
        show: false // No legend needed
      }
    };

    // Update the chart
    if (this.chart) {
      try {
        console.log('Attempting to update chart with series:', series);
        // Reset chart to clear previous state
        this.chartOptions.series = [];
        this.cdr.detectChanges();
        console.log('Chart bindings reset');

        // Update series and options
        this.chart.updateSeries(series, false);
        this.chart.updateOptions(newOptions, true, true);
        console.log('Chart update completed');
        console.log('Updated chart options:', JSON.stringify(this.chartOptions, null, 2));

        
      } catch (error) {
        console.error('Error updating chart:', error);
      }
    } else {
      console.warn('Chart component not initialized');
    }

    this.chartOptions = { ...this.chartOptions, ...newOptions };
  }

  getMean(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  refreshPlots() {
    // Note: This doesn't refilter existing genes, just refreshes the chart
    this.updateChart();
  }

  removeGene(index: number) {
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

  private fetchGeneData(genes: string[], useGeneralEndpoint: boolean = true): Observable<DiffExp[]> {
    return this.databaseService.getGeneDiffExp(genes).pipe(
      catchError(error => {
        console.error('Error fetching gene data:', error);
        return of([]);
      })
    );
  }

  private async processGeneData(data: DiffExp[], filters: any): Promise<GeneExpressionData[]> {
    if (!data || data.length === 0) return [];

    // Group data by gene
    const geneGroups = data.reduce((groups, row) => {
      const temp_string = "00000000000" + row.gene;
      const ensemblId = "ENSMUSG" + temp_string.slice(-11);

      if (!groups[ensemblId]) {
        groups[ensemblId] = [];
      }
      groups[ensemblId].push(row);
      return groups;
    }, {} as { [key: string]: DiffExp[] });

    // Process each gene group
    const processedGenes: GeneExpressionData[] = [];

    for (const [ensemblId, geneRows] of Object.entries(geneGroups)) {
      // Convert to gene symbol
      let geneSymbol = ensemblId;
      try {
        const symbol = await this.geneConversionService.convertEnsembleToGene(ensemblId);
        geneSymbol = symbol || ensemblId;
      } catch (error) {
        console.error('Error converting ensemble ID to gene:', error);
      }

      // Filter rows based on criteria
      let filteredRows = geneRows;

      // Apply cell type filter
      if (filters.cellType !== 'All Cells') {
        filteredRows = filteredRows.filter(row => row.cell_type === filters.cellType);
      }

      // Apply natal status filter
      if (filters.natalStatus !== 'All') {
        filteredRows = filteredRows.filter(row => row.natal_status === filters.natalStatus);
      }

      // Apply surgery filter
      if (filters.surgery !== 'All') {
        filteredRows = filteredRows.filter(row =>
          row.Age.split(',').some(age => age.trim() === filters.surgery)
        );
      }

      if (filteredRows.length === 0) {
        console.warn(`[processGeneData] No data left after filtering for gene ${geneSymbol}`);
        continue;
      }

      // Define condition groups based on surgery and natalStatus filters
      const possibleConditions = [];
      const natalStatuses = filters.natalStatus === 'All' ? ['P1', 'P2', 'P8'] : [filters.natalStatus];
      const surgeries = filters.surgery === 'All' ? ['MI', 'Sham'] : [filters.surgery];
      const psds = this.splitByTime ? ['PSD1', 'PSD3'] : ['PSD1'];

      for (const natal of natalStatuses) {
        for (const surgery of surgeries) {
          for (const psd of psds) {
            possibleConditions.push(`${natal}_${surgery}_${psd}`);
          }
        }
      }

      // Initialize only the relevant conditions
      const conditionsData: { [key: string]: number[] } = {};
      possibleConditions.forEach(condition => {
        conditionsData[condition] = [];
      });

      // Process filtered rows - using the Exp, Age, natal_status, and PSD columns
      filteredRows.forEach(row => {
        if (row.Exp && row.Age && row.natal_status && row.PSD !== undefined) {
          try {
            // Split comma-separated values
            const expValues = row.Exp.split(',').map(v => parseFloat(v.trim()));
            const ageValues = row.Age.split(',').map(a => a.trim());

            // Make sure we have matching lengths
            if (expValues.length === ageValues.length) {
              // Process each value
              expValues.forEach((value, index) => {
                if (!isNaN(value) && value > 0) { // Filter out 0 values and NaN
                  const surgeryLabel = ageValues[index]; // "MI" or "Sham"
                  const natal = row.natal_status; // "P1", "P2", or "P8"
                  const psd = row.PSD;

                  // Create condition key based on natal, surgeryLabel, and PSD
                  const conditionKey = `${natal}_${surgeryLabel}_PSD${psd}`;

                  // Add to specific condition if it exists
                  if (conditionsData[conditionKey]) {
                    conditionsData[conditionKey].push(value);
                  }
                }
              });
            } else {
              console.warn(`[processGeneData] Mismatched Exp (${expValues.length}) and Age (${ageValues.length}) lengths for gene ${geneSymbol}`);
            }
          } catch (error) {
            console.error(`[processGeneData] Error processing Exp/Age data for gene ${geneSymbol}:`, error);
          }
        }
      });

      // Log the conditions data for debugging
      console.log(`[processGeneData] ${geneSymbol} conditions data:`, conditionsData);

      // Only include genes with non-empty conditions
      if (Object.values(conditionsData).some(values => values.length > 0)) {
        processedGenes.push({
          geneSymbol,
          ensemblId,
          displayName: geneSymbol,
          conditions: conditionsData,
          filterCriteria: filters,
          rawData: filteredRows
        });
      } else {
        console.warn(`[processGeneData] No valid data for gene ${geneSymbol} after processing conditions`);
      }
    }

    return processedGenes;
  }

  private async convertAndProcessGene(searchInput: string, filters: any): Promise<GeneExpressionData[]> {
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
      
      
    // Fetch ALL data for this gene (don't filter at database level)
    const data = await this.fetchGeneData([dbGeneId]).toPromise();

    console.log('Raw data from database:', data);
    console.log('Number of rows fetched:', data?.length);

    // Process and filter data
    const filteredData = await this.processGeneData(data || [], filters);

    
    
    return filteredData;
  }
}