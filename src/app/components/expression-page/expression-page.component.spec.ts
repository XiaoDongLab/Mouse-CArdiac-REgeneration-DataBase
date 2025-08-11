import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpressionPageComponent } from './expression-page.component';

describe('ExpressionPageComponent', () => {
  let component: ExpressionPageComponent;
  let fixture: ComponentFixture<ExpressionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpressionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpressionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
