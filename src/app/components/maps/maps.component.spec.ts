import { of } from 'rxjs';

import { Pubmed } from '../../models/pubmed.model';
import { GenomeBrowserSelection, MapsComponent, getCuiSpatialContext } from './maps.component';

describe('getCuiSpatialContext', () => {
  const selection: GenomeBrowserSelection = {
    pmid: 34489413,
    cell_type: 'Cardiomyocyte 1',
    gene: 123,
    cell_type2: 'NA',
    cell_type3: 'NA',
    slope: 0,
    pvalue: 1,
    intercept: 0,
    lfc: 0,
    g_id: 1,
    PSD: 3,
    Surgery: 'MI'
  };

  it('maps a Cui CM1 selection to the MI 3 dpi layers view', () => {
    expect(getCuiSpatialContext(selection, 'Nckap5')).toEqual({
      gene: 'Nckap5',
      cellType: 'CM1',
      surgery: 'MI',
      timepoint: '3 dpi'
    });
  });

  it('supports the matching sham 3 dpi sample', () => {
    expect(getCuiSpatialContext({ ...selection, Surgery: 'Sham' }, 'Nckap5')?.surgery).toBe('Sham');
  });

  it('accepts the public Cui PMID and suffixed Cui cluster labels', () => {
    const context = getCuiSpatialContext({
      ...selection,
      pmid: 32220304,
      cell_type: 'Cardiomyocyte 1 2'
    }, 'Nckap5');

    expect(context?.cellType).toBe('CM1');
  });

  it('uses a Cui subtype supplied as an alternate cell label', () => {
    const context = getCuiSpatialContext({
      ...selection,
      cell_type: 'Cardiomyocyte',
      cell_type2: 'Cardiomyocyte 1'
    }, 'Nckap5');

    expect(context?.cellType).toBe('CM1');
  });

  it('does not expose spatial data for another study', () => {
    expect(getCuiSpatialContext({ ...selection, pmid: 33296652 }, 'Nckap5')).toBeNull();
  });

  it('does not expose spatial data for a day without a matching Visium sample', () => {
    expect(getCuiSpatialContext({ ...selection, PSD: 1 }, 'Nckap5')).toBeNull();
  });

  it('does not expose spatial data for an unsupported Cui cluster', () => {
    expect(getCuiSpatialContext({ ...selection, cell_type: 'Progenitor cell' }, 'Nckap5')).toBeNull();
  });

  it('loads study metadata during component initialization', () => {
    const databaseService = {
      getImage: () => of([{ UMAP: { data: [1] }, TSNE: null }])
    };
    const sanitizer = {
      bypassSecurityTrustResourceUrl: (value: string) => value
    };
    const pubmedService = {
      getPubmedJson: jasmine.createSpy().and.returnValue(of(
        new Pubmed('Cui study title', ['Jiayi Cui'], 2020)
      ))
    };
    const component = new MapsComponent(
      databaseService as any,
      sanitizer as any,
      pubmedService as any
    );
    component.selected_info = { ...selection };
    component.en_id = 'Nckap5';

    component.ngOnInit();

    expect(pubmedService.getPubmedJson).toHaveBeenCalledWith(34489413);
    expect(component.title).toBe('Cui study title');
    expect(component.author).toBe('Jiayi Cui');
    expect(component.year).toBe('2020');
    expect(component.spatialContext?.cellType).toBe('CM1');
  });
});
