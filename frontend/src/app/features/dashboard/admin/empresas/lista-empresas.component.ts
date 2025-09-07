import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Business } from '../../../../models/business.model';
import { BusinessService } from '../../../../services/business.service';
import { FileService } from '../../../../services/file.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { NuevaEmpresaComponent } from './nueva-empresa.component';

@Component({
  selector: 'app-lista-empresas',
  templateUrl: './lista-empresas.component.html',
  styleUrls: ['./lista-empresas.component.scss']
})
export class ListaEmpresasComponent implements OnInit {
  empresas: Business[] = [];
  empresasFiltradas: Business[] = [];
  loading = true;
  error = '';
  
  // Controles de filtrado
  searchControl = new FormControl('');
  statusFilter = new FormControl('all');
  sectorFilter = new FormControl('all');
  
  // Opciones de filtrado
  sectores: string[] = [];
  
  // Opciones de visualización
  viewMode: 'list' | 'grid' = 'grid';

  // Estadísticas de empresas
  totalEmpresas = 0;

  // Cache de URLs de logos para evitar regeneración constante
  private logoUrlCache: Map<string, string> = new Map();

  constructor(
    private businessService: BusinessService,
    private fileService: FileService,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.cargarEmpresas();
    
    // Configurar buscador con debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.aplicarFiltros();
      });
      
    // Suscripción a cambios de filtros
    this.statusFilter.valueChanges.subscribe(() => this.aplicarFiltros());
    this.sectorFilter.valueChanges.subscribe(() => this.aplicarFiltros());
  }

  getEmpresasActivas(): number {
    return this.empresas.filter(e => e.status === 'active' || !e.status).length;
  }

  getEmpresasPendientes(): number {
    return this.empresas.filter(e => e.status === 'pending').length;
  }

  getEmpresasInactivas(): number {
    return this.empresas.filter(e => e.status === 'inactive').length;
  }

  cargarEmpresas(): void {
    this.loading = true;
    this.error = '';

    if (!this.authService.isLoggedIn()) {
      console.log('Usuario no autenticado, redirigiendo a login');
      this.router.navigate(['/auth/login']);
      return;
    }    
    
    this.businessService.getAll().subscribe({
      next: (data) => {
        console.log('Empresas cargadas exitosamente:', data.length);
        this.empresas = data;
        this.empresasFiltradas = [...data];
        this.totalEmpresas = data.length;
        this.extractSectores();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar empresas:', error);
        this.loading = false;
        
        if (error.status === 403) {
          this.error = 'No tienes permisos para acceder a esta sección';
          this.router.navigate(['/dashboard']);
        } else {
          this.error = 'Error al cargar las empresas. Por favor, intente nuevamente.';
        }
      }
    });
  }
  
  aplicarFiltros(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    const status = this.statusFilter.value || 'all';
    const sector = this.sectorFilter.value || 'all';
    
    this.empresasFiltradas = this.empresas.filter(empresa => {
      // Filtrar por término de búsqueda
      const cumpleBusqueda = searchTerm === '' || 
                            empresa.name.toLowerCase().includes(searchTerm) ||
                            empresa.ruc.toLowerCase().includes(searchTerm) ||
                            (empresa.nameShort?.toLowerCase().includes(searchTerm) || false) ||
                            empresa.email.toLowerCase().includes(searchTerm);
                            
      // Filtrar por estado
      const cumpleStatus = status === 'all' || 
                          (status === 'active' && (empresa.status === 'active' || !empresa.status)) ||
                          (status === empresa.status);
                          
      // Filtrar por sector
      const cumpleSector = sector === 'all' || 
                          (sector === 'no-sector' && !empresa.sector) ||
                          (empresa.sector === sector);
                          
      return cumpleBusqueda && cumpleStatus && cumpleSector;
    });
  }
  
  extractSectores(): void {
    // Extraer sectores únicos de las empresas
    const sectoresSet = new Set<string>();
    
    this.empresas.forEach(empresa => {
      if (empresa.sector) {
        sectoresSet.add(empresa.sector);
      }
    });
    
    this.sectores = Array.from(sectoresSet).sort();
  }
  
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  eliminarEmpresa(id: number): void {
    if (confirm('¿Está seguro de eliminar esta empresa?')) {
      this.businessService.delete(id).subscribe({
        next: () => {
          this.empresas = this.empresas.filter(empresa => empresa.id !== id);
          this.empresasFiltradas = this.empresasFiltradas.filter(empresa => empresa.id !== id);
        },
        error: (error) => {
          console.error('Error al eliminar empresa:', error);
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else {
            alert('Error al eliminar la empresa. Por favor, intente nuevamente.');
          }
        }
      });
    }
  }

  getLogoUrl(logoPath: string): string {
    if (!logoPath) {
      return '';
    }

    // Verificar si ya tenemos la URL en caché
    if (this.logoUrlCache.has(logoPath)) {
      return this.logoUrlCache.get(logoPath)!;
    }

    // Generar la nueva URL con timestamp
    const baseUrl = `${environment.apiUrl}/api/files/logos/`;
    let url: string;

    // Si es una URL completa, extraemos solo el nombre del archivo
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      try {
        const urlObj = new URL(logoPath);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || '';
        url = `${baseUrl}${filename}?v=${Date.now()}`;
      } catch (e) {
        console.error('Error al procesar URL de logo:', e);
        url = logoPath;
      }
    }
    // Si ya contiene logos/ en la ruta, extraemos solo el nombre
    else if (logoPath.includes('logos/')) {
      const filename = logoPath.split('/').pop() || '';
      url = `${baseUrl}${filename}?v=${Date.now()}`;
    }
    // Si es solo un nombre de archivo, lo usamos directamente
    else {
      url = `${baseUrl}${logoPath}?v=${Date.now()}`;
    }

    // Guardar en caché
    this.logoUrlCache.set(logoPath, url);
    return url;
  }

  // Método para limpiar el caché cuando sea necesario
  clearLogoUrlCache(): void {
    this.logoUrlCache.clear();
  }

  openNuevaEmpresaModal(): void {
    const dialogRef = this.dialog.open(NuevaEmpresaComponent, {
      width: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      panelClass: 'custom-modal',
      autoFocus: true,
      disableClose: true,
      position: { top: '50px' }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.cargarEmpresas();
      }
    });
  }
}
