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
      cellTypes: [],
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
        value: 0.35
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
});
