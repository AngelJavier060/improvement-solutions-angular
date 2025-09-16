import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RucGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    console.log('RucGuard - Verificando acceso a ruta con RUC:', state.url);
    
    // Verificar autenticación básica
    if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado - Redirigiendo a login');
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Obtener RUC de la ruta
    const rucFromRoute = route.paramMap.get('ruc');
    console.log('RUC de la ruta:', rucFromRoute);

    // Obtener usuario actual
    const currentUser = this.authService.getCurrentUser();
    console.log('Usuario actual:', currentUser);

    if (!currentUser) {
      console.log('No se pudo obtener información del usuario');
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Verificar si el usuario tiene acceso a la empresa con este RUC
    if (currentUser.business && currentUser.business.ruc === rucFromRoute) {
      console.log('Acceso autorizado - RUC coincide');
      return true;
    }

    // Si no tiene acceso, redirigir según su empresa
    if (currentUser.business?.ruc) {
      console.log('Redirigiendo a su empresa:', currentUser.business.ruc);
      this.router.navigate([`/${currentUser.business.ruc}/dashboard`]);
    } else {
      console.log('Usuario sin empresa asociada - Redirigiendo a login');
      this.router.navigate(['/auth/login']);
    }

    return false;
  }
}
