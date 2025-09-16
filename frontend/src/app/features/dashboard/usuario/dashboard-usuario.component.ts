import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-usuario',
  templateUrl: './dashboard-usuario.component.html',
  styleUrls: ['./dashboard-usuario.component.scss']
})
export class DashboardUsuarioComponent implements OnInit {
  username: string = 'Javier'; // Valor por defecto
  empresaRuc: string = '';

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Obtener información del usuario actual
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username = user.name || user.username || 'Javier';
    }

    // Obtener el RUC de la URL
    this.empresaRuc = this.route.snapshot.params['ruc'] || '';
    console.log('Dashboard Usuario - RUC obtenido:', this.empresaRuc);
  }

  logout(): void {
    this.authService.logout();
  }

  shouldShowWelcome(): boolean {
    // Mostrar bienvenida solo cuando estamos en la ruta base sin rutas hijas activas
    const currentUrl = this.router.url;
    console.log('URL actual en shouldShowWelcome:', currentUrl);
    
    // Verificar si estamos en la ruta base del dashboard
    const basePattern = `/usuario/${this.empresaRuc}/dashboard`;
    return currentUrl === basePattern || currentUrl === '/dashboard/usuario';
  }

  // Método para navegar a módulos específicos
  navigateToModule(moduleName: string): void {
    if (this.empresaRuc) {
      this.router.navigate([`/usuario/${this.empresaRuc}/dashboard/${moduleName}`]);
    } else {
      this.router.navigate([`/dashboard/usuario/${moduleName}`]);
    }
  }
}