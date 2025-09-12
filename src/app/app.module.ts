import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { AppRoutingModule, routingComponents } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchComponent } from './components/search/search.component';
import { HomeComponent, httpLoaderFactory } from './components/home/home.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IgvComponent } from './components/igv/igv.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { GeneCardComponent } from './components/gene-card/gene-card.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { GoComponent } from './components/go/go.component';
import { LoginComponent } from './components/login/login.component';
import { ChangelogComponent } from './components/changelog/changelog.component';
import { FooterComponent } from './components/footer/footer.component';
import { SettingsComponent } from './components/settings/settings.component';
import { CommonModule } from '@angular/common';
import { NgLabelTemplateDirective, NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { AllCommunityModule } from 'ag-grid-community';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { DocumentationPageComponent } from './components/documentation-page/documentation-page.component';
import { ExpressionPageComponent } from './components/expression-page/expression-page.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { GeneCardDetailComponent } from "./components/gene-card-detail/gene-card-detail.component";

@NgModule({
    declarations: [
        AppComponent,
        routingComponents,
        SearchComponent,
        HomeComponent,
        IgvComponent,
        GeneCardComponent,
        NavbarComponent,
        GoComponent,
        LoginComponent,
        ChangelogComponent,
        FooterComponent,
        SettingsComponent,
        DocumentationPageComponent,
        ExpressionPageComponent
    ],
    bootstrap: [AppComponent], 
    imports: [
    BrowserModule,
    CommonModule,
    AgGridModule,
    TranslateModule.forRoot({
        defaultLanguage: 'en-us',
        loader: {
            provide: TranslateLoader,
            useFactory: httpLoaderFactory,
            deps: [HttpClient]
        }
    }),
    AppRoutingModule,
    HttpClientModule,
    NgLabelTemplateDirective,
    NgOptionTemplateDirective,
    NgbModule,
    NgSelectComponent,
    BrowserAnimationsModule,
    NgApexchartsModule,
    FormsModule,
    ReactiveFormsModule,
    GeneCardDetailComponent
], providers: [
            { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
            provideHttpClient(withInterceptorsFromDi())
        ]
})
export class AppModule { }
