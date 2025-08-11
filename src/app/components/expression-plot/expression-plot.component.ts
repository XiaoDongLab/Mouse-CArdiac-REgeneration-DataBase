// expression-plot.component.ts
import { Component, Input, OnChanges } from '@angular/core';
import { format } from 'd3-format';

@Component({
  selector: 'app-expression-plot',
  templateUrl: './expression-plot.component.html'
})
export class ExpressionPlotComponent implements OnChanges {
  @Input() data: any;
  @Input() logScale = true;
  @Input() showPoints = true;
  @Input() showBox = true;
  @Input() showBar = false;

  chartOptions: any;

  ngOnChanges() {
    this.generateChart();
  }

  private calculateBoxPlotStats(values: number[]) {
    if (!values.length) return [0, 0, 0, 0, 0];
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.quantile(sorted, 0.25);
    const median = this.quantile(sorted, 0.5);
    const q3 = this.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = Math.max(sorted[0], q1 - 1.5 * iqr);
    const upperFence = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
    return [lowerFence, q1, median, q3, upperFence];
  }

  private quantile(sorted: number[], q: number): number {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  }

  private calculateMeanAndStd(values: number[]) {
    if (!values.length) return { mean: 0, std: 0 };
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );
    return { mean, std };
  }

  generateChart() {
    const series = [];
    const conditions = ['MI', 'Sham'];

    // Box Plot Series
    if (this.showBox) {
      series.push(...conditions.map(condition => ({
        name: condition + ' Box',
        type: 'boxPlot',
        data: [{
          x: condition,
          y: this.calculateBoxPlotStats(
            this.logScale
              ? this.data.conditions[condition].map((v: number) => Math.log10(v + 1))
              : this.data.conditions[condition]
          )
        }]
      })));
    }

    // Scatter Points Series
    if (this.showPoints) {
      series.push(...conditions.map(condition => ({
        name: condition + ' Points',
        type: 'scatter',
        data: this.data.conditions[condition].map((val: number) => ({
          x: condition + (Math.random() - 0.5) * 0.1, // Jitter
          y: this.logScale ? Math.log10(val + 1) : val
        }))
      })));
    }

    // Bar Plot Series (for mean expression)
    if (this.showBar) {
      series.push({
        name: 'Mean Expression',
        type: 'bar',
        data: conditions.map(condition => {
          const { mean } = this.calculateMeanAndStd(
            this.logScale
              ? this.data.conditions[condition].map((v: number) => Math.log10(v + 1))
              : this.data.conditions[condition]
          );
          return { x: condition, y: mean };
        })
      });
    }

    this.chartOptions = {
      series,
      chart: {
        type: this.showBar ? 'bar' : 'boxPlot',
        height: 350,
        toolbar: { show: true },
        zoom: { enabled: true }
      },
      plotOptions: {
        boxPlot: {
          colors: {
            upper: '#00E396', // Green for Sham
            lower: '#FF4560'  // Red for MI
          }
        },
        bar: {
          horizontal: false,
          dataLabels: { position: 'top' }
        }
      },
      stroke: {
        width: this.showBox ? [2, 0, 2] : [0, 0, 2] // Adjust for box/scatter/bar
      },
      fill: {
        opacity: this.showBox ? [0.8, 0.2, 1] : [0, 0.2, 1]
      },
      xaxis: {
        type: 'category',
        categories: conditions,
        title: { text: 'Condition' }
      },
      yaxis: {
        title: { text: this.logScale ? 'Log10(Expression + 1)' : 'Expression Level' },
        labels: { formatter: (val: number) => format('.2f')(val) }
      },
      tooltip: {
        shared: false,
        custom: ({ seriesIndex, dataPointIndex, w }: any) => {
          const value = w.globals.series[seriesIndex][dataPointIndex];
          const condition = w.globals.labels[dataPointIndex];
          return `<div class="apexcharts-tooltip-box">
                    <div>Condition: ${condition}</div>
                    <div>Value: ${format('.2f')(value)}</div>
                  </div>`;
        }
      },
      title: {
        text: `Expression of ${this.data.geneSymbol} in ${this.data.cellType}`,
        align: 'left'
      }
    };
  }
}