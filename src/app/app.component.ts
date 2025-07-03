import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavbarComponent } from './components/navbar/navbar.component';
import { fromEvent, debounceTime, takeUntil, Subject } from 'rxjs';

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
  navHeight = 0;
  private destroy$ = new Subject<void>();
  @ViewChild(NavbarComponent, {static: false}) navbar!: NavbarComponent;
  constructor() {

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
  static Version = "1.2507.13.0";
  static CompileDate = "2 July 2025";
  title = 'Mouse Cardiac Regeneration Database';
}
