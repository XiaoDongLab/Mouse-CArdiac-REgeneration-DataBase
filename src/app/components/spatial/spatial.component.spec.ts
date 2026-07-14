import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpatialComponent } from './spatial.component';

describe('SpatialComponent', () => {
  let component: SpatialComponent;
  let fixture: ComponentFixture<SpatialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpatialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpatialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
