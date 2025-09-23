// ...existing code...
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  filterStatus: 'active' | 'inactive' | 'all' = 'active'; // Por defecto mostrar solo activos
  loading = false;
  error: string | null = null;
  // Identificadores de empresa (se obtienen de la ruta)
  businessId: number | null = null;
  businessRuc: string | null = null;

  // Modal
  showCreateModal = false;
  showEditModal = false;
  showCoursesModal = false;
  showDocumentsModal = false;
  showEmployeeModal = false;
  employeeToEdit: EmployeeResponse | null = null;
  selectedEmployee: EmployeeResponse | null = null;
  // Desvinculación / Reingreso
  showDeactivateModal = false;
  showReactivateModal = false;
  movementTarget: EmployeeResponse | null = null;
  movementReason: string = '';
  movementDate: string = '';
  // Toast/Snackbar
  toastVisible = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  private toastTimer: any = null;
  // Cache estable de URLs de imágenes para evitar cambios durante CD
  private imageUrlCache: Map<string, string> = new Map();

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
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

  // trackBy para estabilizar el *ngFor de empleados
  trackByEmployee(index: number, emp: any): any {
    return emp?.id ?? emp?.cedula ?? index;
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
          this.rebuildImageCache();
          this.filterEmployees();
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
          this.rebuildImageCache();
          this.filterEmployees();
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
      this.filterEmployees();
      this.loading = false;
      this.error = 'Seleccione una empresa para ver sus empleados.';
    }
  }

  // Método para filtrar empleados por búsqueda y status
  filterEmployees(): void {
    let filtered = this.employees;

    // Filtrar por status
    if (this.filterStatus === 'active') {
      filtered = filtered.filter(employee => this.isActive(employee));
    } else if (this.filterStatus === 'inactive') {
      filtered = filtered.filter(employee => !this.isActive(employee));
    }
    // Si es 'all', no filtrar por status

    // Filtrar por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(employee => {
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

    this.filteredEmployees = filtered;
  }

  // Método para manejar cambios en el input de búsqueda
  onSearchChange(): void {
    this.filterEmployees();
  }

  // Método para cambiar el filtro de status
  setFilterStatus(status: 'active' | 'inactive' | 'all'): void {
    this.filterStatus = status;
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

  openCoursesModal(employee: EmployeeResponse): void {
    this.selectedEmployee = employee;
    this.showCoursesModal = true;
  }

  closeCoursesModal(): void {
    this.showCoursesModal = false;
    this.selectedEmployee = null;
  }

  openDocumentsModal(employee: EmployeeResponse): void {
    this.selectedEmployee = employee;
    this.showDocumentsModal = true;
  }

  closeDocumentsModal(): void {
    this.showDocumentsModal = false;
    this.selectedEmployee = null;
  }

  openEmployeeModal(employee: EmployeeResponse): void {
    this.selectedEmployee = employee;
    this.showEmployeeModal = true;
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal = false;
    this.selectedEmployee = null;
  }

  viewEmployeeDetail(employee: EmployeeResponse, tab: string = 'profile'): void {
    console.log('Navegando a empleado:', employee.cedula, 'RUC:', this.businessRuc, 'Tab:', tab);
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'dashboard', 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab: tab }
      });
    } else {
      console.error('No se encontró RUC de la empresa');
    }
  }

  onEmployeeCreated(): void {
    this.closeCreateModal();
    this.loadEmployees();
    this.showToast('Empleado creado exitosamente', 'success');
  }

  onEmployeeUpdated(): void {
    this.closeEditModal();
    this.loadEmployees();
    this.showToast('Empleado actualizado exitosamente', 'success');
  }

  // Emitido desde el modal cuando se actualiza/elimina foto sin cerrar el modal
  onPhotoUpdated(): void {
    this.loadEmployees();
    this.showToast('Foto de perfil actualizada', 'success');
  }

  deleteEmployee(employee: EmployeeResponse): void {
    if (confirm(`¿Está seguro de que desea eliminar al empleado ${employee.name}?`)) {
      this.employeeService.deleteEmployee(employee.id).subscribe({
        next: () => {
          console.log('Empleado eliminado exitosamente');
          this.loadEmployees();
          this.showToast('Empleado eliminado', 'success');
        },
        error: (error) => {
          console.error('Error al eliminar empleado:', error);
          alert('Error al eliminar el empleado');
        }
      });
    }
  }

  // Helpers para estado activo
  isActive(emp: any): boolean {
    if (emp && typeof emp.active === 'boolean') return !!emp.active;
    const s = emp?.status;
    if (typeof s === 'boolean') return s;
    if (typeof s === 'string') {
      const u = s.toUpperCase();
      return u === 'ACTIVO' || u === 'ACTIVE' || s === '1' || s === 'true';
    }
    return false;
  }

  getStatusTextFor(emp: EmployeeResponse): string {
    return this.isActive(emp) ? 'Activo' : 'Inactivo';
  }

  getStatusClassFor(emp: EmployeeResponse): string {
    return this.isActive(emp) ? 'badge-success' : 'badge-secondary';
  }

  toggleActive(employee: EmployeeResponse): void {
    const currentlyActive = this.isActive(employee);
    if (currentlyActive) {
      this.openDeactivateModal(employee);
    } else {
      this.openReactivateModal(employee);
    }
  }

  // === MOVIMIENTOS ===
  openDeactivateModal(employee: EmployeeResponse): void {
    this.movementTarget = employee;
    this.movementReason = '';
    this.movementDate = this.formatToday();
    this.showDeactivateModal = true;
  }

  closeDeactivateModal(): void {
    this.showDeactivateModal = false;
    this.movementTarget = null;
    this.movementReason = '';
    this.movementDate = '';
  }

  confirmDeactivate(): void {
    if (!this.movementTarget || !this.movementDate) {
      this.showToast('Ingrese la fecha de desvinculación', 'error');
      return;
    }
    const id = this.movementTarget.id;
    this.employeeService.deactivateEmployee(id, {
      reason: this.movementReason || undefined,
      effectiveDate: this.movementDate
    }).subscribe({
      next: () => {
        this.closeDeactivateModal();
        this.loadEmployees();
        this.showToast('Empleado desvinculado', 'success');
      },
      error: (err) => {
        console.error('Error al desvincular:', err);
        this.showToast('No se pudo desvincular al empleado', 'error');
      }
    });
  }

  openReactivateModal(employee: EmployeeResponse): void {
    this.movementTarget = employee;
    this.movementDate = this.formatToday();
    this.showReactivateModal = true;
  }

  closeReactivateModal(): void {
    this.showReactivateModal = false;
    this.movementTarget = null;
    this.movementDate = '';
  }

  confirmReactivate(): void {
    if (!this.movementTarget || !this.movementDate) {
      this.showToast('Ingrese la fecha de reingreso', 'error');
      return;
    }
    const id = this.movementTarget.id;
    this.employeeService.reactivateEmployee(id, {
      effectiveDate: this.movementDate
    }).subscribe({
      next: () => {
        this.closeReactivateModal();
        this.loadEmployees();
        this.showToast('Empleado reingresado', 'success');
      },
      error: (err) => {
        console.error('Error al reingresar:', err);
        this.showToast('No se pudo reingresar al empleado', 'error');
      }
    });
  }

  private formatToday(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // === TOAST ===
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'success', durationMs: number = 3000): void {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastTimer = setTimeout(() => this.hideToast(), durationMs);
  }

  private hideToast(): void {
    this.toastVisible = false;
    this.toastMessage = '';
  }

  // Contar empleados activos
  getActiveEmployeesCount(): number {
    return this.employees.filter(emp => this.isActive(emp)).length;
  }

  // Contar empleados inactivos 
  getInactiveEmployeesCount(): number {
    return this.employees.filter(emp => !this.isActive(emp)).length;
  }

  // Devuelve la URL absoluta del backend para la imagen de perfil
  getEmployeeImageUrl(employee: any): string {
    const key = this.getEmployeeKey(employee);
    const cached = this.imageUrlCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const built = this.buildImageUrl(employee);
    // Guardar en cache incluso si es cadena vacía para no recalcular
    this.imageUrlCache.set(key, built);
    return built;
  }

  private getEmployeeKey(employee: any): string {
    return String(
      employee?.id ??
      employee?.cedula ??
      employee?.email ??
      employee?.name ??
      'unknown'
    );
  }

  private getCacheVersion(employee: any): number {
    // Usar una marca temporal estable del empleado para invalidar cache cuando cambie
    if (employee?.updated_at) {
      const t = new Date(employee.updated_at).getTime();
      return isNaN(t) ? 1 : t;
    }
    if (employee?.updatedAt) {
      const t = new Date(employee.updatedAt).getTime();
      return isNaN(t) ? 1 : t;
    }
    // Último recurso: 1 (estable)
    return 1;
  }

  private resolveImageBaseUrl(path: string): string {
    if (!path) return '';
    const base = (environment.apiUrl || '').trim();
    if (path.startsWith('http')) return path;
    if (path.startsWith('uploads/')) {
      const rel = path.replace(/^uploads\//, '');
      return `${base}/api/files/${rel}`.replace(/\/+/, '/');
    }
    if (!path.includes('/')) {
      return `${base}/api/files/profiles/${path}`.replace(/\/+/, '/');
    }
    return `${base}/${path}`.replace(/\/+/, '/');
  }

  private buildImageUrl(employee: any): string {
    // Determinar la ruta de imagen desde diferentes campos posibles
    const path = employee?.imagePath || employee?.profile_picture || employee?.photoFileName || '';
    const baseUrl = this.resolveImageBaseUrl(path);
    if (!baseUrl) return '';
    const sep = baseUrl.includes('?') ? '&' : '?';
    const v = this.getCacheVersion(employee);
    return `${baseUrl}${sep}v=${v}`;
  }

  private rebuildImageCache(): void {
    this.imageUrlCache.clear();
    for (const emp of this.employees) {
      const key = this.getEmployeeKey(emp);
      this.imageUrlCache.set(key, this.buildImageUrl(emp));
    }
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