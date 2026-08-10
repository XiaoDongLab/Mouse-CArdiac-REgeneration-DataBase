import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneCardComponent } from './gene-card.component';

describe('GeneCardComponent', () => {
  let component: GeneCardComponent;
  let fixture: ComponentFixture<GeneCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeneCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('orders downregulated metadata before upregulated metadata', () => {
    expect(component.progressbar_colors).toEqual([
      component.sig_dn_color,
      component.sli_dn_color,
      component.no_change_color,
      component.sli_up_color,
      component.sig_up_color,
      component.no_sig_fit_color
    ]);
    expect(component.labels).toEqual([
      'Significantly downregulated',
      'Slightly downregulated',
      'No change',
      'Slightly upregulated',
      'Significantly upregulated',
      'No significant fit'
    ]);
  });
});
