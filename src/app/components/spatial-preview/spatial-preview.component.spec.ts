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
    expect(component.spotSize).toBe(4);
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
});
