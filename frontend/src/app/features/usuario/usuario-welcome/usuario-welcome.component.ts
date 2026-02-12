import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FileService } from '../../../services/file.service';
import { BusinessModuleService, BusinessModuleDto } from '../../../services/business-module.service';

@Component({
  selector: 'app-usuario-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './usuario-welcome.component.html',
  styleUrls: ['./usuario-welcome.component.scss']
})
export class UsuarioWelcomeComponent implements OnInit {
  empresaRuc: string = '';
  empresaNombre: string = '';
  usuario: any = null;
  fechaAcceso: string = '';
  empresaLogoUrl: string = '';
  activeModules: BusinessModuleDto[] = [];
  modulesLoaded = false;
  // Códigos de módulo del backend → ruta del frontend
  private moduleRouteMap: { [code: string]: string } = {
    'TALENTO_HUMANO': 'talento-humano',
    'SEGURIDAD_INDUSTRIAL': 'seguridad-industrial',
    'CALIDAD': 'calidad',
    'INVENTARIO': 'inventario'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private fileService: FileService,
    private businessModuleService: BusinessModuleService
  ) {}

  ngOnInit(): void {
    // Obtener fecha actual
    this.fechaAcceso = new Date().toLocaleDateString('es-ES');
    
    // Obtener el RUC de la URL
    this.empresaRuc = this.route.snapshot.params['ruc'];
    
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/usuario-login']);
      return;
    }

    // Obtener información del usuario y empresa
    this.usuario = this.authService.getCurrentUser();
    console.log('Usuario obtenido en welcome:', this.usuario);
    console.log('RUC buscado desde URL:', this.empresaRuc);
    
    // Cargar módulos activos para esta empresa
    this.loadActiveModules();

