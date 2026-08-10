import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IgvComponent } from './igv.component';

describe('IgvComponent', () => {
  let component: IgvComponent;
  let fixture: ComponentFixture<IgvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IgvComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IgvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('includes all four Wang PSD3 scATAC-seq conditions on a shared scale', () => {
    const scAtacTracks = IgvComponent.TRACK_CATALOG
      .filter(track => track.id.startsWith('scatac-') && track.config.format === 'bigWig')
      .map(track => track.config);

    expect(scAtacTracks.map(track => track.name)).toEqual([
      'scATAC · P1 · MI · PSD3',
      'scATAC · P1 · Sham · PSD3',
      'scATAC · P8 · MI · PSD3',
      'scATAC · P8 · Sham · PSD3'
    ]);
    expect(new Set(scAtacTracks.map(track => track.autoscaleGroup))).toEqual(
      new Set(['wang-scatac-psd3'])
    );
  });

  it('offers matched PSD3 H3K27ac biological replicates and optional P0 references', () => {
    const matchedHistone = IgvComponent.TRACK_CATALOG.filter(track => track.group === 'matched-histone');
    const references = IgvComponent.TRACK_CATALOG.filter(track => track.group === 'developmental-reference');

    expect(matchedHistone.length).toBe(8);
    expect(matchedHistone.every(track => track.config.name.includes('PSD3'))).toBeTrue();
    expect(matchedHistone.every(track => track.defaultVisible === false)).toBeTrue();
    expect(references.map(track => track.id)).toEqual([
      'reference-p0-h3k27ac',
      'reference-p0-wgbs-r1-plus',
      'reference-p0-wgbs-r1-minus',
      'reference-p0-wgbs-r2-plus',
      'reference-p0-wgbs-r2-minus'
    ]);
    const wgbsTracks = references.filter(track => track.id.includes('wgbs'));
    expect(wgbsTracks.every(track => track.config.min === 0 && track.config.max === 100)).toBeTrue();
    expect(wgbsTracks.every(track => track.config.autoscale === false)).toBeTrue();
  });

  it('uses the comparison-focused accessibility preset by default', () => {
    expect(IgvComponent.RECOMMENDED_TRACK_IDS).toEqual([
      'scatac-p1-mi',
      'scatac-p1-sham',
      'scatac-p8-mi',
      'scatac-p8-sham'
    ]);
  });

  it('keeps the PSD3 H3K27ac preset separate from scATAC accessibility', () => {
    const histonePreset = IgvComponent.TRACK_PRESETS.find(preset => preset.id === 'histone');

    expect(histonePreset).toBeDefined();
    expect(histonePreset!.trackIds.length).toBe(8);
    expect(histonePreset!.trackIds.every(trackId => trackId.startsWith('h3k27ac-'))).toBeTrue();
    expect(histonePreset!.trackIds.some(trackId => trackId.startsWith('scatac-'))).toBeFalse();
  });

  it('loads and removes tracks selected in the track menu', async () => {
    const loadTrack = jasmine.createSpy('loadTrack').and.resolveTo(undefined);
    const removeTrackByName = jasmine.createSpy('removeTrackByName');
    component.browser = { loadTrack, removeTrackByName };

    await component.setTrackVisible('reference-p0-h3k27ac', true);
    expect(loadTrack).toHaveBeenCalled();
    expect(component.isTrackVisible('reference-p0-h3k27ac')).toBeTrue();

    await component.setTrackVisible('reference-p0-h3k27ac', false);
    expect(removeTrackByName).toHaveBeenCalledWith(
      'H3K27ac · P0 · uninjured reference'
    );
    expect(component.isTrackVisible('reference-p0-h3k27ac')).toBeFalse();
  });

  it('selects every track in a category without clearing other categories', async () => {
    const loadTrack = jasmine.createSpy('loadTrack').and.resolveTo(undefined);
    component.browser = { loadTrack, removeTrackByName: jasmine.createSpy('removeTrackByName') };

    await component.showTrackGroup('developmental-reference');

    expect(component.isTrackGroupVisible('developmental-reference')).toBeTrue();
    expect(component.isTrackVisible('scatac-p1-mi')).toBeTrue();
    expect(loadTrack).toHaveBeenCalledTimes(5);
  });

  it('starts with only the primary track category expanded', () => {
    expect(component.isTrackGroupExpanded('accessibility')).toBeTrue();
    expect(component.isTrackGroupExpanded('matched-histone')).toBeFalse();

    component.toggleTrackGroupExpanded('matched-histone');
    expect(component.isTrackGroupExpanded('matched-histone')).toBeTrue();
  });

  it('toggles a complete category between all and none', async () => {
    const loadTrack = jasmine.createSpy('loadTrack').and.resolveTo(undefined);
    const removeTrackByName = jasmine.createSpy('removeTrackByName');
    component.browser = { loadTrack, removeTrackByName };

    await component.toggleTrackGroupVisibility('accessibility');
    expect(component.selectedTrackCountForGroup('accessibility')).toBe(0);
    expect(removeTrackByName).toHaveBeenCalledTimes(4);

    await component.toggleTrackGroupVisibility('accessibility');
    expect(component.isTrackGroupVisible('accessibility')).toBeTrue();
    expect(loadTrack).toHaveBeenCalledTimes(4);
  });

  it('hides IGV multi-track selection in favor of the MCaReDB picker', () => {
    expect(component.options.showMultiSelectButton).toBeFalse();
  });
});
