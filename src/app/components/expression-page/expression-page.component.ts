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
  ChartComponent,
  ApexTheme,
  ApexStroke,
} from "ng-apexcharts";
import { TranslateService } from '@ngx-translate/core';

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
  stroke: ApexStroke;
  fill?: ApexFill;
  theme: ApexTheme;
};

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
  selectedNatalStatus = 'All';
  cellTypes: string[] = [];
  surgeries: string[] = ['All', 'MI', 'Sham'];
  natalStatuses: string[] = ['All', 'P1', 'P8', 'P2'];
  logScale = true;
  colorPreference: number = localStorage["colorPreference"] ?? 0;
  // recentGenes: string[] = [];
  recentGenes: Queue<string> = new Queue<string>();
  private subscriptions: Subscription[] = [];
  splitByTime: boolean = true;
  @ViewChild('chartObj') chart!: ChartComponent; // Reference to the apx-chart component
  randomColors: string[] = []; // Upper quartile
  randomColorsBottom: string[] = []; // Lower quartile
  originSeries: ApexAxisChartSeries;
  xAxisColumns: boolean[] = [true, true, true, true, true, true, true, true, true, true]
  xAxisCategories: string[] = this.splitByTime ? ['P1_MI_PSD1', 'P1_MI_PSD3', 'P1_Sham_PSD1', 'P1_Sham_PSD3', 'P2_MI_PSD3', 'P2_Sham_PSD3', 'P8_MI_PSD1', 'P8_MI_PSD3', 'P8_Sham_PSD1', 'P8_Sham_PSD3'] : ['P1_MI', 'P1_Sham', 'P2_MI', 'P2_Sham', 'P8_MI', 'P8_Sham']
  chartOptions: ChartOptions = {
    series: [],
    chart: {
      height: 800,
      type: 'boxPlot',
      toolbar: { show: true },
      zoom: { enabled: false },
      background: 'transparent',
      fontFamily: 'var(--bs-body-font-family)'
    },
    stroke: {
      colors: this.randomColors,
    },
    theme: {
      mode: this.getColorTheme() ? 'dark' : 'light',
    },
    dataLabels: { enabled: false },
    plotOptions: {
      boxPlot: {
        colors: {
          upper: this.randomColors,
          lower: this.randomColorsBottom
        }
      }
    },
    xaxis: {
      type: 'category',
      categories: [],
      title: { text: 'Genes' },
      labels: {
        rotate: -45,
        offsetY: 16,
        style: {
          fontSize: '.75rem',
          fontFamily: 'var(--bs-body-font-family)'
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
      style: { fontSize: '16px', fontFamily: 'var(--bs-body-font-family)' }
    },
    fill: {
      type: 'solid',
      opacity: 1
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

          // Format is: "GeneName (optional filter info) (ConditionName)"
          const lastParenIndex = fullLabel.lastIndexOf('(');
          const genePart = fullLabel.substring(0, lastParenIndex).trim();
          const conditionPart = fullLabel.substring(lastParenIndex + 1, fullLabel.length - 1);

          // Get display name for condition
          const conditionDisplayName = this.conditionDisplayNames[conditionPart] || conditionPart;

          return `
          
            <span style="margin-bottom: 4px;">Gene: <strong>${genePart}</strong></span>
            <span style="margin-bottom: 4px;">Condition: <strong>${conditionDisplayName}</strong></span>
            <span style="margin-bottom: 2px;">Max: <strong>${data.y[4]?.toFixed(2)}</strong></span>
            <span style="margin-bottom: 2px;">Q3: <strong>${data.y[3]?.toFixed(2)}</strong></span>
            <span style="margin-bottom: 2px;">Median: <strong>${data.y[2]?.toFixed(2)}</strong></span>
            <span style="margin-bottom: 2px;">Q1: <strong>${data.y[1]?.toFixed(2)}</strong></span>
            <span>Min: <strong>${data.y[0]?.toFixed(2)}</strong></span>]
        `;
        } catch (error) {
          console.error('Tooltip error:', error);
          return `<span>Error displaying tooltip</span>`;
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
    // this.updateChart();
  }

  // rgb转hsl，返回 [h, s, l]
  rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) h = s = 0;
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h! /= 6;
    }
    return [h, s, l];
  }

  // hsl转rgb，h,s,l在0-1之间，返回 [r, g, b]
  hslToRgb(h: number, s: number, l: number) {
    let r, g, b;

    if (s === 0) r = g = b = l; // achromatic
    else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // 主函数：输入 rgb字符串，输出微调后的rgb字符串
  tweakRgbColor(rgbStr: string) {
    // 解析rgb字符串 "rgb(r, g, b)"
    const m = rgbStr.match(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/);
    if (!m) {
      console.warn('颜色格式错误，必须是 rgb(r, g, b)');
      return rgbStr;
    }
    let [_, r, g, b] = m;

    let [h, s, l] = this.rgbToHsl(Number(r), Number(g), Number(b));

    // 微调亮度，随机+/-10%范围
    const delta = 0.1;
    l = Math.min(1, Math.max(0, l! + (Math.random() * 2 - 1) * delta));

    const [nr, ng, nb] = this.hslToRgb(h!, s!, l!);
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  // Helper function to calculate box plot statistics
  private calculateBoxPlotStats(values: number[]): number[] {
    if (!values || values.length === 0) return [-1, -1, -1, -1, -1];

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
    'Sham': 'Sham',
  };

  constructor(
    private databaseService: DatabaseService,
    private databaseConstService: DatabaseConstsService,
    private geneConversionService: GeneConversionService,
    private cdr: ChangeDetectorRef, // Add ChangeDetectorRef
    public translateService: TranslateService
  ) { }

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

  async loadExpression(gene: string = this.searchInput.trim()) {
    if (!gene) {
      alert(this.translateService.instant("expression.popup.invalid_gene"));
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


      const filteredData = await this.convertAndProcessGene(gene, currentFilters);
      if (filteredData.length === 0) {
        alert(this.translateService.instant("expression.popup.nodata"));
      } else {
        this.finishDataProcessing(filteredData, gene);
      }
    } catch (error) {
      console.error('Error loading expression:', error);
      alert(this.translateService.instant("expression.popup.failed"));
    } finally {
      this.loading = false;
      this.searchInput = ''; // Clear search input after adding
    }
  }

  private finishDataProcessing(filteredData: GeneExpressionData[], gene = this.searchInput) {

    // For each gene, set displayName to geneSymbol if not already set
    filteredData.forEach(data => {
      if (!data.displayName) {
        data.displayName = data.geneSymbol || data.ensemblId;
      }
    });

    // this.expressionData.push(...filteredData);
    filteredData.forEach(item => {
      if (!this.expressionData.includes(item)) {
        this.expressionData.push(item);
      }
    })
    this.updateRecentGenes(gene);
    this.updateChart();
  }

  private updateRecentGenes(gene: string) {
    if (!this.recentGenes.elements.includes(gene) && gene) {
      this.recentGenes.enqueue(gene);
    }
    if (this.recentGenes.length > 5) {
      this.recentGenes.dequeue();
    }
    this.saveRecentGenes();
  }

  updateChart() {
    // console.log('=== updateChart called ===');
    // console.log('Current expressionData length:', this.expressionData.length);
    // console.log('Current filters:', {
    //   selectedSurgery: this.selectedSurgery,
    //   selectedNatalStatus: this.selectedNatalStatus,
    //   selectedCellType: this.selectedCellType
    // });
    this.xAxisCategories = this.splitByTime ? ['P1_MI_PSD1', 'P1_MI_PSD3', 'P1_Sham_PSD1', 'P1_Sham_PSD3', 'P2_MI_PSD3', 'P2_Sham_PSD3', 'P8_MI_PSD1', 'P8_MI_PSD3', 'P8_Sham_PSD1', 'P8_Sham_PSD3'] : ['P1_MI', 'P1_Sham', 'P2_MI', 'P2_Sham', 'P8_MI', 'P8_Sham']
    let availableConditions: string[];
    // For each gene, determine which conditions should be shown based on its individual filter criteria
    const getConditionsForGene = (geneData: any) => {
      availableConditions = Object.keys(geneData.conditions).filter(condition => {
        const values = geneData.conditions[condition];
        return values && values.length > 0;
        // return values;
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

    // console.log('Expression data available:', this.expressionData);
    // console.log('Split by time:', this.splitByTime);

    // Create flat series (one series, many data points)
    // const series: ApexAxisChartSeries = [{
    //   name: 'Expression',
    //   type: 'boxPlot',
    //   data: this.expressionData.flatMap(data => {
    //     const filters = data.filterCriteria;
    //     const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
    //     const geneName = filterText ? `${data.geneSymbol || data.ensemblId} (${filterText})` : data.geneSymbol || data.ensemblId;

    //     // Get conditions specific to this gene based on its own data and splitByTime preference
    //     const geneConditions = getConditionsForGene(data);
    //     console.log(`Conditions for ${geneName}:`, geneConditions);

    //     return geneConditions.map(condition => {
    //       let values;
    //       if (this.splitByTime) {
    //         // Use original condition data
    //         values = data.conditions[condition];
    //       } else {
    //         // Use merged values from PSD1 and PSD3
    //         values = getMergedValues(data, condition);
    //       }

    //       const transformedValues = this.logScale
    //         ? values.map((v: number) => (v > 0 ? Math.log10(v + 1) : 0))
    //         : values;
    //       const boxStats = this.calculateBoxPlotStats(transformedValues);

    //       console.log(`Box stats for ${geneName} (${condition}):`, boxStats);

    //       return {
    //         x: `${geneName} (${this.conditionDisplayNames[condition] || condition})`,
    //         y: boxStats
    //       };
    //     });
    //   })
    // }];

    const pre_series: ApexAxisChartSeries = this.expressionData.map(data => {
      const filters = data.filterCriteria;
      const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
      const geneName = filterText
        ? `${data.geneSymbol || data.ensemblId} (${filterText})`
        : data.geneSymbol || data.ensemblId;

      // 针对当前基因拿 conditions
      const geneConditions = getConditionsForGene(data);
      // console.log(`Conditions for ${geneName}:`, geneConditions);

      const points = geneConditions.map(condition => {
        let values;
        if (this.splitByTime) {
          values = data.conditions[condition];
        } else {
          values = getMergedValues(data, condition);
        }

        const transformedValues = this.logScale
          ? values.map((v: number) => (v > 0 ? Math.log10(v + 1) : 0))
          : values;
        const boxStats = this.calculateBoxPlotStats(transformedValues);

        // console.log(`Box stats for ${geneName} (${condition}):`, boxStats);

        return {
          x: this.conditionDisplayNames[condition] || condition, // 横轴只保留 condition 名字
          y: boxStats
        };
      });

      return {
        name: geneName,
        type: 'boxPlot',
        data: points
      };
    });


    const categories = this.splitByTime ? ['P1_MI_PSD1', 'P1_MI_PSD3', 'P1_Sham_PSD1', 'P1_Sham_PSD3', 'P2_MI_PSD3', 'P2_Sham_PSD3', 'P8_MI_PSD1', 'P8_MI_PSD3', 'P8_Sham_PSD1', 'P8_Sham_PSD3'] : ['P1_MI', 'P1_Sham', 'P2_MI', 'P2_Sham', 'P8_MI', 'P8_Sham'];

    // 给每个 series 补齐数据
    function fillMissingPoints(series: any[], categories: any[]) {
      return series.map(serie => {
        // 先做成 map，方便查找
        const dataMap = new Map(serie.data.map((d: any) => [d.x, d.y]));
        const filledData = categories.map(cat => {
          return {
            x: cat,
            y: dataMap.has(cat) ? dataMap.get(cat) : [-1, -1, -1, -1, -1]  // 或者 y: [null, null, null, null, null]
          };
        });
        return {
          ...serie,
          data: filledData
        };
      });
    }

    const series = fillMissingPoints(pre_series, categories);
    // console.log(series)


    // let flatCategories = Array.from(new Set(this.expressionData.flatMap(data => {
    //   const filters = data.filterCriteria;
    //   const filterText = `${filters.cellType !== 'All Cells' ? filters.cellType : ''} ${filters.natalStatus !== 'All' ? filters.natalStatus : ''}`.trim();
    //   const geneName = filterText ? `${data.geneSymbol || data.ensemblId} (${filterText})` : data.geneSymbol || data.ensemblId;

    //   // Get conditions specific to this gene
    //   const geneConditions = getConditionsForGene(data);

    //   return geneConditions.map(condition => this.conditionDisplayNames[condition] || condition);
    // })));

    // console.log(flatCategories)

    const conditionDisplayNames = this.conditionDisplayNames;
    this.randomColors.push(this.getRandomColor());
    this.randomColorsBottom = [...this.randomColors].map(color => this.tweakRgbColor(color));
    let colors = this.randomColors;
    console.log(this.randomColors);
    console.log(this.randomColorsBottom)
    const translatedLabel = this.translateService.instant("expression.nodata");
    // Define new options for update
    const logScale = this.logScale;
    const newOptions: Partial<ChartOptions> = {
      series,
      tooltip: {
        enabled: true,
        custom: function (opts) {
          // console.log('Tooltip opts:', opts); // Debug log

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

            let label = `
              <small class="text-muted">Condition</small>
              <h5 class="mb-0">${categories[dataPointIndex]}</h5>`;

            // const conditionDisplayName = conditionDisplayNames[conditionPart] || conditionPart;

            // console.log(w.config.series);
            // Safe access to box plot data with fallbacks
            w.config.series.forEach((element: any, i: number) => {
              // console.log(`datapointindex: ${dataPointIndex}`);
              // console.log(element.data);
              if (dataPointIndex < element.data.length) {
                let boxData = element.data[dataPointIndex].y;
                const min = boxData?.[0] ?? 'N/A';
                const q1 = boxData?.[1] ?? 'N/A';
                const median = boxData?.[2] ?? 'N/A';
                const q3 = boxData?.[3] ?? 'N/A';
                const max = boxData?.[4] ?? 'N/A';

                if (min == -1) {
                  let addLabel = `
                <hr />
                <div class="d-flex flex-row flex-nowrap gap-2 align-items-center">
                  <span class="badge" style="background-color: ${colors[i]} !important; width: 1rem; height: 1rem; border-radius: 50%">&nbsp;</span><h5 class="mb-0">${element.name}</h5></div>
                <span>${translatedLabel}</span>`;

                  label += addLabel;
                } else {
                  let addLabel = `
                <hr />
                <div class="d-flex flex-row flex-nowrap gap-2 align-items-center">
                  <span class="badge" style="background-color: ${colors[i]} !important; width: 1rem; height: 1rem; border-radius: 50%">&nbsp;</span><h5 class="mb-0">${element.name}</h5></div>
                <span>Max: <strong>${typeof max === 'number' ? max.toFixed(2) : max}</strong></span>
                <span>Q3: <strong>${typeof q3 === 'number' ? q3.toFixed(2) : q3}</strong></span>
                <span>Median: <strong>${typeof median === 'number' ? median.toFixed(2) : median}</strong></span>
                <span>Q1: <strong>${typeof q1 === 'number' ? q1.toFixed(2) : q1}</strong></span>
                <span>Min: <strong>${typeof min === 'number' ? min.toFixed(2) : min}</strong></span>
                `;

                  label += addLabel;
                }
              }
            });
            return label;
          } catch (error) {
            console.error('Tooltip error:', error);
            return `<span style="padding: 8px; background: #fee; border: 1px solid #fcc;">Error: ${error}</span>`;
          }
        }
      },
      chart: {
        ...this.chartOptions.chart,
        type: 'boxPlot',
        height: 800
      },
      xaxis: {
        title: { text: 'Conditions' },
        categories: ['P1_MI_PSD1', 'P1_MI_PSD3', 'P1_Sham_PSD1', 'P1_Sham_PSD3', 'P2_MI_PSD3', 'P2_Sham_PSD3', 'P8_MI_PSD1', 'P8_MI_PSD3', 'P8_Sham_PSD1', 'P8_Sham_PSD3'],
        labels: {
          rotate: -45,
          offsetY: 16,
          maxHeight: 150,
          style: {
            fontSize: '.75rem',
            fontWeight: '400'
          }
        }
      },
      yaxis: {
        ...this.chartOptions.yaxis,
        min: this.logScale ? 0.3 : 0,
        title: { text: this.logScale ? 'Log10(Expression + 1)' : 'Expression Level' },
        labels: {
          formatter: function (value: number) {
            return logScale ? value.toFixed(2) : Number(value).toFixed(1)
          },
        }
      },
      plotOptions: {
        ...this.chartOptions.plotOptions,
        bar: {
          columnWidth: '90%'
        }
      },
      stroke: {
        colors: this.randomColors,
      },
      legend: {
        ...this.chartOptions.legend,
        show: false
      }
    };

    // console.log(newOptions);
    // console.log(series)

    // Update the chart
    this.originSeries = series;
    if (this.chart) {
      try {
        // console.log('Attempting to update chart with series:', series);
        // Reset chart to clear previous state
        this.chartOptions.series = [];
        this.cdr.detectChanges();
        // console.log('Chart bindings reset');

        // Update series and options
        this.chart.updateSeries(series, false);
        this.chart.updateOptions(newOptions, true, true);
        // console.log('Chart update completed');
        // console.log('Updated chart options:', JSON.stringify(this.chartOptions, null, 2));


      } catch (error) {
        console.error('Error updating chart:', error);
      }
    } else {
      console.warn('Chart component not initialized');
    }

    this.chartOptions = { ...this.chartOptions, ...newOptions };
    this.removeColumns();
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
    console.log(saved)
    if (saved) {
      /* 
       * localStorage can only store strings!!!
       */
      JSON.parse(saved).list.forEach((element: string) => {
        this.recentGenes.enqueue(element);
      });
      console.debug('[ExpressionPageComponent] loadRecentGenes: Loaded recent genes:', this.recentGenes);
    }
  }

  private fetchGeneData(genes: string[]): Observable<DiffExp[]> {
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
        // filteredRows = filteredRows.filter(row => row.cell_type === filters.cellType);
        filteredRows = filteredRows.filter(row => row.cell_type?.includes(filters.cellType));
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
      // console.log(`[processGeneData] ${geneSymbol} conditions data:`, conditionsData);

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

    // console.log('Raw data from database:', data);
    // console.log('Number of rows fetched:', data?.length);

    // Process and filter data
    const filteredData = await this.processGeneData(data || [], filters);



    return filteredData;
  }

  getColorTheme(): boolean {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (prefersDark && this.colorPreference == 0 || this.colorPreference == 2);
  }

  removeAllGenes() {
    this.expressionData = [];
    this.updateChart();
  }

  getRandomColor(): string {
    // let color = Math.floor(Math.random() * 16777216).toString(16);
    // color = '#000000'.slice(0, -color.length) + color;
    // return color;
    let color = "rgb(";
    for (var i = 0; i < 3; i++) {
      color += Math.floor(Math.random() * 255);
      color += ","
    }
    return color.slice(0, -1) + ")"
  }

  removeColumns(): void {
    console.log(this.originSeries)
    let categories = this.splitByTime ? ['P1_MI_PSD1', 'P1_MI_PSD3', 'P1_Sham_PSD1', 'P1_Sham_PSD3', 'P2_MI_PSD3', 'P2_Sham_PSD3', 'P8_MI_PSD1', 'P8_MI_PSD3', 'P8_Sham_PSD1', 'P8_Sham_PSD3'] : ['P1_MI', 'P1_Sham', 'P2_MI', 'P2_Sham', 'P8_MI', 'P8_Sham']
    let series: ApexAxisChartSeries = this.originSeries;
    this.xAxisColumns.forEach((column, i) => {
      if (!column) {
        series = series.map(serie => ({
          ...serie,
          data: (serie.data as { x: any; y: any; }[]).map(d => {
            if (typeof d === 'object' && d !== null && 'x' in d && d.x === categories[i]) {
              return {
                ...d,
                y: [-1, -1, -1, -1, -1]  // Replace empty sets. Do not remove!!!
                // Apexcharts only accepts series with the SAME x-axis labels
              };
            }
            return d;
          })
        }));

        console.log(series);
      }
    });

    this.chartOptions = { ...this.chartOptions, series: series }
  }
}

export class Queue<T> {
  private list: T[] = [];
  enqueue(element: T) {
    this.list.push(element);
  }
  dequeue() {
    return this.list.shift();
  }
  get length() {
    return this.list.length;
  }

  get elements() {
    return this.list
  }
}