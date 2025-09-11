import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneCardDetailComponent } from './gene-card-detail.component';

describe('GeneCardDetailComponent', () => {
  let component: GeneCardDetailComponent;
  let fixture: ComponentFixture<GeneCardDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneCardDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneCardDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
