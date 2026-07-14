import { Component } from '@angular/core';

type SpatialViewMode = 'gene' | 'cellType';

interface SpatialSpot {
  id: string;
  x: number;
  y: number;
  value: number;
  barcode: string;
}

interface SpatialSample {
  id: string;
  label: string;
  surgery: 'MI' | 'Sham';
  timepoint: '3 dpi' | '7 dpi';
  replicate: string;
  accession: string;
}

@Component({
  selector: 'app-spatial',
  templateUrl: './spatial.component.html',
  styleUrl: './spatial.component.css',
  standalone: false
})
export class SpatialComponent {
  readonly datasets = ['Cui et al. 2021'];
  readonly surgeries = ['MI', 'Sham'];
  readonly timepoints = ['3 dpi', '7 dpi'];
  readonly genes = ['Acta2', 'Nfe2l1', 'Mki67', 'Tnnt2', 'Col1a1', 'Hmox1'];
  readonly cellTypes = [
    'Cardiomyocytes',
    'Fibroblasts',
    'Immune cells',
    'Endothelial cells',
    'Endocardial cells',
    'Epicardial cells',
    'CM1',
    'CM4',
    'CM5'
  ];

  readonly samples: SpatialSample[] = [
    { id: 'sham-3', label: 'P1 Sham · 3 dpi', surgery: 'Sham', timepoint: '3 dpi', replicate: 'Replicate 1', accession: 'GSM5268644' },
    { id: 'sham-7', label: 'P1 Sham · 7 dpi', surgery: 'Sham', timepoint: '7 dpi', replicate: 'Replicate 1', accession: 'GSM5268645' },
    { id: 'mi-3', label: 'P1 MI · 3 dpi', surgery: 'MI', timepoint: '3 dpi', replicate: 'Replicate 1', accession: 'GSM5268646' },
    { id: 'mi-7-r1', label: 'P1 MI · 7 dpi', surgery: 'MI', timepoint: '7 dpi', replicate: 'Replicate 1', accession: 'GSM4983123' },
    { id: 'mi-7-r2', label: 'P1 MI · 7 dpi', surgery: 'MI', timepoint: '7 dpi', replicate: 'Replicate 2', accession: 'GSM5268647' }
  ];

  selectedDataset = this.datasets[0];
  selectedSurgery = 'MI';
  selectedTimepoint = '3 dpi';
  selectedReplicate = 'Replicate 1';
  viewMode: SpatialViewMode = 'gene';
  selectedGene = 'Acta2';
  selectedCellType = 'Fibroblasts';
  comparisonMode = false;
  showHistology = true;
  showSpots = true;
  lockColorScale = true;
  spotOpacity = 78;
  spotSize = 12;
  zoom = 100;
  selectedSpot: SpatialSpot | null = null;

  readonly previewSpots = this.createPreviewSpots();

  get activeSample(): SpatialSample {
    return this.samples.find(sample =>
      sample.surgery === this.selectedSurgery &&
      sample.timepoint === this.selectedTimepoint &&
      sample.replicate === this.selectedReplicate
    ) ?? this.samples.find(sample =>
      sample.surgery === this.selectedSurgery && sample.timepoint === this.selectedTimepoint
    ) ?? this.samples[0];
  }

  get availableReplicates(): string[] {
    return [...new Set(this.samples
      .filter(sample => sample.surgery === this.selectedSurgery && sample.timepoint === this.selectedTimepoint)
      .map(sample => sample.replicate))];
  }

  get displayedFeature(): string {
    return this.viewMode === 'gene' ? this.selectedGene : this.selectedCellType;
  }

  get comparisonSample(): SpatialSample {
    return this.samples.find(sample =>
      sample.surgery !== this.selectedSurgery &&
      sample.timepoint === this.selectedTimepoint
    ) ?? this.samples[0];
  }

  get visibleSamples(): SpatialSample[] {
    return this.comparisonMode ? [this.activeSample, this.comparisonSample] : [this.activeSample];
  }

  setViewMode(mode: SpatialViewMode): void {
    this.viewMode = mode;
    this.selectedSpot = null;
  }

  onConditionChange(): void {
    if (!this.availableReplicates.includes(this.selectedReplicate)) {
      this.selectedReplicate = this.availableReplicates[0] ?? 'Replicate 1';
    }
    this.selectedSpot = null;
  }

  selectSpot(spot: SpatialSpot): void {
    this.selectedSpot = spot;
  }

  zoomIn(): void {
    this.zoom = Math.min(160, this.zoom + 10);
  }

  zoomOut(): void {
    this.zoom = Math.max(70, this.zoom - 10);
  }

  resetViewer(): void {
    this.zoom = 100;
    this.selectedSpot = null;
  }

  spotValue(spot: SpatialSpot, sample: SpatialSample): number {
    const conditionOffset = sample.surgery === 'MI' ? 0.16 : -0.08;
    const timeOffset = sample.timepoint === '7 dpi' ? 0.08 : 0;
    const modeOffset = this.viewMode === 'cellType' ? -0.06 : 0;
    return Math.max(0, Math.min(1, spot.value + conditionOffset + timeOffset + modeOffset));
  }

  spotColor(value: number): string {
    const lightness = 93 - value * 53;
    const saturation = 58 + value * 24;
    return `hsl(331 ${saturation}% ${lightness}%)`;
  }

  trackSpot(_: number, spot: SpatialSpot): string {
    return spot.id;
  }

  private createPreviewSpots(): SpatialSpot[] {
    const spots: SpatialSpot[] = [];
    let index = 0;

    for (let row = 0; row < 12; row++) {
      const y = 15 + row * 6.1;
      const normalizedY = row / 11;
      const halfWidth = row < 3
        ? 16 + row * 3.8
        : 27 - normalizedY * 9;
      const centerX = 50 + normalizedY * 2;

      for (let column = -5; column <= 5; column++) {
        const x = centerX + column * 5.1 + (row % 2 ? 2.55 : 0);
        if (Math.abs(x - centerX) > halfWidth) continue;
        if (row < 2 && Math.abs(column) < 2) continue;

        const injurySignal = Math.max(0, 1 - Math.hypot(x - 38, y - 70) / 34);
        const wave = (Math.sin(index * 1.7) + 1) / 2;
        const value = Math.min(1, 0.14 + injurySignal * 0.62 + wave * 0.22);

        spots.push({
          id: `spot-${index}`,
          x,
          y,
          value,
          barcode: `AA${String(index + 1).padStart(4, '0')}`
        });
        index++;
      }
    }

    return spots;
  }

}
