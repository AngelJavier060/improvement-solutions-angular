import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  isRootRoute = true;
  username: string = 'Javier'; // Valor por defecto
  // Estado de la barra lateral (true = visible)
  isSidebarOpen = true;

  // Rol del usuario
  isSuperAdmin = false;
  isCompanyAdmin = false;
  companyId: number | null = null;
  companyName: string = '';

  constructor(public router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    // Detectar cambios en la ruta para determinar si estamos en la ruta raíz
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isRootRoute = event.url === '/dashboard/admin';
      // En pantallas pequeñas, cerrar el sidebar al navegar
      if (window.innerWidth < 992) {
        this.isSidebarOpen = false;
      }
    });
    
    // Establecer valor inicial
    this.isRootRoute = this.router.url === '/dashboard/admin';
    
    // Configurar estado inicial del sidebar según el tamaño de pantalla
    this.initializeSidebar();
    
    // Escuchar cambios en el tamaño de la ventana
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
    
    // Obtener información del usuario actual
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username = user.name || user.username || 'Javier';
      const roles: string[] = user.roles || [];
      this.isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
      this.isCompanyAdmin = roles.includes('ROLE_ADMIN') && !this.isSuperAdmin;

      // Si es admin de empresa, obtener su empresa
      if (this.isCompanyAdmin && user.businesses && user.businesses.length > 0) {
        this.companyId = user.businesses[0].id;
        this.companyName = user.businesses[0].name || '';
        // Si está en la ruta raíz del admin, redirigir a su empresa
        if (this.router.url === '/dashboard/admin') {
          this.router.navigate([`/dashboard/admin/empresas/admin/${this.companyId}`], { replaceUrl: true });
        }
      }
    }
  }

  // Inicializar el sidebar con la preferencia guardada
  private initializeSidebar(): void {
    if (window.innerWidth < 992) {
      // En móviles/tablets, el sidebar empieza cerrado
      this.isSidebarOpen = false;
    } else {
      // En desktop, usar la preferencia guardada o abierto por defecto
      const savedPreference = localStorage.getItem('admin-sidebar-state');
      this.isSidebarOpen = savedPreference ? JSON.parse(savedPreference) : true;
    }
  }

  // Verificar el tamaño de pantalla y ajustar el sidebar
  private checkScreenSize(): void {
    if (window.innerWidth < 992) {
      // En móviles/tablets, el sidebar empieza cerrado
      this.isSidebarOpen = false;
    } else {
      // En desktop, usar la preferencia guardada o abierto por defecto
      const savedPreference = localStorage.getItem('admin-sidebar-state');
      this.isSidebarOpen = savedPreference ? JSON.parse(savedPreference) : true;
    }
  }

  // Guardar la preferencia del usuario
  private saveSidebarPreference(): void {
    // Solo guardar preferencia en desktop
    if (window.innerWidth >= 992) {
      localStorage.setItem('admin-sidebar-state', JSON.stringify(this.isSidebarOpen));
    }
  }

  logout(): void {
    this.authService.logout();
  }

  navigateToUsers(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Navegando a usuarios...');
    this.router.navigate(['/dashboard/admin/usuarios']).then(success => {
      if (success) {
        console.log('Navegación exitosa a usuarios');
      } else {
        console.error('Error en la navegación a usuarios');
      }
    });
  }

  // Alterna la visibilidad del sidebar
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    // Guardar la preferencia del usuario
    this.saveSidebarPreference();
  }
}