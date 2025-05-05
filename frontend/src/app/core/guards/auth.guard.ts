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
    
    // Verificar si el usuario está autenticado
    if (this.authService.isLoggedIn()) {
      
      // Si la ruta requiere un rol específico, verificar que el usuario lo tenga
      if (route.data && route.data['role']) {
        if (this.authService.hasRole(route.data['role'])) {
          return true;
        } else {
          // Si el usuario no tiene el rol requerido, redirigir a donde corresponda
          if (this.authService.hasRole('ROLE_ADMIN')) {
            this.router.navigate(['/dashboard/admin']);
          } else {
            this.router.navigate(['/dashboard/usuario']);
          }
          return false;
        }
      }
      
      // Si no hay requisito de rol, permitir acceso
      return true;
    }
    
    // Si no está autenticado, redirigir a la página principal
    this.router.navigate(['/']);
    return false;
  }
}