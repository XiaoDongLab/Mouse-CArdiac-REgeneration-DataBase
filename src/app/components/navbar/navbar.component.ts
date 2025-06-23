import { Component, OnInit, ViewChild, TemplateRef, ElementRef } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, Event } from '@angular/router';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { title } from 'process';
import { AppComponent } from 'src/app/app.component';
import { fromEvent, Subject } from 'rxjs';

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
  private destroy$ = new Subject<void>();

  @ViewChild('customTabTemplate', { static: true }) customTabTemplate: TemplateRef<any>;
  @ViewChild('navbarTop', {static: false}) navbar: ElementRef<HTMLElement>;

  constructor(private router: Router, private route: ActivatedRoute, private title: Title) {
    this.tabs = [
      {
        id: 0,
        text: 'Home',
        path: 'home',
        icon: 'fa-home',
        customClass: '.nav-link', // Add custom class identifier.
      },
      {
        id: 1,
        text: 'Genome Browser',
        icon: 'fa-server',
        path: 'igv',
      },
      {
        id: 2,
        text: 'Go Term Enrichment',
        icon: 'fa-magnifying-glass',
        path: 'go',
      },
      {
        id: 3,
        text: 'Search & Download',
        icon: 'fa-download',
        path: 'search',
      },
      {
        id: 4,
        text: 'Settings',
        icon: 'fa-gear',
        path: 'settings',
      },
      /* Delete documentation tab {
        id: 4,
        text: 'Documentation',
        icon: 'file',
        path: 'documentation',
      },*/
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
  }

  selectTab(index: number) {
    const selectedTab = this.tabs[index];
    this.title.setTitle(selectedTab.text + " - MCareDB"); 
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
}


