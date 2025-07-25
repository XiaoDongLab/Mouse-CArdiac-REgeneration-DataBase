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

  colorPreference: number = localStorage["colorPreference"] ? localStorage["colorPreference"] : 0;
  fontSize: number = localStorage["fontSize"] ? localStorage["fontSize"] : 0;
  highContrast: number = localStorage["highContrast"] ? localStorage["highContrast"] : 1;
  defLanguage: string = localStorage["defLanguage"] ?? 'def';
  navHeight = 0;
  private destroy$ = new Subject<void>();
  @ViewChild(NavbarComponent, {static: false}) navbar!: NavbarComponent;
  constructor(private t: TranslateService) {
    this.t.addLangs(["en-us", "zh-cn", "zh-hk", "ja-jp"]);
    const userLang = navigator.language.toLowerCase();
    this.t.use(this.defLanguage === 'def' ? (this.t.langs.includes(userLang) ? userLang : 'en-us') : this.defLanguage);
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
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark && this.colorPreference == 0 || this.colorPreference == 2) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else document.documentElement.setAttribute("data-bs-theme", "light");
  }

  getColorTheme(): boolean {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return (prefersDark && this.colorPreference == 0 || this.colorPreference == 2);
  }
  static Version = "2.2507.11.0";
  static CompileDate = "20250724";
  static Branch = "feature-i18n"
  title = 'Mouse Cardiac Regeneration Database';
}
