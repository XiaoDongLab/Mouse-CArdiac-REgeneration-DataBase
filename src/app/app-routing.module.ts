import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchComponent } from './components/search/search.component';
import { IgvComponent } from './components/igv/igv.component';
import { MapsComponent } from './components/maps/maps.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { GoComponent } from './components/go/go.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { SettingsComponent } from './components/settings/settings.component';
import { DocumentationPageComponent } from './components/documentation-page/documentation-page.component'; // Correct import
import { ExpressionPageComponent } from './components/expression-page/expression-page.component'; // Correct import


const routes: Routes = [
  // Public route
  { path: 'login', component: LoginComponent },
  
  // Protected routes
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'search', component: SearchComponent, canActivate: [AuthGuard] },
  { path: 'go', component: GoComponent, canActivate: [AuthGuard] },
  { path: 'igv', component: IgvComponent, canActivate: [AuthGuard] },
  { path: 'maps', component: MapsComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard]},

  { path: 'documentation', component: DocumentationPageComponent, canActivate: [AuthGuard] },
  { path: 'expression', component: ExpressionPageComponent, data: { title: 'Gene Expression Visualization' } },


  
  // Default and wildcard routes now redirect to '/home'
  // If the user is not logged in, your AuthGuard should handle the redirection to '/login'
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

export const routingComponents = [
  HomeComponent,
  SearchComponent,
  GoComponent,
  IgvComponent,
  SettingsComponent,
  LoginComponent,
  DocumentationPageComponent, // Add new component
  ExpressionPageComponent
];
