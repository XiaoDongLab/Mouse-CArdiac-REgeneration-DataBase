// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (!environment.requireAuth) {   // 直接放行
      return true;
    }
    else if (this.authService.isLoggedIn()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
