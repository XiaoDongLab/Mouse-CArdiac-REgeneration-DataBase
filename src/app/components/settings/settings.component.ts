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
  colorPreference: number = localStorage["colorPreference"] ?? 0;
  fontSize: number = localStorage["fontSize"] ?? 0;
  highContrast: number = localStorage["highContrast"] ?? 1;
  showNonsigCluster: boolean = JSON.parse(localStorage["showNogSigCluster"] ?? false) ;
  useYAxisType: number = localStorage["useYAxisType"] ?? 0; // 0 -> -lgP-val; 1 -> P-val;
  constructor() { }

  ngOnInit(): void {
    this.Version = AppComponent.Version;
    this.CompileDate = AppComponent.CompileDate;
    document.getElementById("shadow-bg")!.style.display = "none";
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
  
  CiteClick(): void {
    window.prompt('Citation', 'Abcd, E., 2025, https://mcaredb.org/');
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

  showNonsigClusterChange(): void {
    localStorage["showNogSigCluster"] = this.showNonsigCluster;
    console.log(localStorage["showNogSigCluster"])
  }

  useYAxisChange(): void {
    localStorage["useYAxisType"] = this.useYAxisType;
  }
}
