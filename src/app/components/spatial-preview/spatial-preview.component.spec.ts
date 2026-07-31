import { of } from 'rxjs';

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
});
