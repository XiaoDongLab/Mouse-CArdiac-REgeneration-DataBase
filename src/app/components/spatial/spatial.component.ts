import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';

import {
  SpatialGene,
  SpatialLayerResponse,
  SpatialSample,
  SpatialService,
  SpatialSpot,
  SpatialSurgery
} from '../../services/spatial.service';

type SpatialViewMode = 'gene' | 'cellType';
type SpatialComparisonMode = 'none' | 'sample' | 'feature';

interface SpatialPanel {
  id: string;
  sample: SpatialSample;
  viewMode: SpatialViewMode;
  feature: string;
}

interface SelectedSpatialSpot {
  panel: SpatialPanel;
  spot: SpatialSpot;
}

interface SpatialLegend {
  id: string;
  label: string;
  viewMode: SpatialViewMode;
  maximum: number;
  normalization: string;
}

interface SelectedSpotMeasurement {
  panel: SpatialPanel;
  spot: SpatialSpot;
}

interface PanPosition {
  x: number;
  y: number;
}

interface PanBounds {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}

@Component({
  selector: 'app-spatial',
  templateUrl: './spatial.component.html',
  styleUrl: './spatial.component.css',
  standalone: false
})
export class SpatialComponent implements OnInit, OnDestroy {
  readonly datasets = ['Cui et al. 2021'];
  readonly surgeries: SpatialSurgery[] = ['MI', 'Sham'];
  readonly timepoints: SpatialSample['timepoint'][] = ['3 dpi', '7 dpi'];

  samples: SpatialSample[] = [];
  genes = ['Acta2', 'Nfe2l1', 'Mki67', 'Tnnt2', 'Col1a1', 'Hmox1'];
  cellTypes: string[] = [];

  selectedDataset = this.datasets[0];
  selectedSurgery: SpatialSurgery = 'MI';
  selectedTimepoint: SpatialSample['timepoint'] = '3 dpi';
  selectedReplicate = 1;
  viewMode: SpatialViewMode = 'gene';
  selectedGene = 'Acta2';
  selectedCellType = 'Fibroblasts';
  comparisonMode: SpatialComparisonMode = 'none';
  showHistology = true;
  showSpots = true;
  spotOpacity = 78;
  spotSize = 12;
  zoom = 100;
  panX = 0;
  panY = 0;
  isPanning = false;
  selectedSpot: SelectedSpatialSpot | null = null;
  loadingMetadata = true;
  loadingLayers = false;
  metadataError = false;
  layerError = false;
  geneNotFound = false;

  private readonly layers = new Map<string, SpatialLayerResponse>();
  private readonly geneSearch = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private layerRequestId = 0;
  private activePointerId: number | null = null;
  private panStartPointerX = 0;
  private panStartPointerY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private contentWidth = 0;
  private contentHeight = 0;
  private activePanKey: string | null = null;
  private readonly samplePanPositions = new Map<string, PanPosition>();
  private readonly panBounds = new Map<string, PanBounds>();

