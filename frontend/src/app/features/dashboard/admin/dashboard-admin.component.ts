import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UserAdminService } from './usuarios/user-admin.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  isRootRoute = true;
  username: string = 'Javier';
  userEmail = '';
  avatarUrl: string | null = null;
  private avatarObjectUrl: string | null = null;
  // Estado de la barra lateral (true = visible)
  isSidebarOpen = true;

  // Rol del usuario
  isSuperAdmin = false;
  isCompanyAdmin = false;
  companyId: number | null = null;
  companyName: string = '';

  constructor(
    public router: Router,
    private authService: AuthService,
    private userAdminService: UserAdminService,
    private http: HttpClient
  ) { }

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
      this.userEmail = user.email || '';
      this.cargarFoto(user.profilePicture);
      if (user.id) {
        this.userAdminService.getUserById(user.id).subscribe({
          next: (fresh) => {
            this.username = fresh?.name || fresh?.username || this.username;
            this.userEmail = fresh?.email || this.userEmail;
            this.cargarFoto(fresh?.profilePicture);
          },
          error: () => {}
        });
      }
      const roles: string[] = user.roles || [];
      this.isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
      this.isCompanyAdmin = roles.includes('ROLE_ADMIN') && !this.isSuperAdmin;

      // Admin de empresa en /dashboard/admin → su pantalla de parámetros
      if (this.isCompanyAdmin && user.businesses && user.businesses.length > 0) {
        this.companyId = user.businesses[0].id;
        this.companyName = user.businesses[0].name || '';
        if (this.router.url === '/dashboard/admin' || this.router.url === '/dashboard/admin/') {
          if (this.companyId) {
            this.router.navigate([`/dashboard/admin/empresas/admin/${this.companyId}`], { replaceUrl: true });
          }
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

  get aulaCompanyId(): number | null {
    const match = this.router.url.match(/\/empresas\/admin\/(\d+)/);
    if (match) return Number(match[1]);
    return this.isCompanyAdmin ? this.companyId : null;
  }

  logout(): void {
    this.authService.logout();
  }

  iniciales(): string {
    const partes = (this.username || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'SA';
    return partes.slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('');
  }

  private fotoDe(path?: string | null): string | null {
    if (!path) return null;
    const limpio = path.replace(/\\/g, '/');
    const nombre = limpio.includes('/') ? limpio.split('/').pop() : limpio;
    if (!nombre) return null;
    return `${environment.apiUrl}/api/files/profiles/${nombre}`;
  }

  private cargarFoto(path?: string | null): void {
    const url = this.fotoDe(path);
    if (!url) return;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (!blob || blob.size === 0) return;
        if (this.avatarObjectUrl) URL.revokeObjectURL(this.avatarObjectUrl);
        this.avatarObjectUrl = URL.createObjectURL(blob);
        this.avatarUrl = this.avatarObjectUrl;
      },
      error: () => {}
    });
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

  /** Módulos operativos: donde se ingresan documentos de empleados */
  goToCompanyOperations(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const user = this.authService.getCurrentUser();
    const ruc = user?.businesses?.[0]?.ruc;
    if (ruc) {
      this.router.navigate([`/usuario/${ruc}/welcome`]);
    }
  }

  // Alterna la visibilidad del sidebar
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    // Guardar la preferencia del usuario
    this.saveSidebarPreference();
  }
}