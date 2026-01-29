// ...existing code...
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { Employee, EmployeeResponse } from '../models/employee.model';
import { environment } from '../../../../../../environments/environment';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { QrLegalDocsService } from '../../../../../core/services/qr-legal-docs.service';

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
  businessShortUpper: string = '';

  // Modal
  showCreateModal = false;
  showEditModal = false;
  showCoursesModal = false;
  showDocumentsModal = false;
  showEmployeeModal = false;
  showCredentialsModal = false;
  employeeToEdit: EmployeeResponse | null = null;
  selectedEmployee: EmployeeResponse | null = null;
  qrLegalDocsToken: string | null = null;
  sortColumn: 'name' | 'code' | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  nameSortMode: 'initial' | 'final' = 'initial';
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
  // Filtro reciente (nuevos en este mes / últimos 7 días)
  private recentFilter: 'none' | 'newThisMonth' | 'last7days' = 'none';
  dateFilterMode: 'month' | 'semester' | 'year' = 'month';
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth();
  selectedSemester: 1 | 2 = (new Date().getMonth() < 6 ? 1 : 2);
  availableYears: number[] = [];
  newEmployeesFiltered: EmployeeResponse[] = [];
  showNewEmployeesPanel: boolean = false;

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private businessContext: BusinessContextService,
    private qrLegalDocsService: QrLegalDocsService
  ) {}

  ngOnInit(): void {
    // Extraer parámetros recorriendo toda la cadena de rutas ascendentes
    this.extractRouteParams();
    console.log('Business RUC para empleados:', this.businessRuc);
    console.log('Business ID para empleados:', this.businessId);
    this.fetchBusinessShortName();
    this.loadEmployees();

    // Suscribirse a cambios de parámetros para recargar si cambian
    this.route.params.subscribe(() => {
      this.extractRouteParams();
      this.fetchBusinessShortName();
      this.loadEmployees();
    });
    this.route.parent?.params.subscribe(() => {
      this.extractRouteParams();
      this.fetchBusinessShortName();
      this.loadEmployees();
    });
    this.route.parent?.parent?.params.subscribe(() => {
      this.extractRouteParams();
      this.fetchBusinessShortName();
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
    this.businessId = bid ? parseInt(bid, 10) : null;

    // Fallback extra: intentar parsear el RUC desde la URL si aún no lo tenemos
    if (!this.businessRuc && typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const match = path.match(/\/usuario\/([^/]+)\//);
      if (match && match[1]) {
        this.businessRuc = match[1];
        console.log('🔁 RUC extraído desde URL (fallback):', this.businessRuc);
      }
    }

    // Fallback de contexto solo si NO hay RUC NI ID en la ruta/contexto actual
    if (!this.businessRuc && this.businessId == null) {
      const active = this.businessContext.getActiveBusiness();
      if (active) {
        this.businessRuc = active.ruc;
        this.businessId = active.id;
        console.log('🟢 Usando empresa activa desde contexto:', active);
      }
    }

    // Si no hay businessId pero sí RUC, intentar resolverlo
    if (this.businessRuc) {
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
          this.updateAvailableYearsAndRebuild();
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
          this.updateAvailableYearsAndRebuild();
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

    // Filtrar por recientes
    if (this.recentFilter !== 'none') {
      const now = new Date();
      filtered = filtered.filter(emp => {
        const d = this.parseDate(emp?.fechaIngreso);
        if (!d) return false;
        if (this.recentFilter === 'newThisMonth') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        if (this.recentFilter === 'last7days') {
          const diffMs = now.getTime() - d.getTime();
          const days = diffMs / (1000 * 60 * 60 * 24);
          return days <= 7 && days >= 0;
        }
        return true;
      });
    }

    filtered = this.applySorting(filtered);
    this.filteredEmployees = filtered;
  }

  private applySorting(list: EmployeeResponse[]): EmployeeResponse[] {
    if (!Array.isArray(list) || list.length === 0) return list;
    if (this.sortColumn === 'code') {
      const getNum = (e: EmployeeResponse): number => {
        const code = this.getEmployeeCode(e) || '';
        const m = code.match(/\d+/g);
        const s = m ? m.join('') : '';
        const n = s ? parseInt(s, 10) : NaN;
        return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
      };
      return [...list].sort((a, b) => {
        const va = getNum(a);
        const vb = getNum(b);
        return this.sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    if (this.sortColumn === 'name') {
      const getName = (e: EmployeeResponse) => (this.getFullName(e) || '').trim();
      const getInitial = (s: string): string => (s ? s.trim().charAt(0) : '');
      const getFinal = (s: string): string => {
        const t = (s || '').trim();
        for (let i = t.length - 1; i >= 0; i--) {
          const ch = t[i];
          if ((/\p{L}/u).test(ch)) return ch;
        }
        return t.slice(-1) || '';
      };
      return [...list].sort((a, b) => {
        const an = getName(a); const bn = getName(b);
        const ac = this.nameSortMode === 'initial' ? getInitial(an) : getFinal(an);
        const bc = this.nameSortMode === 'initial' ? getInitial(bn) : getFinal(bn);
        let cmp = ac.localeCompare(bc, 'es', { sensitivity: 'base' });
        if (cmp === 0) cmp = an.localeCompare(bn, 'es', { sensitivity: 'base' });
        return this.sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }

  onSortByCode(): void {
    if (this.sortColumn !== 'code') {
      this.sortColumn = 'code';
      this.sortDir = 'asc';
    } else {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    }
    this.filterEmployees();
  }

  onSortByName(): void {
    if (this.sortColumn !== 'name') {
      this.sortColumn = 'name';
      this.sortDir = 'asc';
      this.nameSortMode = 'initial';
    } else {
      if (this.nameSortMode === 'initial' && this.sortDir === 'asc') {
        this.sortDir = 'desc';
      } else if (this.nameSortMode === 'initial' && this.sortDir === 'desc') {
        this.nameSortMode = 'final';
        this.sortDir = 'asc';
      } else if (this.nameSortMode === 'final' && this.sortDir === 'asc') {
        this.sortDir = 'desc';
      } else {
        this.nameSortMode = 'initial';
        this.sortDir = 'asc';
      }
    }
    this.filterEmployees();
  }

  getSortIcon(column: 'name' | 'code'): string {
    if (this.sortColumn !== column) return 'fas fa-sort';
    if (column === 'code') {
      return this.sortDir === 'asc' ? 'fas fa-sort-numeric-down' : 'fas fa-sort-numeric-up';
    }
    return this.sortDir === 'asc' ? 'fas fa-sort-alpha-down' : 'fas fa-sort-alpha-up';
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

  openCredentialsModal(employee: EmployeeResponse): void {
    this.selectedEmployee = employee;
    this.showCredentialsModal = true;

    // Solicitar token público para QR (sin login al escanear)
    if (this.businessRuc && !this.qrLegalDocsToken) {
      this.qrLegalDocsService.issueToken(this.businessRuc).subscribe({
        next: (res) => {
          this.qrLegalDocsToken = res?.token || null;
        },
        error: () => {
          // Fallback silencioso: si falla, el QR seguirá apuntando al flujo interno
          this.qrLegalDocsToken = null;
        }
      });
    }
  }

  closeCredentialsModal(): void {
    this.showCredentialsModal = false;
    this.selectedEmployee = null;
  }

  getEmployeeQrUrl(emp: EmployeeResponse): string {
    try {
      const base = (environment as any).publicSiteUrl?.trim() || (typeof window !== 'undefined' ? window.location.origin : '');
      const ruc = this.businessRuc || '';
      const token = this.qrLegalDocsToken;
      // Preferir ruta pública (sin login) si hay token
      const target = token
        ? `${base}/public/qr/${ruc}?token=${encodeURIComponent(token)}`
        : `${base}/usuario/${ruc}/seguridad-industrial/matriz-legal?qr=1`;
      const data = encodeURIComponent(target);
      return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${data}`;
    } catch {
      return '';
    }
  }

  printCredential(): void {
    try {
      const card = document.querySelector('.credential-print-target') as HTMLElement | null;
      if (!card) { window.print(); return; }

      const printWindow = window.open('', '_blank', 'width=900,height=1200');
      if (!printWindow) { window.print(); return; }

      const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((el) => (el as HTMLElement).outerHTML)
        .join('\n');

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Credencial</title>
  ${headStyles}
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    html, body { width:210mm; height:297mm; margin:0; padding:0; background: #fff; overflow: hidden; }
    .print-wrapper { width:186mm; height:260mm; display:flex; align-items:center; justify-content:center; padding:0; margin:0 auto; overflow:hidden; }
    .credential-card { box-shadow:none !important; page-break-after: avoid !important; page-break-before: avoid !important; }
    * { page-break-inside: avoid !important; break-inside: avoid-page !important; }
    .credential-card, .credential-card * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${card.outerHTML}
  </div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 150); };
  </script>
</body>
</html>`;

      const doc = printWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    } catch (e) {
      console.error('Error al imprimir:', e);
    }
  }

  downloadCredentialPdf(): void {
    // Reusar el flujo de impresión (guardar como PDF en el diálogo)
    this.printCredential();
  }

  viewEmployeeDetail(employee: EmployeeResponse, tab: string = 'profile'): void {
    console.log('Navegando a empleado:', employee.cedula, 'RUC:', this.businessRuc, 'Tab:', tab);
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab }
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

  goBackToWelcome(): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
    }
  }

  // Contar empleados activos
  getActiveEmployeesCount(): number {
    return this.employees.filter(emp => this.isActive(emp)).length;
  }

  // Contar empleados inactivos 
  getInactiveEmployeesCount(): number {
    return this.employees.filter(emp => !this.isActive(emp)).length;
  }

  // === NUEVOS EN ESTE MES ===
  getNewThisMonthCount(): number {
    const now = new Date();
    return this.employees.filter(emp => {
      const d = this.parseDateTime(emp?.created_at) || this.parseDate(emp?.fechaIngreso);
      if (!d) return false;
      // Contar usualmente solo activos
      const active = this.isActive(emp);
      return active && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }

  applyNewThisMonthFilter(): void {
    const now = new Date();
    this.dateFilterMode = 'month';
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth();
    this.showNewEmployeesPanel = true;
    this.rebuildNewEmployeesFiltered();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'active';
    this.recentFilter = 'none';
    this.filterEmployees();
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    try {
      // Aceptar 'yyyy-MM-dd' o 'yyyy-MM-ddTHH:mm:ss'
      const v = String(value).trim();
      // Si es número (epoch)
      if (/^\d{10,13}$/.test(v)) {
        const ts = v.length === 13 ? parseInt(v, 10) : parseInt(v, 10) * 1000;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
      }
      // Normalizar
      const onlyDate = v.split('T')[0];
      const parts = onlyDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        return isNaN(dt.getTime()) ? null : dt;
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  private parseDateTime(value?: string): Date | null {
    if (!value) return null;
    try {
      const v = String(value).trim();
      if (/^\d{10,13}$/.test(v)) {
        const ts = v.length === 13 ? parseInt(v, 10) : parseInt(v, 10) * 1000;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
      }
      const norm = v.includes('T') ? v : v.replace(' ', 'T');
      const d = new Date(norm);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  private getRegistrationDate(emp: EmployeeResponse): Date | null {
    return this.parseDateTime(emp?.created_at) || this.parseDate(emp?.fechaIngreso);
  }

  private updateAvailableYearsAndRebuild(): void {
    const years = new Set<number>();
    for (const e of this.employees || []) {
      const d = this.getRegistrationDate(e);
      if (d) years.add(d.getFullYear());
    }
    if (years.size === 0) years.add(new Date().getFullYear());
    this.availableYears = Array.from(years.values()).sort((a, b) => b - a);
    if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[0];
    }
    this.rebuildNewEmployeesFiltered();
  }

  private rebuildNewEmployeesFiltered(): void {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const sem = this.selectedSemester;
    this.newEmployeesFiltered = (this.employees || []).filter(emp => {
      const d = this.getRegistrationDate(emp);
      if (!d) return false;
      if (!this.isActive(emp)) return false;
      if (this.dateFilterMode === 'month') {
        return d.getFullYear() === year && d.getMonth() === month;
      }
      if (this.dateFilterMode === 'semester') {
        if (d.getFullYear() !== year) return false;
        const m = d.getMonth();
        return sem === 1 ? (m >= 0 && m <= 5) : (m >= 6 && m <= 11);
      }
      if (this.dateFilterMode === 'year') {
        return d.getFullYear() === year;
      }
      return false;
    });
  }

  setDateFilterMode(mode: 'month' | 'semester' | 'year'): void {
    this.dateFilterMode = mode;
    this.rebuildNewEmployeesFiltered();
  }

  setSelectedYear(y: number): void {
    this.selectedYear = Number(y);
    this.rebuildNewEmployeesFiltered();
  }

  setSelectedMonth(m: number): void {
    this.selectedMonth = Number(m);
    this.rebuildNewEmployeesFiltered();
  }

  setSelectedSemester(s: 1 | 2): void {
    this.selectedSemester = Number(s) === 1 ? 1 : 2;
    this.rebuildNewEmployeesFiltered();
  }

  getRegDateStr(emp: EmployeeResponse): string {
    const d = this.getRegistrationDate(emp);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    } catch { return '—'; }
  }

  getRegTimeStr(emp: EmployeeResponse): string {
    const d = this.getRegistrationDate(emp);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    } catch { return '—'; }
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
    // Backend guarda 'imagePath' como 'profiles/<uuid>.ext' (sin prefijo 'uploads/')
    if (path.startsWith('profiles/')) {
      return `${base}/api/files/${path}`.replace(/\/+/, '/');
    }
    if (!path.includes('/')) {
      return `${base}/api/files/profiles/${path}`.replace(/\/+/, '/');
    }
    // Para otras rutas relativas, servirlas vía /api/files/<ruta>
    return `${base}/api/files/${path}`.replace(/\/+/, '/');
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

  private fetchBusinessShortName(): void {
    if (this.businessRuc) {
      this.businessService.getByRuc(this.businessRuc).subscribe({
        next: (b) => {
          this.businessShortUpper = ((b?.nameShort || b?.name) || '').toUpperCase();
        },
        error: () => {
          this.businessShortUpper = '';
        }
      });
      return;
    }
    if (this.businessId != null) {
      this.businessService.getById(this.businessId).subscribe({
        next: (b) => {
          this.businessShortUpper = ((b?.nameShort || b?.name) || '').toUpperCase();
        },
        error: () => {
          this.businessShortUpper = '';
        }
      });
    }
  }

  getBusinessShortUpper(): string {
    return (this.businessShortUpper || '').trim();
  }

  getEmployeeCode(emp: EmployeeResponse | null): string {
    if (!emp) return '';
    return emp.codigoTrabajador || emp.cedula || String(emp.id || '');
  }
  async exportEmployeesToExcel(): Promise<void> {
    try {
      const list: any[] = Array.isArray(this.employees) ? this.employees : [];
      if (!list.length) { alert('No hay datos para exportar'); return; }
      const rows: string[] = [];
      const headers = [
        'FOTO','ID','CÉDULA','CÓDIGO','NOMBRES','APELLIDOS','NOMBRE COMPLETO','EMAIL','TELÉFONO',
        'FECHA NAC.','PROV. NAC.','CIUDAD NAC.','PARROQ. NAC.',
        'DIRECCIÓN','CONTACTO (NOMBRE)','CONTACTO (PARENTESCO)','CONTACTO (TELÉFONO)',
        'FECHA INGRESO','DEPARTAMENTO','CARGO','TIPO CONTRATO','GÉNERO','ESTADO CIVIL','ETNIA','NIVEL EDUCACIÓN','DISCAPACIDAD','CÓDIGO IESS','TIPO SANGRE','SUELDO (CONTRATISTA)',
        'ACTIVO','STATUS','CREADO','ACTUALIZADO'
      ];
      const toDataUrl = async (url: string): Promise<string> => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const blob = await resp.blob();
          return await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(blob);
          });
        } catch {
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
        }
      };
      const imageUrlFor = (emp: any): string => {
        const path = emp?.imagePath || emp?.profile_picture || emp?.photoFileName || '';
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (path.startsWith('uploads/')) return `/api/files/${path.replace(/^uploads\//,'')}`;
        if (path.startsWith('profiles/')) return `/api/files/${path}`;
        if (!path.includes('/')) return `/api/files/profiles/${path}`;
        return `/api/files/${path}`;
      };
      const imageDataUrls = await Promise.all(list.map(async (e) => {
        const url = imageUrlFor(e);
        return url ? await toDataUrl(url) : '';
      }));
      rows.push('<tr>' + headers.map(h => `<th style="background:#f0f0f0;border:1px solid #ccc;">${h}</th>`).join('') + '</tr>');
      const fmt = (v: any) => (v === undefined || v === null ? '' : String(v));
      const fullNameFor = (e: any) => {
        const n = fmt(e.nombres); const a = fmt(e.apellidos);
        const fa = `${n} ${a}`.trim();
        return fa || fmt(e.name);
      };
      const departmentFor = (e: any) => fmt(e.departmentName || e.department?.name || '');
      const positionFor = (e: any) => fmt(e.positionName || e.position?.name || '');
      const contractFor = (e: any) => fmt(e.contractTypeName || '');
      list.forEach((e, idx) => {
        const img = imageDataUrls[idx] ? `<img src="${imageDataUrls[idx]}" width="48" height="48"/>` : '';
        const rowCells = [
          img,
          fmt(e.id), fmt(e.cedula), fmt(e.codigoTrabajador || e.codigoEmpresa || ''), fmt(e.nombres), fmt(e.apellidos), fullNameFor(e),
          fmt(e.email), fmt(e.phone),
          fmt(e.dateBirth ? (new Date(e.dateBirth).toLocaleDateString()) : ''),
          fmt(e.lugarNacimientoProvincia), fmt(e.lugarNacimientoCiudad), fmt(e.lugarNacimientoParroquia),
          fmt(e.address || e.direccionDomiciliaria), fmt(e.contactName), fmt(e.contactKinship), fmt(e.contactPhone),
          fmt(e.fechaIngreso ? (new Date(e.fechaIngreso).toLocaleDateString()) : ''),
          departmentFor(e), positionFor(e), contractFor(e),
          fmt(e.genderName), fmt(e.civilStatusName), fmt(e.etniaName), fmt(e.nivelEducacion || e.degreeName), fmt(e.discapacidad), fmt(e.codigoIess), fmt(e.tipoSangre), fmt(e.salario),
          (e.active === true ? 'SI' : 'NO'), fmt(e.status),
          fmt(e.created_at || e.createdAt || ''), fmt(e.updated_at || e.updatedAt || '')
        ];
        rows.push('<tr>' + rowCells.map(c => `<td style="border:1px solid #ddd;vertical-align:middle;">${c}</td>`).join('') + '</tr>');
      });
      const title = `Empleados_${this.businessRuc || ''}_${new Date().toISOString().slice(0,10)}`;
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
        <table cellspacing="0" cellpadding="4">${rows.join('')}</table>
      </body></html>`;
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('No se pudo exportar a Excel');
    }
  }
  async exportEmployeesToPdf(): Promise<void> {
    try {
      const list: any[] = Array.isArray(this.employees) ? this.employees : [];
      if (!list.length) { alert('No hay datos para exportar'); return; }
      const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
      const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
      const vfs = (pdfFontsImport?.default?.vfs) || (pdfFontsImport?.pdfMake?.vfs) || (pdfFontsImport?.vfs);
      if (vfs) pdfMake.vfs = vfs;
      const toDataUrl = async (url: string): Promise<string | null> => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const blob = await resp.blob();
          return await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(blob);
          });
        } catch { return null; }
      };
      const imageUrlFor = (emp: any): string => {
        const path = emp?.imagePath || emp?.profile_picture || emp?.photoFileName || '';
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (path.startsWith('uploads/')) return `/api/files/${path.replace(/^uploads\//,'')}`;
        if (path.startsWith('profiles/')) return `/api/files/${path}`;
        if (!path.includes('/')) return `/api/files/profiles/${path}`;
        return `/api/files/${path}`;
      };
      const imageData = await Promise.all(list.map(async e => {
        const u = imageUrlFor(e);
        return u ? (await toDataUrl(u)) : null;
      }));
      const header = [
        { text: 'Foto', bold: true },
        { text: 'Nombre', bold: true },
        { text: 'Cédula', bold: true },
        { text: 'Código', bold: true },
        { text: 'Departamento', bold: true },
        { text: 'Cargo', bold: true },
        { text: 'Estado', bold: true }
      ];
      const body: any[] = [header];
      list.forEach((e, i) => {
        const photo = imageData[i] ? { image: imageData[i], fit: [32, 32] } : { text: '' };
        body.push([
          photo,
          String(((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || e.name || ''),
          String(e.cedula || ''),
          String(e.codigoTrabajador || e.codigoEmpresa || ''),
          String(e.departmentName || e.department?.name || ''),
          String(e.positionName || e.position?.name || ''),
          this.isActive(e) ? 'ACTIVO' : 'INACTIVO'
        ]);
      });
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [15, 20, 15, 20],
        content: [
          { text: `Empleados - ${this.businessShortUpper || ''} ${this.businessRuc || ''}`, style: 'title', margin: [0,0,0,10] },
          {
            table: { headerRows: 1, widths: [35, '*', 70, 60, '*', '*', 55], body },
            layout: 'lightHorizontalLines'
          }
        ],
        styles: { title: { fontSize: 12, bold: true } }
      };
      const fileName = `Empleados_${this.businessRuc || ''}_${new Date().toISOString().slice(0,10)}.pdf`;
      const pdf = pdfMake.createPdf(docDefinition);
      try { pdf.open(); } catch { pdf.download(fileName); }
    } catch (e) {
      alert('No se pudo exportar a PDF');
    }
  }
}