  constructor(private readonly spatialService: SpatialService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.geneSearch.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(query => query.trim().length >= 2
          ? this.spatialService.getGenes(query.trim()).pipe(catchError(() => of([])))
          : of([]))
      ).subscribe(genes => {
        this.genes = genes.map(gene => gene.symbol);
      })
    );

    this.subscriptions.add(
      forkJoin({
        samples: this.spatialService.getSamples(),
        cellTypes: this.spatialService.getCellTypes()
      }).subscribe({
        next: ({ samples, cellTypes }) => {
          this.samples = samples;
          this.cellTypes = cellTypes.aliases;
          this.loadingMetadata = false;
          this.metadataError = false;
          this.ensureValidSelection();
          this.loadVisibleLayers();
        },
        error: () => {
          this.loadingMetadata = false;
          this.metadataError = true;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get activeSample(): SpatialSample | null {
    return this.samples.find(sample =>
      sample.surgery === this.selectedSurgery &&
      sample.timepoint === this.selectedTimepoint &&
      sample.replicate === this.selectedReplicate
    ) ?? this.samples.find(sample =>
      sample.surgery === this.selectedSurgery && sample.timepoint === this.selectedTimepoint
    ) ?? this.samples[0] ?? null;
  }

  get availableReplicates(): number[] {
    return [...new Set(this.samples
      .filter(sample => sample.surgery === this.selectedSurgery && sample.timepoint === this.selectedTimepoint)
      .map(sample => sample.replicate))];
  }

  get displayedFeature(): string {
    return this.comparisonMode === 'feature'
      ? `${this.selectedGene} / ${this.selectedCellType}`
      : this.viewMode === 'gene' ? this.selectedGene : this.selectedCellType;
  }

  get comparisonSample(): SpatialSample | null {
    return this.samples.find(sample =>
      sample.surgery !== this.selectedSurgery && sample.timepoint === this.selectedTimepoint
    ) ?? null;
  }

  get visiblePanels(): SpatialPanel[] {
    const active = this.activeSample;
    if (!active) return [];

    if (this.comparisonMode === 'feature') {
      return [
        this.createPanel(active, 'gene', this.selectedGene),
        this.createPanel(active, 'cellType', this.selectedCellType)
      ];
    }

    const panels = [this.createPanel(active, this.viewMode, this.currentFeature())];
    const comparison = this.comparisonSample;
    if (this.comparisonMode === 'sample' && comparison) {
      panels.push(this.createPanel(comparison, this.viewMode, this.currentFeature()));
    }
    return panels;
  }

  get visibleSamples(): SpatialSample[] {
    return this.visiblePanels.map(panel => panel.sample);
  }

  get isComparing(): boolean {
    return this.comparisonMode !== 'none';
  }

  get visibleSpotCount(): number {
    return this.visiblePanels.reduce((total, panel) => total + this.spotsForPanel(panel).length, 0);
  }

  get legendMax(): number {
    return this.legendEntries[0]?.maximum ?? 1;
  }

  get normalizationLabel(): string {
    return this.legendEntries[0]?.normalization ?? '';
  }

  get legendEntries(): SpatialLegend[] {
    const panels = this.visiblePanels;
    const sharedMaximum = this.useSharedScale ? this.sharedMaximum() : null;
    return panels.map(panel => ({
      id: panel.id,
      label: panel.feature,
      viewMode: panel.viewMode,
      maximum: sharedMaximum ?? this.panelMaximum(panel),
      normalization: this.layerForPanel(panel)?.feature.normalization ?? ''
    }));
  }

  get useSharedScale(): boolean {
    return this.comparisonMode !== 'feature';
  }

  get selectedSpotMeasurements(): SelectedSpotMeasurement[] {
    if (!this.selectedSpot) return [];
    const selected = this.selectedSpot;
    return this.visiblePanels.flatMap(panel => {
      if (panel.sample.accession !== selected.panel.sample.accession) return [];
      const spot = this.spotsForPanel(panel).find(candidate =>
        candidate.spotId === selected.spot.spotId || candidate.barcode === selected.spot.barcode
      );
      return spot ? [{ panel, spot }] : [];
    });
  }

  setViewMode(mode: SpatialViewMode): void {
    if (this.viewMode === mode && this.comparisonMode !== 'feature') return;
    this.viewMode = mode;
    if (this.comparisonMode === 'feature') this.comparisonMode = 'none';
    this.clearSelectionAndLoad();
  }

  setComparisonMode(mode: Exclude<SpatialComparisonMode, 'none'>): void {
    this.comparisonMode = this.comparisonMode === mode ? 'none' : mode;
    this.resetPan();
    this.clearSelectionAndLoad();
  }

  toggleComparison(): void {
    this.setComparisonMode('sample');
  }

  onConditionChange(): void {
    this.ensureValidSelection();
    this.resetPan();
    this.clearSelectionAndLoad();
  }

  onGeneInput(gene: string): void {
    this.selectedGene = gene;
    this.geneNotFound = false;
    this.geneSearch.next(gene);
  }

  applyGene(): void {
    const query = this.selectedGene.trim();
    if (!query) return;

    const localMatch = this.genes.find(gene => gene.toLocaleLowerCase() === query.toLocaleLowerCase());
    if (localMatch) {
      this.commitGene(localMatch);
      return;
    }

    this.subscriptions.add(this.spatialService.getGenes(query, 100).subscribe({
      next: genes => {
        const match = genes.find(gene => gene.symbol.toLocaleLowerCase() === query.toLocaleLowerCase());
        if (match) {
          this.commitGene(match.symbol);
        } else {
          this.geneNotFound = true;
        }
      },
      error: () => {
        this.geneNotFound = true;
      }
    }));
  }

  onCellTypeChange(): void {
    this.clearSelectionAndLoad();
  }

  selectSpot(spot: SpatialSpot, panel: SpatialPanel): void {
    this.selectedSpot = { spot, panel };
  }

  isSpotSelected(spot: SpatialSpot, panel: SpatialPanel): boolean {
    return this.selectedSpot?.panel.sample.accession === panel.sample.accession &&
      (this.selectedSpot.spot.spotId === spot.spotId || this.selectedSpot.spot.barcode === spot.barcode);
  }

  zoomIn(): void {
    this.zoom = Math.min(350, this.zoom + 25);
    this.clampAllPanPositions();
  }

  zoomOut(): void {
    this.zoom = Math.max(70, this.zoom - 10);
    this.clampAllPanPositions();
  }

  resetViewer(): void {
    this.zoom = 100;
    this.resetPan();
    this.selectedSpot = null;
  }

  downloadVisibleData(): void {
    const panels = this.visiblePanels;
    if (!panels.length || this.loadingLayers) return;

    const rows = [[
      'accession', 'surgery', 'timepoint', 'replicate', 'feature_type', 'feature',
      'normalization', 'barcode', 'x_hires', 'y_hires', 'in_tissue', 'raw_count', 'value'
    ].join('\t')];

    panels.forEach(panel => {
      const layer = this.layerForPanel(panel);
      if (!layer) return;
      layer.spots.forEach(spot => rows.push([
        panel.sample.accession,
        panel.sample.surgery,
        panel.sample.timepoint,
        panel.sample.replicate,
        panel.viewMode === 'gene' ? 'gene_expression' : 'cell_type_proportion',
        panel.feature,
        layer.feature.normalization,
        spot.barcode,
        spot.xHires,
        spot.yHires,
        spot.inTissue ? 1 : 0,
        spot.rawCount ?? '',
        spot.value
      ].map(value => this.tsvValue(value)).join('\t')));
    });

    const blob = new Blob([`${rows.join('\n')}\n`], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sampleName = [...new Set(panels.map(panel => panel.sample.accession))].join('_vs_');
    const featureName = panels.map(panel => panel.feature).join('_vs_').replace(/[^A-Za-z0-9._-]+/g, '_');
    link.href = url;
    link.download = `cui2021_spatial_${sampleName}_${featureName}.tsv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  beginPan(event: PointerEvent, panel: SpatialPanel): void {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('.spatial-spot')) return;

    const viewport = event.currentTarget as HTMLElement;
    const content = viewport.querySelector<HTMLElement>('.tissue-layer');
    if (!content) return;
    const scale = this.zoom / 100;
    if (content.offsetWidth * scale <= viewport.clientWidth && content.offsetHeight * scale <= viewport.clientHeight) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.panStartPointerX = event.clientX;
    this.panStartPointerY = event.clientY;
    this.viewportWidth = viewport.clientWidth;
    this.viewportHeight = viewport.clientHeight;
    this.contentWidth = content.offsetWidth;
    this.contentHeight = content.offsetHeight;
    this.activePanKey = this.panKey(panel);
    const position = this.panPosition(panel);
    this.panStartX = position.x;
    this.panStartY = position.y;
    this.panBounds.set(this.activePanKey, {
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      contentWidth: this.contentWidth,
      contentHeight: this.contentHeight
    });
    this.isPanning = true;
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  movePan(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId || !this.activePanKey) return;
    const position = this.clampedPanPosition(
      this.activePanKey,
      this.panStartX + event.clientX - this.panStartPointerX,
      this.panStartY + event.clientY - this.panStartPointerY
    );
    this.setPanPosition(this.activePanKey, position);
    event.preventDefault();
  }

  endPan(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    const viewport = event.currentTarget as HTMLElement;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    this.activePointerId = null;
    this.activePanKey = null;
    this.isPanning = false;
  }

  transformFor(panel: SpatialPanel): string {
    const flip = panel.sample.flipHorizontal ? -1 : 1;
    const pan = this.panPosition(panel);
    return `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${this.zoom / 100}) scaleX(${flip})`;
  }

  isPanelPanning(panel: SpatialPanel): boolean {
    return this.isPanning && this.activePanKey === this.panKey(panel);
  }

  layerForPanel(panel: SpatialPanel): SpatialLayerResponse | undefined {
    return this.layers.get(this.layerKey(panel));
  }

  spotsForPanel(panel: SpatialPanel): SpatialSpot[] {
    return this.layerForPanel(panel)?.spots ?? [];
  }

  spotColor(spot: SpatialSpot, panel: SpatialPanel): string {
    const maximum = this.useSharedScale ? this.sharedMaximum() : this.panelMaximum(panel);
    const normalized = maximum > 0 ? Math.max(0, Math.min(1, spot.value / maximum)) : 0;
    if (panel.viewMode === 'cellType') {
      const lightness = 92 - normalized * 55;
      const saturation = 48 + normalized * 30;
      return `hsl(174 ${saturation}% ${lightness}%)`;
    }
    const lightness = 93 - normalized * 53;
    const saturation = 58 + normalized * 24;
    return `hsl(331 ${saturation}% ${lightness}%)`;
  }

  formatValue(value: number): string {
    return value < 0.01 && value > 0 ? value.toPrecision(2) : value.toFixed(2);
  }

  trackSpot(_: number, spot: SpatialSpot): number {
    return spot.spotId;
  }

  loadVisibleLayers(): void {
    const panels = this.visiblePanels;
    if (!panels.length || panels.some(panel => !panel.feature.trim())) return;

    const requestId = ++this.layerRequestId;
    this.loadingLayers = true;
    this.layerError = false;
    const requests = panels.map(panel => panel.viewMode === 'gene'
      ? this.spatialService.getGeneLayer(panel.sample.accession, panel.feature)
      : this.spatialService.getCellTypeLayer(panel.sample.accession, panel.feature));

    this.subscriptions.add(forkJoin(requests).subscribe({
      next: layers => {
        if (requestId !== this.layerRequestId) return;
        layers.forEach((layer, index) => this.layers.set(this.layerKey(panels[index]), layer));
        this.loadingLayers = false;
      },
      error: () => {
        if (requestId !== this.layerRequestId) return;
        panels.forEach(panel => this.layers.delete(this.layerKey(panel)));
        this.loadingLayers = false;
        this.layerError = true;
      }
    }));
  }

  private createPanel(sample: SpatialSample, viewMode: SpatialViewMode, feature: string): SpatialPanel {
    return {
      id: `${sample.accession}:${viewMode}:${feature}`,
      sample,
      viewMode,
      feature
    };
  }

  private currentFeature(): string {
    return this.viewMode === 'gene' ? this.selectedGene : this.selectedCellType;
  }

  private layerKey(panel: SpatialPanel): string {
    return panel.id;
  }

  private clearSelectionAndLoad(): void {
    this.selectedSpot = null;
    this.geneNotFound = false;
    this.loadVisibleLayers();
  }

  private commitGene(symbol: string): void {
    this.selectedGene = symbol;
    this.geneNotFound = false;
    this.selectedSpot = null;
    this.loadVisibleLayers();
  }

  private ensureValidSelection(): void {
    const replicates = this.availableReplicates;
    if (!replicates.includes(this.selectedReplicate)) {
      this.selectedReplicate = replicates[0] ?? 1;
    }
  }

  private panelMaximum(panel: SpatialPanel): number {
    const layer = this.layerForPanel(panel);
    if (!layer) return 1;
    const suppliedMaximum = Number(layer.max);
    if (Number.isFinite(suppliedMaximum) && suppliedMaximum > 0) return suppliedMaximum;
    return Math.max(0, ...layer.spots.map(spot => spot.value)) || 1;
  }

  private sharedMaximum(): number {
    return Math.max(1e-9, ...this.visiblePanels.map(panel => this.panelMaximum(panel)));
  }

  private clampedPanPosition(key: string, x: number, y: number): PanPosition {
    const bounds = this.panBounds.get(key) ?? {
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      contentWidth: this.contentWidth,
      contentHeight: this.contentHeight
    };
    const scale = this.zoom / 100;
    const maxX = Math.max(0, (bounds.contentWidth * scale - bounds.viewportWidth) / 2);
    const maxY = Math.max(0, (bounds.contentHeight * scale - bounds.viewportHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }

  private clampAllPanPositions(): void {
    if (this.comparisonMode === 'sample') {
      this.samplePanPositions.forEach((position, key) => {
        this.samplePanPositions.set(key, this.clampedPanPosition(key, position.x, position.y));
      });
      return;
    }
    const position = this.clampedPanPosition('shared', this.panX, this.panY);
    this.panX = position.x;
    this.panY = position.y;
  }

  private panKey(panel: SpatialPanel): string {
    return this.comparisonMode === 'sample' ? panel.sample.accession : 'shared';
  }

  private panPosition(panel: SpatialPanel): PanPosition {
    if (this.comparisonMode === 'sample') {
      return this.samplePanPositions.get(panel.sample.accession) ?? { x: 0, y: 0 };
    }
    return { x: this.panX, y: this.panY };
  }

  private setPanPosition(key: string, position: PanPosition): void {
    if (this.comparisonMode === 'sample') {
      this.samplePanPositions.set(key, position);
      return;
    }
    this.panX = position.x;
    this.panY = position.y;
  }

  private resetPan(): void {
    this.panX = 0;
    this.panY = 0;
    this.samplePanPositions.clear();
    this.panBounds.clear();
  }

  private tsvValue(value: string | number): string {
    const text = String(value);
    return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
