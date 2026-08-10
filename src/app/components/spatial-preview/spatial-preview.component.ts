import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, QueryList, SimpleChanges, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, forkJoin, switchMap } from 'rxjs';

import {
  SpatialLayerResponse,
  SpatialSample,
  SpatialService,
  SpatialSpot,
  SpatialSurgery,
  formatSpatialTimepoint
} from '../../services/spatial.service';
import { SpatialClusterFit, calculateSpatialClusterFit } from '../spatial/spatial-fit';

type PreviewLayerType = 'gene' | 'cellType';
type PreviewExpressionScale = 'log' | 'linear';

interface PreviewPanel {
  type: PreviewLayerType;
  feature: string;
  layer: SpatialLayerResponse;
}

@Component({
  selector: 'app-spatial-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './spatial-preview.component.html',
  styleUrl: './spatial-preview.component.css'
})
export class SpatialPreviewComponent implements OnInit, OnChanges, OnDestroy {
  readonly formatTimepoint = formatSpatialTimepoint;
  readonly timepoints: SpatialSample['timepoint'][] = ['3 dpi', '7 dpi'];
  private readonly expressionColorStops = ['#f7f4f9', '#9e9ac8', '#3f007d'];
  private readonly proportionColorStops = ['#f7fcfd', '#41b6c4', '#00441b'];
  @Input({ required: true }) gene = '';
  @Input({ required: true }) cellType = '';
  @Input({ required: true }) surgery: SpatialSurgery = 'MI';
  @Input() timepoint: SpatialSample['timepoint'] = '3 dpi';
  @Input() sourcePsd: number | null = null;
  @Input() allowConditionSwitch = false;

  sample: SpatialSample | null = null;
  panels: PreviewPanel[] = [];
  loading = true;
  loadError = false;
  selectedSpotId: number | null = null;
  zoom = 100;
  panX = 0;
  panY = 0;
  isPanning = false;
  activeSurgery: SpatialSurgery = 'MI';
  activeTimepoint: SpatialSample['timepoint'] = '3 dpi';
  showHistology = true;
  showSpots = true;
  spotOpacity = 80;
  spotSize = 9;
  expressionScale: PreviewExpressionScale = 'log';

  @ViewChildren('previewViewport') private previewViewports?: QueryList<ElementRef<HTMLElement>>;

