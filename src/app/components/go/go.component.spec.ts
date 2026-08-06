import { GoComponent } from './go.component';
import { of, Subject } from 'rxjs';

describe('GoComponent', () => {
  function createComponent(getGoTerms: jasmine.Spy) {
    const databaseService = {
      loadKEGGInfo: () => of({}),
      getPathways: () => of([]),
      getKEGGPathways: () => of([]),
      getGoTerms,
      getKEGGTerms: jasmine.createSpy('getKEGGTerms').and.returnValue(of([]))
    };
    const geneConversionService = {
      convertEnsemblListToGeneList: (genes: string[]) => Promise.resolve(genes)
    };
    const pathwayInfoService = {
      getPathwayInfo: () => of({ results: [] })
    };

    return new GoComponent(
      databaseService as any,
      geneConversionService as any,
      {} as any,
      {} as any,
      pathwayInfoService as any,
      { run: (callback: () => void) => callback() } as any,
      { getColorTheme: () => false } as any,
      {} as any
    );
  }

  function term(pathway: string, cellType: string, nes = 1) {
    return {
      pathway,
      goid: 'GO:0000001',
      nes,
      P_Value: 0.01,
      coreenrichment: 'ENSMUSG00000000001',
      cell_type: cellType,
      tissue: 'Heart',
      pmid: 1
    };
  }

  it('ignores an older response that finishes after the latest request', async () => {
    const firstResponse = new Subject<any[]>();
    const secondResponse = new Subject<any[]>();
    const getGoTerms = jasmine.createSpy('getGoTerms').and.returnValues(
      firstResponse.asObservable(),
      secondResponse.asObservable()
    );
    const component = createComponent(getGoTerms);

    component.selected_pathway = 'First pathway';
    const firstLoad = component.prepareData();
    component.selected_pathway = 'Second pathway';
    const secondLoad = component.prepareData();

    secondResponse.next([term('Second pathway', 'Cardiomyocyte 2')]);
    secondResponse.complete();
    await secondLoad;

    firstResponse.next([term('First pathway', 'Cardiomyocyte 1')]);
    firstResponse.complete();
    await firstLoad;

    expect(component.go_terms.map(item => item.pathway)).toEqual(['Second pathway']);
    expect(component.go_terms.map(item => item.cell_type)).toEqual(['Cardiomyocyte 2']);
  });

  it('clears the previous chart when the latest selection has no rows', async () => {
    const getGoTerms = jasmine.createSpy('getGoTerms').and.returnValues(
      of([term('Populated pathway', 'Cardiomyocyte 1')]),
      of([])
    );
    const component = createComponent(getGoTerms);

    await component.prepareData();
    expect((component.go_chart_options.series?.[0]?.data as any[]).length).toBe(1);

    component.selected_pathway = 'Empty pathway';
    await component.prepareData();

    expect(component.go_terms).toEqual([]);
    expect(component.filtered_go_terms).toEqual([]);
    expect(component.go_chart_options.series?.[0]?.data).toEqual([]);
    expect(component.upreg_gene_counts).toEqual([]);
    expect(component.downreg_gene_counts).toEqual([]);
  });

  it('clears the chart without requesting all cells when every cell type is deselected', async () => {
    const getGoTerms = jasmine.createSpy('getGoTerms').and.returnValue(of([]));
    const component = createComponent(getGoTerms);
    component.selected_cell_types = [];

    await component.prepareData();

    expect(getGoTerms).not.toHaveBeenCalled();
    expect(component.go_chart_options.series?.[0]?.data).toEqual([]);
    expect(component.loading).toBeFalse();
  });

  it('assigns a valid color when all returned terms have the same NES', () => {
    const component = createComponent(jasmine.createSpy('getGoTerms').and.returnValue(of([])));

    expect(component.getColorForValue(1, 1, 1)).toBe('rgb(178,34,34)');
    expect(component.getColorForValue(-1, -1, -1)).toBe('rgb(25,25,112)');
  });
});
