import { Component, OnInit } from '@angular/core';
import { AppComponent } from 'src/app/app.component';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css'],
    standalone: false
})
export class SettingsComponent implements OnInit {

  Version: string = "";
  CompileDate: string = "";
  colorPreference: number = localStorage["colorPreference"] ? localStorage["colorPreference"] : 0;
  fontSize: number = localStorage["fontSize"] ? localStorage["fontSize"] : 0;
  highContrast: number = localStorage["highContrast"] ? localStorage["highContrast"] : 1;
  constructor() { }

  ngOnInit(): void {
    this.Version = AppComponent.Version;
    this.CompileDate = AppComponent.CompileDate;
    this.setColorTheme();
    this.setContrast();
    document.body.style.fontSize = ((this.fontSize / 20 + 1) * 100).toFixed(0) + '%';
  }

  setColorTheme(): void {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark && this.colorPreference == 0 || this.colorPreference == 2) {
        document.documentElement.setAttribute("data-bs-theme", "dark");
    } else document.documentElement.setAttribute("data-bs-theme", "light");
  }

  setContrast(): void {
    document.body.style.filter = this.highContrast == 2 ? 'contrast(2)': 'none';
  }

  colorPreferenceChange(): void {
    this.setColorTheme();
    localStorage["colorPreference"] = this.colorPreference;
  }

  fontSizeChange(): void {
    document.body.style.fontSize = ((this.fontSize / 20 + 1) * 100).toFixed(0) + '%';
    localStorage["fontSize"] = this.fontSize;
  }

  contrastChange(): void {
    this.setContrast();
    localStorage["highContrast"] = this.highContrast;
  }

}
