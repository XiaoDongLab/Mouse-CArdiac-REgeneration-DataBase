import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ImageService } from 'src/app/services/image.service';
import { DatabaseService } from 'src/app/services/database.service';
import { ApexNonAxisChartSeries, ApexResponsive, ApexChart, ApexLegend, ApexDataLabels, ApexPlotOptions, ApexTheme, ApexStroke } from "ng-apexcharts";
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppCitation } from 'src/app/app.component';
import { NgbCarouselModule, NgbSlideEvent, NgbSlideEventSource } from '@ng-bootstrap/ng-bootstrap';

export function httpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '../../../assets/locale/', '.json');
}

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  legend: ApexLegend;
  data_labels: ApexDataLabels;
  options: ApexPlotOptions;
  theme: ApexTheme;
  stroke: ApexStroke;
};

interface GuideImage {
  src: string;
  alt: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  readonly guideCarouselAutoplayIntervalMs = 5000;
  readonly genomeGuideImages: GuideImage[] = [
    {
      src: '../../../assets/images/Genome_browser_1.png',
      alt: 'Genome browser track selection and locus navigation guide'
    },
    {
      src: '../../../assets/images/Genome_browser_2.png',
      alt: 'Genome browser differential-expression gene card guide'
    },
    {
      src: '../../../assets/images/Genome_browser_3.png',
      alt: 'Genome browser gene detail visualization guide'
    }
  ];
  readonly spatialGuideImages: GuideImage[] = [
    {
      src: '../../../assets/images/Spatial_1.png',
      alt: 'Spatial transcriptomics sample and visualization controls guide'
    },
    {
      src: '../../../assets/images/Spatial_2.png',
      alt: 'Spatial transcriptomics comparison and spot inspection guide'
    }
  ];
  preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  is_https: boolean = false;
  AppCitation: string = AppCitation;
  copiedText: string = '';
  popoverInstance: any;
  guideCarouselTouched = false;
  @ViewChild('popoverBtn') popoverBtn!: ElementRef;

  constructor(public t: TranslateService) {
    ModuleRegistry.registerModules([AllCommunityModule]);
    this.is_https = window.location.protocol === 'https:' ? true : false;
  }

  ngAfterViewInit(): void {

  }

  ngOnInit(): void {

  }


  ngOnChanges(): void {
    this.preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  get guideCarouselInterval(): number {
    return this.guideCarouselTouched ? 0 : this.guideCarouselAutoplayIntervalMs;
  }

  stopGuideCarouselAutoplay(): void {
    this.guideCarouselTouched = true;
  }

  onGuideCarouselSlide(event: NgbSlideEvent): void {
    if (event.source && event.source !== NgbSlideEventSource.TIMER) {
      this.stopGuideCarouselAutoplay();
    }
  }

  copyCitation(): void {
    navigator.clipboard.writeText(AppCitation);
  }
}
