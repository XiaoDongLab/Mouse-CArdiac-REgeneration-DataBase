import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppCitation } from 'src/app/app.component';

export function httpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '../../../assets/locale/', '.json');
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent {
  readonly AppCitation = AppCitation;
  readonly spatialSpots = [
    { id: 1, x: 21, y: 35, color: '#f4b6cf' }, { id: 2, x: 32, y: 24, color: '#d9669d' },
    { id: 3, x: 43, y: 42, color: '#92305f' }, { id: 4, x: 56, y: 25, color: '#c24b86' },
    { id: 5, x: 67, y: 43, color: '#79224f' }, { id: 6, x: 73, y: 59, color: '#d9669d' },
    { id: 7, x: 57, y: 66, color: '#f0a8c6' }, { id: 8, x: 39, y: 69, color: '#a83b70' },
    { id: 9, x: 28, y: 57, color: '#cf588f' }, { id: 10, x: 48, y: 55, color: '#6c1844' }
  ];

  constructor(private readonly router: Router) {}

  openTool(route: string): void {
    this.router.navigate([route]);
  }

  copyCitation(): void {
    navigator.clipboard.writeText(AppCitation);
  }
}
