import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HTTP_INTERCEPTORS, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { AppRoutingModule, routingComponents } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchComponent } from './components/search/search.component';
import { HomeComponent } from './components/home/home.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IgvComponent } from './components/igv/igv.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { GeneCardComponent } from './components/gene-card/gene-card.component';
import { MapsComponent } from './components/maps/maps.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { GoComponent } from './components/go/go.component';
import { LoginComponent } from './components/login/login.component';
import { ChangelogComponent } from './components/changelog/changelog.component';
import { FooterComponent } from './components/footer/footer.component';
import { SettingsComponent } from './components/settings/settings.component';
import { CommonModule } from '@angular/common';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { AllCommunityModule } from 'ag-grid-community';

@NgModule({ declarations: [
        AppComponent,
        routingComponents,
        SearchComponent,
        HomeComponent,
        IgvComponent,
        GeneCardComponent,
        MapsComponent,
        NavbarComponent,
        GoComponent,
        LoginComponent,
        ChangelogComponent,
        FooterComponent,
        SettingsComponent
    ],
    bootstrap: [AppComponent], imports: [
        BrowserModule,
        CommonModule,
        AgGridModule,
        AppRoutingModule,
        HttpClientModule,
        NgLabelTemplateDirective,
        NgOptionTemplateDirective,
        NgSelectComponent,
        BrowserAnimationsModule,
        NgApexchartsModule,
        FormsModule,
        ReactiveFormsModule], providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }
