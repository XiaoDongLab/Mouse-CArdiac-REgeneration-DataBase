import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgbCarousel, NgbModule, NgbSlideEvent, NgbSlideEventSource } from '@ng-bootstrap/ng-bootstrap';
import { By } from '@angular/platform-browser';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [
        NgbModule,
        RouterModule.forRoot([]),
        TranslateModule.forRoot()
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the numbered genome-browser and spatial guide images in order', () => {
    expect(component.genomeGuideImages.map(image => image.src)).toEqual([
      '../../../assets/images/Genome_browser_1.png',
      '../../../assets/images/Genome_browser_2.png',
      '../../../assets/images/Genome_browser_3.png'
    ]);
    expect(component.spatialGuideImages.map(image => image.src)).toEqual([
      '../../../assets/images/Spatial_1.png',
      '../../../assets/images/Spatial_2.png'
    ]);
  });

  it('orders user-guide sections like the feature links in the navbar', () => {
    const sections = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-guide-section]')
    ).map(section => section.dataset['guideSection']);

    expect(sections).toEqual(['genome', 'expression', 'spatial', 'pathway', 'download']);
  });

  it('keeps autoplay enabled while slide changes are timer-driven', () => {
    component.onGuideCarouselSlide({ source: NgbSlideEventSource.TIMER } as NgbSlideEvent);

    expect(component.guideCarouselTouched).toBeFalse();
    expect(component.guideCarouselInterval).toBe(5000);
  });

  it('permanently stops autoplay after an arrow is clicked', () => {
    const carousel = fixture.debugElement.query(By.directive(NgbCarousel)).componentInstance as NgbCarousel;
    const nextArrow = fixture.nativeElement.querySelector(
      'ngb-carousel .carousel-control-next'
    ) as HTMLButtonElement;

    expect(carousel.interval).toBe(5000);

    nextArrow.click();
    fixture.detectChanges();

    expect(component.guideCarouselTouched).toBeTrue();
    expect(component.guideCarouselInterval).toBe(0);
    expect(carousel.interval).toBe(0);
  });
});
