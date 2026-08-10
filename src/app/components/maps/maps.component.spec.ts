import { of } from 'rxjs';

import { Pubmed } from '../../models/pubmed.model';
import {
  GenomeBrowserSelection,
  MapsComponent,
  getGenomeCellTypeLabel,
  getGenomeSpatialContext,
  getPublicStudyPmid
} from './maps.component';

describe('getGenomeSpatialContext', () => {
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
    expect(getGenomeSpatialContext(selection, 'Nckap5')).toEqual({
      gene: 'Nckap5',
      cellType: 'CM1',
      surgery: 'MI',
      timepoint: '3 dpi',
      allowConditionSwitch: false
    });
  });

  it('supports the matching sham 3 dpi sample', () => {
    expect(getGenomeSpatialContext({ ...selection, Surgery: 'Sham' }, 'Nckap5')?.surgery).toBe('Sham');
  });

  it('supports a Cui Sham-vs-MI point with an explicit tissue condition switch', () => {
    const context = getGenomeSpatialContext({
      ...selection,
      Surgery: '',
      Comparison: 'ShamvsMI'
    }, 'Nckap5');

    expect(context?.surgery).toBe('MI');
    expect(context?.allowConditionSwitch).toBeTrue();
  });

  it('accepts the public Cui PMID and suffixed Cui cluster labels', () => {
    const context = getGenomeSpatialContext({
      ...selection,
      pmid: 32220304,
      cell_type: 'Cardiomyocyte 1 2'
    }, 'Nckap5');

    expect(context?.cellType).toBe('CM1');
    expect(getGenomeCellTypeLabel('Cardiomyocyte 1 2')).toBe('Cardiomyocyte 1');
  });

  it('maps the legacy genome-browser study ID to the correct Cui publication', () => {
    expect(getPublicStudyPmid(34489413)).toBe(32220304);
    expect(getPublicStudyPmid(33296652)).toBe(33296652);
  });

  it('uses a Cui subtype supplied as an alternate cell label', () => {
    const context = getGenomeSpatialContext({
      ...selection,
      cell_type: 'Cardiomyocyte',
      cell_type2: 'Cardiomyocyte 1'
    }, 'Nckap5');

    expect(context?.cellType).toBe('CM1');
  });

  it('maps broad and abbreviated Cui cell labels used by the spatial dataset', () => {
    expect(getGenomeSpatialContext({ ...selection, cell_type: 'Endocardial cells' }, 'Nckap5')?.cellType)
      .toBe('Endocardial cells');
    expect(getGenomeSpatialContext({ ...selection, cell_type: 'EPI' }, 'Nckap5')?.cellType)
      .toBe('EPI');
    expect(getGenomeSpatialContext({ ...selection, cell_type: 'Pericyte / SMC' }, 'Nckap5')?.cellType)
      .toBe('Pericyte/SMC');
  });

  it('waits for an Ensembl ID to resolve to a spatial gene symbol', () => {
    expect(getGenomeSpatialContext(selection, 'ENSMUSG00000012345')).toBeNull();
  });

  it('exposes compatible spatial data for another study', () => {
    expect(getGenomeSpatialContext({ ...selection, pmid: 33296652 }, 'Nckap5')?.cellType).toBe('CM1');
    expect(getGenomeSpatialContext({
      ...selection,
      pmid: 33296652,
      cell_type: 'Endothelial cell 4'
    }, 'Nckap5')?.cellType).toBe('Endothelial cells');
  });

  it('uses 7 dpi spatial data when the selected study record is from day 7', () => {
    expect(getGenomeSpatialContext({ ...selection, pmid: 33296652, PSD: 7 }, 'Nckap5')?.timepoint)
      .toBe('7 dpi');
  });

  it('defaults records without a spatial day or condition to switchable MI 3 dpi data', () => {
    const context = getGenomeSpatialContext({
      ...selection,
      pmid: 33296652,
      PSD: 1,
      Surgery: '',
      Comparison: 'P1vsP8'
    }, 'Nckap5');

    expect(context?.timepoint).toBe('3 dpi');
    expect(context?.surgery).toBe('MI');
    expect(context?.allowConditionSwitch).toBeTrue();
  });

  it('does not expose spatial data for an unsupported Cui cluster', () => {
    expect(getGenomeSpatialContext({ ...selection, cell_type: 'Progenitor cell' }, 'Nckap5')).toBeNull();
  });

  it('returns to UMAP when a new selection is not spatially eligible', () => {
    const component = new MapsComponent({} as any, {} as any, {} as any);
    component.selected_info = { ...selection, pmid: 33296652, cell_type: 'Progenitor cell' };
    component.en_id = 'Nckap5';
    component.display = 'Spatial';

    component.ngOnChanges({} as any);

    expect(component.spatialContext).toBeNull();
    expect(component.display).toBe('UMAP');
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

    expect(pubmedService.getPubmedJson).toHaveBeenCalledWith(32220304);
    expect(component.title).toBe('Cui study title');
    expect(component.author).toBe('Jiayi Cui');
    expect(component.year).toBe('2020');
    expect(component.spatialContext?.cellType).toBe('CM1');
  });
});
