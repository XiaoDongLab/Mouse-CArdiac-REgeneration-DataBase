import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import {
  SpatialCellTypesResponse,
  SpatialGene,
  SpatialLayerResponse,
  SpatialService,
  SpatialSample
} from '../../services/spatial.service';
import { SpatialComponent } from './spatial.component';

class FakeSpatialService {
  geneLayerCalls: Array<[string, string]> = [];
  cellTypeLayerCalls: Array<[string, string]> = [];

  constructor(private readonly samples: SpatialSample[]) {}

  getSamples(): Observable<SpatialSample[]> {
    return of(this.samples);
  }

  getCellTypes(): Observable<SpatialCellTypesResponse> {
    return of({
      cellTypes: [
        'CM4', 'CM1', 'EndoEC', 'CM3', 'FB', 'EPI', 'Macrophage', 'Pericyte/SMC', 'EC', 'CM2', 'CM5'
      ].map((name, index) => ({
        cell_type_id: index + 1,
        source_name: name,
        display_name: name
      })),
      aliases: [
        'Cardiomyocytes', 'Fibroblasts', 'Immune cells', 'Endothelial cells',
        'Endocardial cells', 'Epicardial cells', 'CM1', 'CM2', 'CM3', 'CM4',
        'CM5', 'Pericyte/SMC'
      ]
    });
  }

  getGenes(): Observable<SpatialGene[]> {
    return of([{ gene_id: 1, symbol: 'Acta2' }]);
  }

  getGeneLayer(accession: string, symbol: string): Observable<SpatialLayerResponse> {
    this.geneLayerCalls.push([accession, symbol]);
    return of({
      sample: this.samples.find(sample => sample.accession === accession)!,
      feature: { type: 'gene', name: symbol, normalization: 'log1p counts per 10,000' },
      spots: [{
        spotId: 1,
        barcode: 'AAACCGTTCGTCCAGG-1',
        x: 0.25,
        y: 0.5,
        xHires: 500,
        yHires: 1000,
        inTissue: true,
        rawCount: 0,
        value: 0
      }],
      min: 0,
      max: 2.5
    });
  }

  getCellTypeLayer(accession: string, cellType: string): Observable<SpatialLayerResponse> {
    this.cellTypeLayerCalls.push([accession, cellType]);
    const values: Record<string, number> = {
      CM1: 0.8,
      CM2: 0.7,
      CM3: 0.6,
      CM4: 0.5,
      CM5: 0.4,
      Fibroblasts: 0.35,
      'Endothelial cells': 0.3,
      'Endocardial cells': 0.25,
      'Pericyte/SMC': 0.2,
      'Immune cells': 0.15,
      'Epicardial cells': 0
    };
    return of({
      sample: this.samples.find(sample => sample.accession === accession)!,
      feature: { type: 'cell_type', name: cellType, normalization: 'deconvolution proportion' },
      spots: [{
        spotId: 1,
        barcode: 'AAACCGTTCGTCCAGG-1',
        x: 0.25,
        y: 0.5,
        xHires: 500,
        yHires: 1000,
        inTissue: true,
        value: values[cellType] ?? 0.35
      }],
      min: 0,
      max: 1
    });
  }
}