  private initialized = false;
  private loadSubscription?: Subscription;
  private activePointerId: number | null = null;
  private startPointerX = 0;
  private startPointerY = 0;
  private startPanX = 0;
  private startPanY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private contentWidth = 0;
  private contentHeight = 0;
  private fitTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly spatialService: SpatialService) {}

  ngOnInit(): void {
    this.activeSurgery = this.surgery;
    this.activeTimepoint = this.timepoint;
    this.initialized = true;
    this.loadLayers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['surgery']) this.activeSurgery = this.surgery;
    if (changes['timepoint']) this.activeTimepoint = this.timepoint;
    if (changes['gene'] || changes['cellType'] || changes['surgery'] || changes['timepoint']) {
      this.loadLayers();
    }
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
    if (this.fitTimer) clearTimeout(this.fitTimer);
  }

  zoomIn(): void {
    this.zoom = Math.min(250, this.zoom + 25);
    this.clampPan();
  }

  zoomOut(): void {
    this.zoom = Math.max(75, this.zoom - 25);
    this.clampPan();
  }

  resetViewer(): void {
    this.zoom = 100;
    this.panX = 0;
    this.panY = 0;
  }

  setSurgery(surgery: SpatialSurgery): void {
    if (this.activeSurgery === surgery) return;
    this.activeSurgery = surgery;
    this.loadLayers();
  }

  setTimepoint(timepoint: SpatialSample['timepoint']): void {
    if (this.activeTimepoint === timepoint) return;
    this.activeTimepoint = timepoint;
    this.loadLayers();
  }

  setExpressionScale(scale: PreviewExpressionScale): void {
    this.expressionScale = scale;
  }

  get showPsd1Notice(): boolean {
    return Number(this.sourcePsd) === 1;
  }

  selectSpot(spot: SpatialSpot): void {
    this.selectedSpotId = spot.spotId;
  }

  isSelected(spot: SpatialSpot): boolean {
    return this.selectedSpotId === spot.spotId;
  }

  beginPan(event: PointerEvent): void {
    if (event.button !== 0 || this.zoom <= 100) return;
    if ((event.target as HTMLElement).closest('.preview-spot')) return;

    const viewport = event.currentTarget as HTMLElement;
    const content = viewport.querySelector<HTMLElement>('.preview-tissue');
    if (!content) return;

    this.activePointerId = event.pointerId;
    this.startPointerX = event.clientX;
    this.startPointerY = event.clientY;
    this.startPanX = this.panX;
    this.startPanY = this.panY;
    this.viewportWidth = viewport.clientWidth;
    this.viewportHeight = viewport.clientHeight;
    this.contentWidth = content.offsetWidth;
    this.contentHeight = content.offsetHeight;
    this.isPanning = true;
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  movePan(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.panX = this.startPanX + event.clientX - this.startPointerX;
    this.panY = this.startPanY + event.clientY - this.startPointerY;
    this.clampPan();
    event.preventDefault();
  }

  endPan(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    const viewport = event.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    this.activePointerId = null;
    this.isPanning = false;
  }

  tissueTransform(): string {
    const flip = this.sample?.flipHorizontal ? -1 : 1;
    return `translate3d(calc(-50% + ${this.panX}px), calc(-50% + ${this.panY}px), 0) scale(${this.zoom / 100}) scaleX(${flip})`;
  }

  spotColor(spot: SpatialSpot, panel: PreviewPanel): string {
    const normalized = Math.max(0, Math.min(1, this.spotDisplayValue(spot, panel) / this.maximum(panel)));
    if (panel.type === 'cellType') {
      return this.colorFromStops(normalized, this.proportionColorStops);
    }
    return this.colorFromStops(normalized, this.expressionColorStops);
  }

  maximum(panel: PreviewPanel): number {
    const maximum = this.rawMaximum(panel);
    if (panel.type !== 'gene' || this.expressionScale === 'log') return maximum;
    return /log1p/i.test(panel.layer.feature.normalization) ? Math.expm1(maximum) : maximum;
  }

  spotDisplayValue(spot: SpatialSpot, panel: PreviewPanel): number {
    if (panel.type !== 'gene' || this.expressionScale === 'log') return spot.value;
    return /log1p/i.test(panel.layer.feature.normalization) ? Math.expm1(spot.value) : spot.value;
  }

  private rawMaximum(panel: PreviewPanel): number {
    const supplied = Number(panel.layer.max);
    if (Number.isFinite(supplied) && supplied > 0) return supplied;
    return Math.max(0, ...panel.layer.spots.map(spot => spot.value)) || 1;
  }

  formatValue(value: number): string {
    return value > 0 && value < 0.01 ? value.toPrecision(2) : value.toFixed(2);
  }

  trackSpot(_: number, spot: SpatialSpot): number {
    return spot.spotId;
  }

  calculateClusterFit(spots: SpatialSpot[]): SpatialClusterFit {
    return calculateSpatialClusterFit(spots);
  }

  loadLayers(): void {
    const gene = this.gene.trim();
    const cellType = this.cellType.trim();
    if (!gene || !cellType) return;

    this.loadSubscription?.unsubscribe();
    this.loading = true;
    this.loadError = false;
    this.panels = [];
    this.selectedSpotId = null;
    this.resetViewer();

    this.loadSubscription = this.spatialService.getSamples().pipe(
      switchMap(samples => {
        const sample = samples.find(candidate =>
          candidate.surgery === this.activeSurgery && candidate.timepoint === this.activeTimepoint
        );
        if (!sample) throw new Error('No matching spatial sample');
        this.sample = sample;
        return forkJoin({
          gene: this.spatialService.getGeneLayer(sample.accession, gene),
          cellType: this.spatialService.getCellTypeLayer(sample.accession, cellType)
        });
      })
    ).subscribe({
      next: layers => {
        this.panels = [
          { type: 'gene', feature: gene, layer: layers.gene },
          { type: 'cellType', feature: cellType, layer: layers.cellType }
        ];
        this.loading = false;
        this.scheduleClusterFit();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  private scheduleClusterFit(): void {
    if (this.fitTimer) clearTimeout(this.fitTimer);
    this.fitTimer = setTimeout(() => {
      const viewport = this.previewViewports?.first?.nativeElement;
      const spots = this.panels[0]?.layer.spots ?? [];
      if (!viewport || !spots.length) return;

      const fit = this.calculateClusterFit(spots);
      const visualCenterX = this.sample?.flipHorizontal ? 1 - fit.centerX : fit.centerX;
      const scale = fit.zoom / 100;
      this.viewportWidth = viewport.clientWidth;
      this.viewportHeight = viewport.clientHeight;
      this.contentWidth = viewport.clientWidth;
      this.contentHeight = viewport.clientHeight;
      this.zoom = fit.zoom;
      this.panX = -(visualCenterX - .5) * this.contentWidth * scale;
      this.panY = -(fit.centerY - .5) * this.contentHeight * scale;
      this.clampPan();
    });
  }

  private clampPan(): void {
    const scale = this.zoom / 100;
    const maxX = Math.max(0, (this.contentWidth * scale - this.viewportWidth) / 2);
    const maxY = Math.max(0, (this.contentHeight * scale - this.viewportHeight) / 2);
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
  }

  private colorFromStops(value: number, stops: string[]): string {
    const normalized = Math.max(0, Math.min(1, value));
    const scaled = normalized * (stops.length - 1);
    const index = Math.min(Math.floor(scaled), stops.length - 2);
    const fraction = scaled - index;
    const start = this.hexToRgb(stops[index]);
    const end = this.hexToRgb(stops[index + 1]);
    const channel = (from: number, to: number) => Math.round(from + (to - from) * fraction);
    return `rgb(${channel(start[0], end[0])}, ${channel(start[1], end[1])}, ${channel(start[2], end[2])})`;
  }

  private hexToRgb(color: string): [number, number, number] {
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16)
    ];
  }
}
