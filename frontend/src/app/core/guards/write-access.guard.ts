import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Fase C: bloquea rutas de escritura (nueva/editar) para usuarios de solo consulta.
 * Admin y Superadmin pasan; ROLE_USER consulta no.
 */
@Injectable({
  providedIn: 'root'
})
export class WriteAccessGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.canWrite()) {
      return true;
    }

    // Volver al dashboard del módulo o welcome
    const url = state.url || '';
    const m = url.match(/^(\/usuario\/[^/]+)/);
    if (m) {
      this.router.navigate([`${m[1]}/welcome`], { replaceUrl: true });
    } else {
      this.router.navigate(['/'], { replaceUrl: true });
    }
    return false;
  }
}
