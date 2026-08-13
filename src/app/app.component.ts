import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from './components/navbar/navbar.component';
import { fromEvent, debounceTime, takeUntil, Subject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit {

  colorPreference: number = localStorage["colorPreference"] ? localStorage["colorPreference"] : 1;
  fontSize: number = localStorage["fontSize"] ? localStorage["fontSize"] : 0;
  highContrast: number = localStorage["highContrast"] ? localStorage["highContrast"] : 1;
  defLanguage: string = localStorage["defLanguage"] ?? 'def';
  navHeight = 0;
  private destroy$ = new Subject<void>();
  @ViewChild(NavbarComponent, {static: false}) navbar!: NavbarComponent;
  constructor(private t: TranslateService) {
    this.t.addLangs(["en-us", "zh-cn", "zh-hk", "ja-jp"]);
    this.t.use(this.resolveLanguage(this.defLanguage));
  }

  private resolveLanguage(preference: string): string {
    if (preference !== 'def' && this.t.langs.includes(preference)) return preference;

    const browserLanguage = navigator.language.toLowerCase();
    if (this.t.langs.includes(browserLanguage)) return browserLanguage;
    if (browserLanguage.startsWith('zh')) {
      return /-(hk|tw|mo)/.test(browserLanguage) ? 'zh-hk' : 'zh-cn';
    }
    if (browserLanguage.startsWith('ja')) return 'ja-jp';
    return 'en-us';
  }

  ngOnInit(): void {
    this.setFontSize();
    this.setColorTheme();
    this.setContrast();
  }

  ngAfterViewInit(): void {
    this.reCalcNavHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.reCalcNavHeight());
    console.log(this.navHeight)
  }

  private reCalcNavHeight(): void {
    this.navHeight = this.navbar.height + 8;
  }



  ngOnDestory(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFontSize(): void {
    document.body.style.fontSize = ((this.fontSize / 20 + 1) * 100).toFixed(0) + '%';
  }

  setContrast(): void {
    document.body.style.filter = this.highContrast == 2 ? 'contrast(2)' : 'none';
  }

  setColorTheme(): void {
    // Light is the default. Only an explicit dark preference (2) yields dark;
    // the OS prefers-color-scheme is intentionally ignored (the "system" option
    // was removed from settings because it caused coloring issues).
    if (this.colorPreference == 2) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else document.documentElement.setAttribute("data-bs-theme", "light");
  }

  getColorTheme(): boolean {
    return this.colorPreference == 2;
  }
  title = 'Mouse Cardiac Regeneration Database';
}

export const AppVersion = "2.2512.01.1";
export const AppCompileDate = "20251204";
export const AppBranch = "main";
export const AppCitation = "Shea, A., Cui, J., Li, M., Leonard, R. J., Bartz, J., Nguyen, T., Zhang, J., Garry, D. J., & Dong, X. (2025). Mouse Cardiac Regeneration Database (MCAREDB): a single-cell atlas of neonatal cardiac regeneration in mice. bioRxiv. https://doi.org/10.64898/2025.12.22.696074";
