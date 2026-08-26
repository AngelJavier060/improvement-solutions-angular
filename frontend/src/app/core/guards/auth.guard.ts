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

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/usuario-login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true
      });
      return false;
    }

    // Fase D: trabajador solo puede usar su portal (no /usuario ni /dashboard/admin)
    const isEmployeeOnly = this.authService.hasRole('ROLE_EMPLOYEE')
      && !this.authService.hasRole('ROLE_ADMIN')
      && !this.authService.hasRole('ROLE_SUPER_ADMIN');
    if (isEmployeeOnly) {
      const url = state.url || '';
      const allowed = url.startsWith('/dashboard/empleado')
        || url.startsWith('/auth/');
      if (!allowed) {
        this.router.navigate(['/dashboard/empleado'], { replaceUrl: true });
        return false;
      }
    }

    // role (uno) o roles (cualquiera)
    const requiredRoles = this.resolveRequiredRoles(route);
    if (requiredRoles.length > 0) {
      const hasAny = requiredRoles.some(r => this.authService.hasRole(r));
      if (!hasAny) {
        this.redirectByRole();
        return false;
      }
    }

    return true;
  }

  private resolveRequiredRoles(route: ActivatedRouteSnapshot): string[] {
    if (route.data?.['roles'] && Array.isArray(route.data['roles'])) {
      return route.data['roles'] as string[];
    }
    if (route.data?.['role']) {
      return [route.data['role'] as string];
    }
    return [];
  }

  private redirectByRole(): void {
    if (this.authService.hasRole('ROLE_SUPER_ADMIN')) {
      this.router.navigate(['/dashboard/admin'], { replaceUrl: true });
      return;
    }
    if (this.authService.hasRole('ROLE_ADMIN')) {
      const user = this.authService.getCurrentUser();
      const companyId = user?.businesses?.[0]?.id;
      if (companyId) {
        this.router.navigate([`/dashboard/admin/empresas/admin/${companyId}`], { replaceUrl: true });
      } else {
        this.router.navigate(['/dashboard/admin'], { replaceUrl: true });
      }
      return;
    }
    if (this.authService.hasRole('ROLE_EMPLOYEE')) {
      this.router.navigate(['/dashboard/empleado'], { replaceUrl: true });
      return;
    }
    // Usuario consulta u otros con empresa
    const dest = this.authService.resolvePostLoginUrl();
    this.router.navigateByUrl(dest, { replaceUrl: true });
  }
}
