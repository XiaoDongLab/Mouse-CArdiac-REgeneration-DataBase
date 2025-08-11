import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionPlotComponent } from './expression-plot.component';

describe('ExpressionPlotComponent', () => {
  let component: ExpressionPlotComponent;
  let fixture: ComponentFixture<ExpressionPlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpressionPlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpressionPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