describe('SpatialComponent', () => {
  let component: SpatialComponent;
  let fixture: ComponentFixture<SpatialComponent>;
  let spatialService: FakeSpatialService;

  const samples: SpatialSample[] = [
    {
      sampleKey: 1,
      accession: 'GSM5268644',
      label: 'P1 Sham - 3 dpi',
      surgery: 'Sham',
      timepoint: '3 dpi',
      replicate: 1,
      imageUrl: 'https://api.mcaredb.org:3305/downloads/GSM5268644.png',
      imageWidth: 2000,
      imageHeight: 1818,
      spotDiameter: 11.4872
    },
    {
      sampleKey: 3,
      accession: 'GSM5268646',
      label: 'P1 MI - 3 dpi',
      surgery: 'MI',
      timepoint: '3 dpi',
      replicate: 1,
      imageUrl: 'https://api.mcaredb.org:3305/downloads/GSM5268646.png',
      imageWidth: 1968,
      imageHeight: 2000,
      spotDiameter: 12.6422
    }
  ];

  beforeEach(async () => {
    spatialService = new FakeSpatialService(samples);

    await TestBed.configureTestingModule({
      declarations: [SpatialComponent],
      imports: [
        FormsModule,
        NgbModule,
        NoopAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [{ provide: SpatialService, useValue: spatialService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SpatialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads published samples and the initial gene layer', () => {
    expect(component.samples).toEqual(samples);
    expect(component.activeSample?.accession).toBe('GSM5268646');
    expect(spatialService.geneLayerCalls).toContain(['GSM5268646', 'Acta2']);
    expect(component.visibleSpotCount).toBe(1);
  });

  it('uses the full-page spatial display defaults', () => {
    expect(component.spotOpacity).toBe(80);
    expect(component.spotSize).toBe(1.125);
  });

  it('formats cell-type proportions as percentages for spot details', () => {
    expect(component.formatProportion(0.35)).toBe('35%');
    expect(component.formatProportion(0.075)).toBe('7.5%');
    expect(component.formatProportion(0.0015)).toBe('0.15%');
    expect(component.formatProportion(0)).toBe('0%');
  });

  it('exposes every UI cell-type alias', () => {
    expect(component.cellTypes.length).toBe(12);
    expect(component.cellTypes).toContain('CM2');
    expect(component.cellTypes).toContain('CM3');
    expect(component.cellTypes).toContain('Pericyte/SMC');
  });

  it('loads both conditions in comparison mode', () => {
    component.toggleComparison();

    expect(component.visibleSamples.map(sample => sample.accession)).toEqual([
      'GSM5268646',
      'GSM5268644'
    ]);
    expect(spatialService.geneLayerCalls).toContain(['GSM5268644', 'Acta2']);
  });

  it('compares gene expression and cell-type proportion on the same sample', () => {
    component.setComparisonMode('feature');

    expect(component.visiblePanels.map(panel => panel.sample.accession)).toEqual([
      'GSM5268646',
      'GSM5268646'
    ]);
    expect(component.visiblePanels.map(panel => panel.viewMode)).toEqual(['gene', 'cellType']);
    expect(spatialService.geneLayerCalls).toContain(['GSM5268646', 'Acta2']);
    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'Fibroblasts']);
    expect(component.useSharedScale).toBeFalse();
  });

  it('links selection and values across same-sample layer panels', () => {
    component.setComparisonMode('feature');
    const [genePanel, cellTypePanel] = component.visiblePanels;
    const geneSpot = component.spotsForPanel(genePanel)[0];
    const cellTypeSpot = component.spotsForPanel(cellTypePanel)[0];

    component.selectSpot(geneSpot, genePanel);

    expect(component.isSpotSelected(geneSpot, genePanel)).toBeTrue();
    expect(component.isSpotSelected(cellTypeSpot, cellTypePanel)).toBeTrue();
    expect(component.selectedSpotMeasurements.map(measurement => measurement.spot.value)).toEqual([0, 0.35]);
  });

  it('resolves a lowercase gene symbol to its canonical dataset symbol', () => {
    component.onGeneInput('acta2');
    component.applyGene();

    expect(component.selectedGene).toBe('Acta2');
    expect(component.geneNotFound).toBeFalse();
    expect(spatialService.geneLayerCalls).toContain(['GSM5268646', 'Acta2']);
  });

  it('calculates an automatic view around the occupied tissue spots', () => {
    const spots = [
      { ...component.spotsForPanel(component.visiblePanels[0])[0], spotId: 1, x: .25, y: .35 },
      { ...component.spotsForPanel(component.visiblePanels[0])[0], spotId: 2, x: .65, y: .7 }
    ];

    const fit = component.calculateClusterFit(spots);

    expect(fit.zoom).toBeGreaterThan(100);
    expect(fit.centerX).toBeCloseTo(.45);
    expect(fit.centerY).toBeCloseTo(.525);
  });

  it('pans a zoomed image and resets its position', () => {
    const viewport = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'tissue-layer';
    viewport.appendChild(content);
    Object.defineProperty(viewport, 'clientWidth', { value: 400 });
    Object.defineProperty(viewport, 'clientHeight', { value: 300 });
    Object.defineProperty(content, 'offsetWidth', { value: 400 });
    Object.defineProperty(content, 'offsetHeight', { value: 300 });
    spyOn(viewport, 'setPointerCapture');

    component.zoom = 150;
    component.beginPan({
      button: 0,
      target: viewport,
      currentTarget: viewport,
      pointerId: 7,
      clientX: 100,
      clientY: 100,
      preventDefault: () => undefined
    } as unknown as PointerEvent, component.visiblePanels[0]);
    component.movePan({
      pointerId: 7,
      clientX: 145,
      clientY: 125,
      preventDefault: () => undefined
    } as unknown as PointerEvent);

    expect(component.panX).toBe(45);
    expect(component.panY).toBe(25);

    component.resetViewer();
    expect(component.panX).toBe(0);
    expect(component.panY).toBe(0);
  });

  it('keeps sample-comparison pan positions independent', () => {
    component.toggleComparison();
    component.zoom = 150;
    const [miPanel, shamPanel] = component.visiblePanels;
    const viewport = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'tissue-layer';
    viewport.appendChild(content);
    Object.defineProperty(viewport, 'clientWidth', { value: 400 });
    Object.defineProperty(viewport, 'clientHeight', { value: 300 });
    Object.defineProperty(content, 'offsetWidth', { value: 400 });
    Object.defineProperty(content, 'offsetHeight', { value: 300 });
    spyOn(viewport, 'setPointerCapture');

    component.beginPan({
      button: 0,
      target: viewport,
      currentTarget: viewport,
      pointerId: 9,
      clientX: 100,
      clientY: 100,
      preventDefault: () => undefined
    } as unknown as PointerEvent, miPanel);
    component.movePan({
      pointerId: 9,
      clientX: 140,
      clientY: 115,
      preventDefault: () => undefined
    } as unknown as PointerEvent);

    expect(component.transformFor(miPanel)).toContain('+ 40px');
    expect(component.transformFor(shamPanel)).toContain('+ 0px');
  });

  it('switches to cell-type proportions without synthetic value offsets', () => {
    component.setViewMode('cellType');

    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'Fibroblasts']);
    expect(component.normalizationLabel).toBe('deconvolution proportion');
  });

  it('loads every published cell type and renders a pie for each spot', () => {
    component.setViewMode('cellType');
    component.showAllCellTypes = true;
    component.onShowAllCellTypesChange();

    const panel = component.visiblePanels[0];
    const spot = component.spotsForPanel(panel)[0];

    expect(component.sourceCellTypes.length).toBe(11);
    expect(component.hasAllCellTypesPanel).toBeTrue();
    expect(component.cellTypeLegend.length).toBe(11);
    expect(component.cellTypeLegend.map(cellType => cellType.name)).toEqual([
      'CM1', 'CM2', 'CM3', 'CM4', 'CM5',
      'FB', 'EC', 'EndoEC', 'Pericyte/SMC', 'Macrophage', 'EPI'
    ]);
    expect(component.cellTypeLegend.map(cellType => cellType.label)).toEqual([
      'CM1', 'CM2', 'CM3', 'CM4', 'CM5',
      'Fibroblasts', 'Endothelial cells', 'Endocardial cells', 'Pericyte/SMC',
      'Immune cells', 'Epicardial cells'
    ]);
    expect(new Set(component.cellTypeLegend.map(cellType => cellType.color)).size).toBe(11);
    expect(component.pieGradient(spot, panel)).toContain('conic-gradient');
    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'CM1']);
    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'Pericyte/SMC']);
    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'Fibroblasts']);
    expect(spatialService.cellTypeLayerCalls).toContain(['GSM5268646', 'Endothelial cells']);
  });

  it('shows every pie component for a selected spot', () => {
    component.setViewMode('cellType');
    component.showAllCellTypes = true;
    component.onShowAllCellTypesChange();
    const panel = component.visiblePanels[0];

    component.selectSpot(component.spotsForPanel(panel)[0], panel);

    expect(component.selectedCellTypeProportions.length).toBe(10);
    expect(component.selectedCellTypeProportions.map(cellType => cellType.name)).toEqual([
      'CM1', 'CM2', 'CM3', 'CM4', 'CM5',
      'FB', 'EC', 'EndoEC', 'Pericyte/SMC', 'Macrophage'
    ]);
    expect(component.selectedCellTypeProportions.map(cellType => cellType.value)).toEqual([
      0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15
    ]);
    expect(component.selectedCellTypeProportions.some(cellType => cellType.name === 'EPI')).toBeFalse();
  });
});
