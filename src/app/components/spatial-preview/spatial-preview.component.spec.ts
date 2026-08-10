import { of } from 'rxjs';
import { SimpleChange } from '@angular/core';

import { SpatialLayerResponse, SpatialSample, SpatialService } from '../../services/spatial.service';
import { SpatialPreviewComponent } from './spatial-preview.component';

describe('SpatialPreviewComponent', () => {
  const sample: SpatialSample = {
    sampleKey: 3,
    accession: 'GSM5268646',
    label: 'P1 MI - 3 dpi',
    surgery: 'MI',
    timepoint: '3 dpi',
    replicate: 1,
    imageUrl: '/downloads/GSM5268646.png',
    imageWidth: 1968,
    imageHeight: 2000,
    spotDiameter: 12
  };

  const layer = (type: 'gene' | 'cell_type', name: string): SpatialLayerResponse => ({
    sample,
    feature: { type, name, normalization: type === 'gene' ? 'log1p' : 'proportion' },
    spots: [{
      spotId: 1,
      barcode: 'AAAC-1',
      x: 0.5,
      y: 0.5,
      xHires: 984,
      yHires: 1000,
      inTissue: true,
      value: 0.5
    }],
    max: 0.5
  });

  it('uses the compact viewer display defaults', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);

    expect(component.showHistology).toBeTrue();
    expect(component.showSpots).toBeTrue();
    expect(component.spotOpacity).toBe(80);
    expect(component.spotSize).toBe(9);
    expect(component.expressionScale).toBe('log');
  });

  it('switches expression between log1p and back-transformed linear values', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);
    const geneLayer = layer('gene', 'Nckap5');
    geneLayer.spots[0].value = Math.log1p(10);
    geneLayer.max = Math.log1p(10);
    const panel = { type: 'gene' as const, feature: 'Nckap5', layer: geneLayer };

    expect(component.spotDisplayValue(geneLayer.spots[0], panel)).toBeCloseTo(Math.log1p(10));

    component.setExpressionScale('linear');

    expect(component.spotDisplayValue(geneLayer.spots[0], panel)).toBeCloseTo(10);
    expect(component.maximum(panel)).toBeCloseTo(10);
  });

  it('uses the same high-contrast expression and proportion ramps as the full spatial page', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);
    const genePanel = { type: 'gene' as const, feature: 'Nckap5', layer: layer('gene', 'Nckap5') };
    const cellPanel = { type: 'cellType' as const, feature: 'CM1', layer: layer('cell_type', 'CM1') };

    expect(component.spotColor(genePanel.layer.spots[0], genePanel)).toBe('rgb(63, 0, 125)');
    expect(component.spotColor(cellPanel.layer.spots[0], cellPanel)).toBe('rgb(0, 68, 27)');
  });

  it('displays the genome-browser spatial timepoint using PSD terminology', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);

    expect(component.formatTimepoint('3 dpi')).toBe('PSD3');
    expect(component.formatTimepoint('7 dpi')).toBe('PSD7');
  });

  it('flags PSD1 records because the spatial study starts at PSD3', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);

    component.sourcePsd = 1;
    expect(component.showPsd1Notice).toBeTrue();

    component.sourcePsd = 3;
    expect(component.showPsd1Notice).toBeFalse();
  });

  it('calculates an automatic view around the occupied tissue spots', () => {
    const component = new SpatialPreviewComponent({} as SpatialService);
    const spots = [
      { ...layer('gene', 'Nckap5').spots[0], spotId: 1, x: .3, y: .35 },
      { ...layer('gene', 'Nckap5').spots[0], spotId: 2, x: .7, y: .65 }
    ];

    const fit = component.calculateClusterFit(spots);

    expect(fit.zoom).toBeGreaterThan(100);
    expect(fit.centerX).toBeCloseTo(.5);
    expect(fit.centerY).toBeCloseTo(.5);
  });

  it('loads matching gene and cell-type layers for the same sample', () => {
    const service = {
      getSamples: () => of([sample]),
      getGeneLayer: jasmine.createSpy().and.returnValue(of(layer('gene', 'Nckap5'))),
      getCellTypeLayer: jasmine.createSpy().and.returnValue(of(layer('cell_type', 'CM1')))
    } as unknown as SpatialService;
    const component = new SpatialPreviewComponent(service);
    component.gene = 'Nckap5';
    component.cellType = 'CM1';
    component.surgery = 'MI';

    component.ngOnInit();

    expect(service.getGeneLayer).toHaveBeenCalledWith('GSM5268646', 'Nckap5');
    expect(service.getCellTypeLayer).toHaveBeenCalledWith('GSM5268646', 'CM1');
    expect(component.panels.map(panel => panel.feature)).toEqual(['Nckap5', 'CM1']);
    expect(component.loading).toBeFalse();
  });

  it('reloads both layers when the selected cluster changes', () => {
    const service = {
      getSamples: () => of([sample]),
      getGeneLayer: jasmine.createSpy().and.returnValue(of(layer('gene', 'Nckap5'))),
      getCellTypeLayer: jasmine.createSpy().and.returnValue(of(layer('cell_type', 'CM1')))
    } as unknown as SpatialService;
    const component = new SpatialPreviewComponent(service);
    component.gene = 'Nckap5';
    component.cellType = 'CM1';
    component.surgery = 'MI';
    component.ngOnInit();

    component.cellType = 'CM4';
    component.ngOnChanges({
      cellType: new SimpleChange('CM1', 'CM4', false)
    });

    expect(service.getGeneLayer).toHaveBeenCalledTimes(2);
    expect(service.getCellTypeLayer).toHaveBeenCalledWith('GSM5268646', 'CM4');
  });

  it('links a selected tissue spot across both panels', () => {
    const service = {
      getSamples: () => of([sample]),
      getGeneLayer: () => of(layer('gene', 'Nckap5')),
      getCellTypeLayer: () => of(layer('cell_type', 'CM1'))
    } as unknown as SpatialService;
    const component = new SpatialPreviewComponent(service);
    component.gene = 'Nckap5';
    component.cellType = 'CM1';
    component.ngOnInit();

    component.selectSpot(component.panels[0].layer.spots[0]);

    expect(component.isSelected(component.panels[1].layer.spots[0])).toBeTrue();
  });

  it('switches comparison previews between MI and Sham samples', () => {
    const shamSample = { ...sample, sampleKey: 1, accession: 'GSM5268644', surgery: 'Sham' as const };
    const service = {
      getSamples: () => of([sample, shamSample]),
      getGeneLayer: jasmine.createSpy().and.returnValue(of(layer('gene', 'Nckap5'))),
      getCellTypeLayer: jasmine.createSpy().and.returnValue(of(layer('cell_type', 'CM1')))
    } as unknown as SpatialService;
    const component = new SpatialPreviewComponent(service);
    component.gene = 'Nckap5';
    component.cellType = 'CM1';
    component.surgery = 'MI';
    component.ngOnInit();

    component.setSurgery('Sham');

    expect(component.activeSurgery).toBe('Sham');
    expect(service.getGeneLayer).toHaveBeenCalledWith('GSM5268644', 'Nckap5');
    expect(service.getCellTypeLayer).toHaveBeenCalledWith('GSM5268644', 'CM1');
  });

  it('switches the genome-browser spatial sample between PSD3 and PSD7', () => {
    const psd7Sample: SpatialSample = {
      ...sample,
      sampleKey: 7,
      accession: 'GSM4983123',
      label: 'P1 MI - 7 dpi',
      timepoint: '7 dpi'
    };
    const service = {
      getSamples: () => of([sample, psd7Sample]),
      getGeneLayer: jasmine.createSpy().and.returnValue(of(layer('gene', 'Nckap5'))),
      getCellTypeLayer: jasmine.createSpy().and.returnValue(of(layer('cell_type', 'CM1')))
    } as unknown as SpatialService;
    const component = new SpatialPreviewComponent(service);
    component.gene = 'Nckap5';
    component.cellType = 'CM1';
    component.surgery = 'MI';
    component.ngOnInit();

    component.setTimepoint('7 dpi');

    expect(component.activeTimepoint).toBe('7 dpi');
    expect(service.getGeneLayer).toHaveBeenCalledWith('GSM4983123', 'Nckap5');
    expect(service.getCellTypeLayer).toHaveBeenCalledWith('GSM4983123', 'CM1');
  });
});
