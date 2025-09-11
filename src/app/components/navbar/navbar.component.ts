import { Component, OnInit, ViewChild, TemplateRef, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, Event } from '@angular/router';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { title } from 'process';
import { AppComponent } from 'src/app/app.component';
import { fromEvent, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateService } from '@ngx-translate/core';

export function httpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '../../../assets/locale/', '.json');
}

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    standalone: false
})
export class NavbarComponent implements OnInit {
  tabs: any[];
  selected_path: string = '';
  navHeight = 0;
  navbarExpanded = false;
  private destroy$ = new Subject<void>();

  @ViewChild('customTabTemplate', { static: true }) customTabTemplate: TemplateRef<any>;
  @ViewChild('navbarTop', {static: false}) navbar: ElementRef<HTMLElement>;

  constructor(private router: Router, private route: ActivatedRoute, private title: Title, private t: TranslateService) {
    this.tabs = [
      {
        id: 0,
        text: 'navbar.home',
        path: 'home',
        icon: 'fa-home',
        customClass: '.nav-link' // Add custom class identifier.
      },
      {
        id: 1,
        text: 'navbar.genome',
        icon: 'fa-server',
        path: 'igv'
      },
      {
        id: 2,
        text: 'navbar.expression',
        icon: 'fa-chart-simple',
        path: 'expression'
      },
      {
        id: 3,
        text: 'navbar.pathway',
        icon: 'fa-magnifying-glass',
        path: 'go'
      },
      
      {
        id: 4,
        text: 'navbar.download',
        icon: 'fa-download',
        path: 'search'
      },
      {
        id: 5,
        text: 'navbar.documentation',
        icon: 'fa-file',
        path: 'documentation'  
      },
       {
        id: 6,
        text: 'navbar.settings',
        icon: 'fa-gear',
        path: 'settings'
      },
    ];
  }

  private reCalcNavHeight(): void {
    this.navHeight = this.navbar.nativeElement.offsetHeight;
  }

  ngAfterViewInit(): void {
    this.reCalcNavHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.reCalcNavHeight());
    console.log(this.navHeight)
  }

  get height(): number {
    return this.navHeight;
  }

  ngOnDestory(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.selected_path = event.urlAfterRedirects.split('/')[1];
      this.updateSelectedTab();
    });
    this.selected_path = this.router.url.split('/')[1];
    this.updateSelectedTab();
    document.getElementById("shadow-bg")!.style.display = "none";
  }

  selectTab(index: number) {
    const selectedTab = this.tabs[index];
    this.title.setTitle(this.t.instant(selectedTab.text) + " - MCareDB"); 
    this.router.navigate([selectedTab.path]);
  }

  updateSelectedTab() {
    const tabIndex = this.tabs.findIndex(tab => tab.path === this.selected_path);
    if (tabIndex !== -1) {
      setTimeout(() => {
        const tabElement = document.querySelectorAll('.dx-tab')[tabIndex] as HTMLElement;
        if (tabElement) {
          tabElement.click();
        }
      }, 0);
    }
  }

  onDarkModeSwitchClick() {
    if (document.documentElement.getAttribute('data-bs-theme') == 'dark') {
      document.documentElement.setAttribute('data-bs-theme', 'light')
    }
    else {
      document.documentElement.setAttribute('data-bs-theme', 'dark')
    }
  }

  onDarkModeBtnClick() {
    if (document.documentElement.getAttribute('data-bs-theme') == 'dark') {
      document.documentElement.setAttribute('data-bs-theme', 'light');
      document.getElementById("darkModeBtn")!.innerHTML = "<i class=\"fa fa-cloud-sun\"><\/i>";
    }
    else {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.getElementById("darkModeBtn")!.innerHTML = "<i class=\"fa fa-moon\"><\/i>";
    }
  }

  showToastControl(control_id: string): void {
    // Don't use the default method of bootstrap here. I don't know why but
    // if you try to use it, probably any else collapse elements won't
    // function normally.
    const changelogToast = document.getElementById(control_id);
    document.getElementById("shadow-bg")!.style.display = "block";
    changelogToast!.style.display = "flex";
  }

  hideToastControl(control_id: string): void {
    const changelogToast = document.getElementById(control_id);
    document.getElementById("shadow-bg")!.style.display = "none";
    changelogToast!.style.display = "none";
  }
}


