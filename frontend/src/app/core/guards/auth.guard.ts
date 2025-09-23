import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    
    console.log('AuthGuard - Ruta actual:', state.url);
    console.log('AuthGuard - Datos de ruta:', route.data);
    
    // Verificar si el usuario está autenticado
    if (!this.authService.isLoggedIn()) {
      console.log('Usuario no autenticado - Redirigiendo a login');
      this.router.navigate(['/auth/usuario-login'], { 
        queryParams: { returnUrl: state.url },
        replaceUrl: true 
      });
      return false;
    }
    
    // Si la ruta requiere un rol específico, verificar que el usuario lo tenga
    if (route.data && route.data['role']) {
      const requiredRole = route.data['role'];
      console.log('Rol requerido:', requiredRole);
      console.log('Roles del usuario:', this.authService.getUserRoles());
      
      if (!this.authService.hasRole(requiredRole)) {
        console.log('Usuario no tiene el rol requerido');
        // Redirigir según el rol del usuario
        if (this.authService.hasRole('ROLE_ADMIN')) {
          this.router.navigate(['/dashboard/admin'], { replaceUrl: true });
        } else {
          this.router.navigate(['/dashboard/usuario'], { replaceUrl: true });
        }
        return false;
      }
    }
    
    return true;
  }
}