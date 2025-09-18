// ...existing code...
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { Employee, EmployeeResponse } from '../models/employee.model';
import { environment } from '../../../../../../environments/environment';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';

@Component({
  selector: 'app-gestion-empleados',
  templateUrl: './gestion-empleados.component.html',
  styleUrls: ['./gestion-empleados.component.scss']
})
export class GestionEmpleadosComponent implements OnInit {

  employees: EmployeeResponse[] = [];
  filteredEmployees: EmployeeResponse[] = [];
  searchTerm: string = '';
  loading = false;
  error: string | null = null;
  // Identificadores de empresa (se obtienen de la ruta)
  businessId: number | null = null;
  businessRuc: string | null = null;

  // Modal
  showCreateModal = false;
  showEditModal = false;
  employeeToEdit: EmployeeResponse | null = null;

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private businessContext: BusinessContextService
  ) {}

  ngOnInit(): void {
    // Extraer parámetros recorriendo toda la cadena de rutas ascendentes
    this.extractRouteParams();
    console.log('Business RUC para empleados:', this.businessRuc);
    console.log('Business ID para empleados:', this.businessId);
    this.loadEmployees();

    // Suscribirse a cambios de parámetros para recargar si cambian
    this.route.params.subscribe(() => {
      this.extractRouteParams();
      this.loadEmployees();
    });
    this.route.parent?.params.subscribe(() => {
      this.extractRouteParams();
      this.loadEmployees();
    });
    this.route.parent?.parent?.params.subscribe(() => {
      this.extractRouteParams();
      this.loadEmployees();
    });
  }

  private extractRouteParams(): void {
    const findParamUp = (key: string): string | null => {
      let r: any = this.route;
      while (r) {
        const val = r.snapshot?.params?.[key];
        if (val !== undefined) {
          return val;
        }
        r = r.parent;
      }
      return null;
    };

    const ruc = findParamUp('businessRuc') || findParamUp('ruc');
    const bid = findParamUp('businessId');
    this.businessRuc = ruc || null;
    this.businessId = bid ? parseInt(bid, 10) : this.businessId; // conservar si ya estaba resuelto

    // Fallback extra: intentar parsear el RUC desde la URL si aún no lo tenemos
    if (!this.businessRuc && typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/usuario\/([^/]+)\/dashboard/);
      if (match && match[1]) {
        this.businessRuc = match[1];
        console.log('🔁 RUC extraído desde URL (fallback):', this.businessRuc);
      }
    }

    // Fallback de contexto: usar empresa activa del BusinessContextService
    if (!this.businessRuc || !this.businessId) {
      const active = this.businessContext.getActiveBusiness();
      if (active) {
        this.businessRuc = this.businessRuc || active.ruc;
        this.businessId = this.businessId || active.id;
        console.log('🟢 Usando empresa activa desde contexto:', active);
      }
    }

    // Si no hay businessId pero sí RUC, intentar resolverlo
    if (!this.businessId && this.businessRuc) {
      this.resolveBusinessIdFromRuc(this.businessRuc);
    }
  }

  loadEmployees(): void {
    // Asegurar que tenemos los parámetros más recientes antes de cargar
    this.extractRouteParams();
    this.loading = true;
    this.error = null;
    
    // Decidir cómo obtener empleados según el parámetro disponible
    if (this.businessRuc && this.businessRuc.trim() !== '') {
      // Usar el RUC para obtener empleados
      this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
        next: (employees) => {
          this.employees = employees;
          this.filteredEmployees = employees;
          this.loading = false;
          console.log('Empleados cargados por RUC:', employees);
        },
        error: (error) => {
          console.error('Error al cargar empleados por RUC:', error);
          this.error = 'Error al cargar los empleados';
          this.loading = false;
        }
      });
    } else if (this.businessId != null) {
      // Usar el ID para obtener empleados
      this.employeeService.getEmployeesByBusiness(this.businessId).subscribe({
        next: (employees) => {
          this.employees = employees;
          this.filteredEmployees = employees;
          this.loading = false;
          console.log('Empleados cargados por ID:', employees);
        },
        error: (error) => {
          console.error('Error al cargar empleados por ID:', error);
          this.error = 'Error al cargar los empleados';
          this.loading = false;
        }
      });
    } else {
      // No hay contexto de empresa: no disparamos petición
      console.warn('No se encontró businessRuc ni businessId en la ruta.');
      this.employees = [];
      this.filteredEmployees = [];
      this.loading = false;
      this.error = 'Seleccione una empresa para ver sus empleados.';
    }
  }

  // Método para filtrar empleados por búsqueda
  filterEmployees(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEmployees = this.employees;
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredEmployees = this.employees.filter(employee => {
        const nombres = employee.nombres || '';
        const apellidos = employee.apellidos || '';
        const fullName = `${nombres} ${apellidos}`.trim() || employee.name || '';
        const cedula = (employee.cedula || '').toLowerCase();
        const email = (employee.email || '').toLowerCase();
        const position = this.getEmployeePosition(employee).toLowerCase();
        
        return fullName.toLowerCase().includes(term) || 
               cedula.includes(term) || 
               email.includes(term) || 
               position.includes(term);
      });
    }
  }

  // Método para manejar cambios en el input de búsqueda
  onSearchChange(): void {
    this.filterEmployees();
  }

  // Método para obtener el nombre completo
  getFullName(employee: EmployeeResponse): string {
    const nombres = employee.nombres || '';
    const apellidos = employee.apellidos || '';
    const fullName = `${nombres} ${apellidos}`.trim();
    
    // Si nombres y apellidos están vacíos, usar el campo name
    if (!fullName && employee.name) {
      return employee.name;
    }
    
    return fullName || 'Sin nombre';
  }

  // Método para obtener el cargo del empleado
  getEmployeePosition(employee: EmployeeResponse): string {
    // Intentar obtener el cargo de diferentes propiedades
    if (employee.positionName) {
      return employee.positionName;
    }
    if (employee.position?.name) {
      return employee.position.name;
    }
    if (employee.position) {
      return employee.position;
    }
    return 'Sin cargo';
  }

  // Método para obtener las iniciales del empleado
  getInitials(employee: EmployeeResponse): string {
    const nombres = employee.nombres || '';
    const apellidos = employee.apellidos || '';
    
    if (nombres && apellidos) {
      return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
    }
    
    const fullName = employee.name || 'NN';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    
    return fullName.charAt(0).toUpperCase();
  }

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    console.log('Error cargando imagen:', event);
    event.target.style.display = 'none';
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  openEditModal(employee: EmployeeResponse): void {
    this.employeeToEdit = employee;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.employeeToEdit = null;
  }

  onEmployeeCreated(): void {
    this.closeCreateModal();
    this.loadEmployees();
  }

  onEmployeeUpdated(): void {
    this.closeEditModal();
    this.loadEmployees();
  }

  deleteEmployee(employee: EmployeeResponse): void {
    if (confirm(`¿Está seguro de que desea eliminar al empleado ${employee.name}?`)) {
      this.employeeService.deleteEmployee(employee.id).subscribe({
        next: () => {
          console.log('Empleado eliminado exitosamente');
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Error al eliminar empleado:', error);
          alert('Error al eliminar el empleado');
        }
      });
    }
  }

  getStatusText(status: boolean): string {
    return status ? 'Activo' : 'Inactivo';
  }

  getStatusClass(status: boolean): string {
    return status ? 'badge-success' : 'badge-secondary';
  }

  // Contar empleados activos
  getActiveEmployeesCount(): number {
    return this.employees.filter(emp => emp.status === true).length;
  }

  // Contar empleados inactivos 
  getInactiveEmployeesCount(): number {
    return this.employees.filter(emp => emp.status === false).length;
  }

  // Devuelve la URL absoluta del backend para la imagen de perfil
  getEmployeeImageUrl(employee: any): string {
    // Preferir URLs relativas que pasen por el proxy/interceptor
    // Soportar diferentes campos posibles desde backend
    const addCacheBuster = (url: string) => {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}v=${new Date().getTime()}`;
    };

    const resolveFromPath = (path: string) => {
      if (!path) return '';
      if (path.startsWith('http')) return addCacheBuster(path);
      const filename = path.startsWith('uploads/profiles/')
        ? path.replace('uploads/profiles/', '')
        : path;
      // environment.apiUrl puede estar vacío en dev, por lo que usamos ruta relativa
      const base = (environment.apiUrl || '').trim();
      const url = `${base}/api/files/profiles/${filename}`.replace(/\/+/, '/');
      return addCacheBuster(url);
    };

    if (employee?.imagePath) {
      return resolveFromPath(employee.imagePath);
    }
    if (employee?.profile_picture) {
      return resolveFromPath(employee.profile_picture);
    }
    return '';
  }

  private resolveBusinessIdFromRuc(ruc: string): void {
    this.businessService.getByRuc(ruc).subscribe({
      next: (business: any) => {
        if (business?.id) {
          this.businessId = Number(business.id);
          console.log('✅ businessId resuelto desde RUC:', this.businessId);
        } else {
          console.warn('No se pudo resolver businessId desde RUC');
        }
      },
      error: (err) => {
        console.error('Error al resolver businessId por RUC:', err);
      }
    });
  }
}