    // Buscar la empresa con el RUC correspondiente
    if (this.usuario?.businesses && this.usuario.businesses.length > 0) {
      console.log('Empresas disponibles:', this.usuario.businesses);
      const empresaEncontrada = this.usuario.businesses.find((business: any) => business.ruc === this.empresaRuc);
      console.log('Empresa encontrada con RUC', this.empresaRuc, ':', empresaEncontrada);
      
      if (empresaEncontrada) {
        this.empresaNombre = empresaEncontrada.name || empresaEncontrada.businessName || 'Su Empresa';
        console.log('Nombre de empresa asignado:', this.empresaNombre);
        // Resolver URL del logo si existe
        try {
          const path = empresaEncontrada.logo || '';
          this.empresaLogoUrl = path ? this.getLogoUrl(path) : '';
        } catch {
          this.empresaLogoUrl = '';
        }
      } else {
        console.warn('No se encontró empresa con RUC:', this.empresaRuc);
        console.warn('RUCs disponibles:', this.usuario.businesses.map((b: any) => b.ruc));
        this.empresaNombre = 'Empresa no encontrada';
      }
    } else {
      console.warn('Usuario sin empresas asociadas o businesses es null/undefined');
      console.warn('businesses:', this.usuario?.businesses);
      this.empresaNombre = 'Sin empresa asociada';
    }
  }

  // Método para cerrar sesión
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Método para ir al dashboard (si lo implementas después)
  goToDashboard(): void {
    // Por ahora solo muestra un mensaje
    alert('Dashboard en desarrollo. Por el momento solo tienes acceso a esta página de bienvenida.');
  }

  // Cargar módulos activos desde el backend
  loadActiveModules(): void {
    if (!this.empresaRuc) return;
    this.businessModuleService.getActiveModulesByRuc(this.empresaRuc).subscribe({
      next: (modules) => {
        this.activeModules = modules;
        this.modulesLoaded = true;
        console.log('[Welcome] Módulos activos para', this.empresaRuc, ':', modules.map(m => m.moduleCode));
      },
      error: (err) => {
        console.warn('[Welcome] Error cargando módulos activos:', err);
        this.modulesLoaded = true;
      }
    });
  }

  // Verificar si un módulo está activo para la empresa
  isModuleActive(routeName: string): boolean {
    if (!this.modulesLoaded) return false; // Mientras carga, ocultar todos
    // Buscar el código del módulo que corresponde a esta ruta
    const code = Object.entries(this.moduleRouteMap)
      .find(([_, route]) => route === routeName)?.[0];
    if (!code) return false; // Si no está en el mapa de módulos del sistema, no mostrar
    return this.activeModules.some(m => m.moduleCode === code && m.effectivelyActive);
  }

  // Verificar si hay al menos un módulo visible (controlado o no)
  hasAnyVisibleModule(): boolean {
    if (!this.modulesLoaded) return false;
    return this.activeModules.length > 0;
  }

  // Obtener info de tiempo para un módulo por su ruta
  getModuleTimeInfo(routeName: string): { isUnlimited: boolean; daysRemaining: number } {
    const code = Object.entries(this.moduleRouteMap)
      .find(([_, route]) => route === routeName)?.[0];
    if (!code) return { isUnlimited: true, daysRemaining: 0 };
    const mod = this.activeModules.find(m => m.moduleCode === code);
    if (!mod) return { isUnlimited: true, daysRemaining: 0 };
    if (!mod.expirationDate) return { isUnlimited: true, daysRemaining: 0 };
    const remaining = Math.max(0, Math.ceil((new Date(mod.expirationDate).getTime() - Date.now()) / 86400000));
    return { isUnlimited: false, daysRemaining: remaining };
  }

  isModuleUnlimited(routeName: string): boolean {
    return this.getModuleTimeInfo(routeName).isUnlimited;
  }

  getModuleDaysRemaining(routeName: string): number {
    return this.getModuleTimeInfo(routeName).daysRemaining;
  }

  // Método para navegar a los módulos específicos
  goToModule(moduleName: string): void {
    // Mapeo de nombres de módulos
    const moduleNames: { [key: string]: string } = {
      'inventario': 'Inventario',
      'talento-humano': 'Talento Humano',
      'seguridad-industrial': 'Seguridad Industrial',
      'medico': 'Módulo Médico',
      'calidad': 'Control de Calidad',
      'mantenimiento': 'Mantenimiento',
      'medio-ambiente': 'Medio Ambiente',
      'produccion': 'Producción',
      'logistica': 'Logística'
    };

    const moduloNombre = moduleNames[moduleName] || moduleName;

    // Verificar si el módulo está activo
    if (!this.isModuleActive(moduleName)) {
      alert(`El módulo ${moduloNombre} no está habilitado para ${this.empresaNombre}.\n\nContacte al administrador del sistema para activar este módulo.`);
      return;
    }
    
    // Rutas implementadas: inventario, talento-humano, seguridad-industrial
    if (moduleName === 'inventario') {
      this.router.navigate([`/usuario/${this.empresaRuc}/inventario`]);
      return;
    } else if (moduleName === 'talento-humano') {
      this.router.navigate([`/usuario/${this.empresaRuc}/talento-humano`]);
      return;
    } else if (moduleName === 'seguridad-industrial') {
      this.router.navigate([`/usuario/${this.empresaRuc}/seguridad-industrial`]);
      return;
    }
    
    // Otros módulos: mensaje temporal
    alert(`Accediendo al módulo: ${moduloNombre}\n\nEste módulo está en desarrollo. Pronto estará disponible para la empresa ${this.empresaNombre}.`);
  }

  /**
   * Obtiene la URL del logo de empresa con compatibilidad de rutas
   */
  private getLogoUrl(logoPath: string): string {
    if (!logoPath) return '';
    // URL absoluta
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      const token = localStorage.getItem('auth_token');
      let url = logoPath;
      if (token) url += (url.includes('?') ? '&' : '?') + 'token=' + token;
      url += (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
      return url;
    }
    // Ruta que contiene logos/
    if (logoPath.includes('logos/')) {
      const filename = logoPath.split('/').pop() || '';
      return this.fileService.getFileUrlFromDirectory('logos', filename, true);
    }
    // Solo nombre de archivo
    if (!logoPath.includes('/')) {
      return this.fileService.getFileUrlFromDirectory('logos', logoPath, true);
    }
    // Ruta general
    return this.fileService.getFileUrl(logoPath);
  }
}
