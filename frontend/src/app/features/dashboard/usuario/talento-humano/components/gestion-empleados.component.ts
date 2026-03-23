// ...existing code...
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { Employee, EmployeeResponse } from '../models/employee.model';
import { environment } from '../../../../../../environments/environment';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { QrLegalDocsService } from '../../../../../core/services/qr-legal-docs.service';
import { AuthService } from '../../../../../core/services/auth.service';

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
  businessName: string | null = null;
  businessEmail: string | null = null;
  businessLogo: string | null = null;
  businessLegalRep: string | null = null;
  businessCity: string | null = null;
  currentUserName: string | null = null;
  currentUserEmail: string | null = null;
  userPhotoUrl: string | null = null;
  initials: string | null = null;

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
    private qrLegalDocsService: QrLegalDocsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Extraer parámetros recorriendo toda la cadena de rutas ascendentes
    this.extractRouteParams();
    console.log('Business RUC para empleados:', this.businessRuc);
    console.log('Business ID para empleados:', this.businessId);
    this.fetchBusinessShortName();
    this.loadEmployees();

    // Identidad de usuario para el encabezado
    const u = this.authService.getCurrentUser();
    if (u) {
      const name = (u.name || '').toString().trim();
      const username = (u.username || '').toString().trim();
      const email = (u.email || '').toString().trim();
      this.currentUserName = name || username || email || null;
      this.currentUserEmail = email || null;
      this.userPhotoUrl = this.buildUserPhotoUrl((u.profilePicture || u.photo || '').toString());
      this.initials = this.buildInitials(this.currentUserName || this.businessName);
    }
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

  // === Helpers de identidad (foto/iniciales) ===
  private buildUserPhotoUrl(raw: string): string | null {
    try {
      let rel = (raw || '').trim().replace(/\\/g, '/');
      if (!rel) return null;
      if (/^https?:\/\//i.test(rel)) return rel;
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      if (!rel.includes('/')) rel = `profiles/${rel}`;
      // usar ruta relativa para respetar proxy/i18n
      return `/api/files/${rel}`;
    } catch {
      return null;
    }
  }

  private buildInitials(source?: string | null): string | null {
    const s = (source || '').trim();
    if (!s) return null;
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.charAt(0) || '';
    const b = parts.length > 1 ? parts[1].charAt(0) : '';
    const init = `${a}${b}`.toUpperCase();
    return init || null;
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
      let base = (environment as any).publicSiteUrl?.trim();
      if (!base && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const path = window.location.pathname || '';
        const seg1 = (path.split('/')[1] || '').trim();
        const isLocale = /^[a-z]{2}-[A-Z]{2}$/.test(seg1);
        base = isLocale ? `${origin}/${seg1}` : origin;
      }
      const ruc = this.businessRuc || '';
      const token = this.qrLegalDocsToken;
      // Preferir ruta pública (sin login) si hay token
      const target = token
        ? `${base}/public/qr/${ruc}?token=${encodeURIComponent(token)}`
        : `${base}/usuario/${ruc}/seguridad-industrial/matriz-legal?qr=1`;
      const data = encodeURIComponent(target);
      return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&ecc=M&color=000000&bgcolor=ffffff&data=${data}`;
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

  private applyBusinessData(b: any): void {
    this.businessShortUpper = ((b?.nameShort || b?.name) || '').toUpperCase();
    this.businessName = (b?.name) || null;
    this.businessEmail = b?.email || null;
    this.businessLegalRep = b?.legalRepresentative || null;
    this.businessCity = b?.city || b?.province || null;
    const logo = b?.logo || '';
    if (logo) {
      this.businessLogo = logo.startsWith('http') ? logo
        : logo.startsWith('logos/') ? `/api/files/${logo}`
        : `/api/files/logos/${logo}`;
    }
  }

  private fetchBusinessShortName(): void {
    if (this.businessRuc) {
      this.businessService.getByRuc(this.businessRuc).subscribe({
        next: (b) => { this.applyBusinessData(b); },
        error: () => {
          this.businessShortUpper = '';
          this.businessName = null;
          this.businessEmail = null;
        }
      });
      return;
    }
    if (this.businessId != null) {
      this.businessService.getById(this.businessId).subscribe({
        next: (b) => { this.applyBusinessData(b); },
        error: () => {
          this.businessShortUpper = '';
          this.businessName = null;
          this.businessEmail = null;
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
  async exportEmployeesToPdf(): Promise<void> {
    try {
      const list: any[] = Array.isArray(this.employees) ? this.employees : [];
      if (!list.length) { alert('No hay datos para exportar'); return; }

      const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
      const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
      const vfs = (pdfFontsImport?.default?.vfs) || (pdfFontsImport?.pdfMake?.vfs) || (pdfFontsImport?.vfs);
      if (vfs) pdfMake.vfs = vfs;

      const token = this.authService.getToken ? this.authService.getToken() : localStorage.getItem('auth_token');
      const fetchOpts: RequestInit = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

      const toDataUrl = async (url: string): Promise<string | null> => {
        try {
          const resp = await fetch(url, fetchOpts);
          if (!resp.ok) return null;
          const blob = await resp.blob();
          return await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        } catch { return null; }
      };

      const logoDataUrl = this.businessLogo ? await toDataUrl(this.businessLogo) : null;

      const today = new Date();
      const fmt = (v: any) => (v === undefined || v === null ? '' : String(v));
      const fullName = (e: any) => `${fmt(e.apellidos)} ${fmt(e.nombres)}`.trim() || fmt(e.name);
      const statusLabel = (e: any) => (e.active === true || fmt(e.status).toUpperCase() === 'ACT') ? 'ACTIVO' : 'INACTIVO';
      const fmtDate = (ds: string | null): string => {
        if (!ds) return '';
        const d = new Date(ds);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };
      const calcYears = (ds: string | null): string => {
        if (!ds) return '';
        const d = new Date(ds);
        if (isNaN(d.getTime())) return '';
        const yrs = Math.floor((today.getTime() - d.getTime()) / (365.25 * 86400000));
        return yrs >= 0 && yrs < 120 ? String(yrs) : '';
      };
      const fmtSalary = (v: any): string => {
        const n = parseFloat(v);
        return isNaN(n) ? '' : n.toFixed(2);
      };

      const dateStr    = today.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const companyName = (this.businessName || this.businessShortUpper || '').toUpperCase();
      const legalRep   = this.businessLegalRep || 'Gerente General';
      const cityLine   = this.businessCity ? ` — ${this.businessCity}` : '';
      const docCode    = 'STH-PRO-001-PG-10';

      const BLUE  = '#1B3A6B';
      const LBLUE = '#D6E4F0';
      const WHITE = '#FFFFFF';
      const SUBHD = '#EEF4FB';

      const logoCell: any = logoDataUrl
        ? { image: logoDataUrl, width: 68, rowSpan: 3, alignment: 'center', margin: [2, 4, 2, 4] }
        : { text: companyName.substring(0, 2), fontSize: 20, bold: true, color: BLUE, rowSpan: 3, alignment: 'center', margin: [0, 14, 0, 0] };

      const headerTable: any = {
        margin: [0, 0, 0, 4],
        table: {
          widths: [72, '*', 140],
          body: [
            [
              logoCell,
              { text: 'NÓMINA DE TRABAJADORES', fontSize: 12, bold: true, color: BLUE, alignment: 'center', margin: [0, 6, 0, 2] },
              { text: `Código: ${docCode}`, fontSize: 7, color: '#444', alignment: 'right', margin: [0, 4, 2, 0] }
            ],
            [
              {},
              { text: companyName + cityLine, fontSize: 9, bold: true, color: BLUE, alignment: 'center', margin: [0, 0, 0, 2] },
              { text: `Fecha: ${dateStr}`, fontSize: 7, color: '#444', alignment: 'right', margin: [0, 0, 2, 0] }
            ],
            [
              {},
              { text: 'PROCESO: Gestión de Talento Humano', fontSize: 8, color: '#333', alignment: 'center', margin: [0, 2, 0, 4] },
              { text: `Aprobado por: ${legalRep}`, fontSize: 7, color: '#333', italics: true, alignment: 'right', margin: [0, 2, 2, 4] }
            ]
          ]
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1.5 : 0.4,
          vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 1.5 : 0.4,
          hLineColor: () => BLUE,
          vLineColor: () => BLUE,
          paddingLeft: () => 3, paddingRight: () => 3, paddingTop: () => 1, paddingBottom: () => 1
        }
      };

      // 22 columnas con todos los datos del trabajador
      const cols = [
        { label: 'N°',            w: 16 },
        { label: 'NOMBRE',        w: 88 },
        { label: 'CÉDULA',        w: 50 },
        { label: 'F. NAC.',       w: 42 },
        { label: 'EDAD',          w: 20 },
        { label: 'GÉNERO',        w: 34 },
        { label: 'E. CIVIL',      w: 40 },
        { label: 'DEPARTAMENTO',  w: 66 },
        { label: 'CARGO',         w: 74 },
        { label: 'T. CONTRATO',   w: 54 },
        { label: 'ESTADO',        w: 34 },
        { label: 'SUELDO',        w: 38 },
        { label: 'ING. IESS',     w: 42 },
        { label: 'ANTIGÜEDAD',    w: 34 },
        { label: 'TELÉFONO',      w: 48 },
        { label: 'CORREO',        w: 88 },
        { label: 'CIUDAD',        w: 46 },
        { label: 'DIRECCIÓN',     w: 68 },
        { label: 'T. SANGRE',     w: 32 },
        { label: 'DISCAPACIDAD',  w: 40 },
        { label: 'SUT',           w: 38 },
        { label: 'IESS',          w: 50 },
      ];

      const hdrRow = cols.map(c => ({
        text: c.label, bold: true, fontSize: 6, color: WHITE,
        fillColor: BLUE, alignment: 'center', margin: [1, 3, 1, 3]
      }));

      const tableBody: any[] = [hdrRow];
      list.forEach((e, idx) => {
        const fill = idx % 2 === 0 ? WHITE : LBLUE;
        const c = (txt: string, opts: any = {}) => ({
          text: txt, fontSize: 6, fillColor: fill, margin: [1, 2, 1, 2], ...opts
        });
        tableBody.push([
          c(String(idx + 1), { alignment: 'center' }),
          c(fullName(e)),
          c(fmt(e.cedula), { alignment: 'center' }),
          c(fmtDate(e.dateBirth), { alignment: 'center' }),
          c(calcYears(e.dateBirth), { alignment: 'center' }),
          c(fmt(e.genderName), { alignment: 'center' }),
          c(fmt(e.civilStatusName || e.civil_status?.name || ''), { alignment: 'center' }),
          c(fmt(e.departmentName || e.position?.departmentName || '')),
          c(fmt(e.positionName || e.position?.name || '')),
          c(fmt(e.contractTypeName || ''), { alignment: 'center' }),
          c(statusLabel(e), { alignment: 'center' }),
          c(fmtSalary(e.salario), { alignment: 'right' }),
          c(fmtDate(e.fechaIngreso), { alignment: 'center' }),
          c(calcYears(e.fechaIngreso), { alignment: 'center' }),
          c(fmt(e.phone), { alignment: 'center' }),
          c(fmt(e.email)),
          c(fmt(e.lugarNacimientoCiudad || ''), { alignment: 'center' }),
          c(fmt(e.address || e.direccionDomiciliaria || '')),
          c(fmt(e.tipoSangre || ''), { alignment: 'center' }),
          c(fmt(e.discapacidad || ''), { alignment: 'center' }),
          c(fmt(e.codigoTrabajador || ''), { alignment: 'center' }),
          c(fmt(e.codigoIess || ''), { alignment: 'center' }),
        ]);
      });

      // Fila de total
      tableBody.push([
        { text: `Total: ${list.length} colaborador(es)`, colSpan: cols.length, bold: true,
          fontSize: 7, fillColor: SUBHD, margin: [4, 3, 4, 3], alignment: 'left' },
        ...Array(cols.length - 1).fill({})
      ]);

      const docDefinition: any = {
        pageSize: 'A3',
        pageOrientation: 'landscape',
        pageMargins: [12, 12, 12, 28],
        footer: (currentPage: number, pageCount: number) => ({
          margin: [12, 4, 12, 0],
          columns: [
            { text: `Generado el ${dateStr} — ${companyName}`, fontSize: 7, color: '#666' },
            { text: `Pág. ${currentPage} / ${pageCount}`, fontSize: 7, color: '#666', alignment: 'right' }
          ]
        }),
        content: [
          headerTable,
          { text: '', margin: [0, 4, 0, 0] },
          {
            table: { headerRows: 1, widths: cols.map(c => c.w), body: tableBody },
            layout: {
              hLineWidth: (i: number) => i === 0 || i === 1 ? 1 : 0.25,
              vLineWidth: () => 0.25,
              hLineColor: () => '#AAAAAA',
              vLineColor: () => '#AAAAAA',
              paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0
            }
          }
        ],
        defaultStyle: { font: 'Roboto' }
      };

      const fileName = `Nomina_${companyName}_${today.toISOString().slice(0, 10)}.pdf`;
      const pdf = pdfMake.createPdf(docDefinition);
      try { pdf.open(); } catch { pdf.download(fileName); }
    } catch (e) {
      console.error('Error exportando PDF:', e);
      alert('No se pudo exportar a PDF');
    }
  }

  async exportEmployeesToExcel(): Promise<void> {
    try {
      const list: any[] = Array.isArray(this.employees) ? this.employees : [];
      if (!list.length) { alert('No hay datos para exportar'); return; }

      const today = new Date();
      const dateStr = today.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const companyName = (this.businessName || this.businessShortUpper || '').toUpperCase();
      const legalRep = this.businessLegalRep || 'Gerente General';
      const cityLine = this.businessCity ? ` — ${this.businessCity}` : '';

      const fmt = (v: any) => (v === undefined || v === null ? '' : String(v).trim());
      const fmtDate = (ds: string | null | undefined): string => {
        if (!ds) return '';
        const d = new Date(ds);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };
      const fmtSalary = (v: any): string => {
        const n = parseFloat(v);
        return isNaN(n) ? '' : n.toFixed(2);
      };

      // 31 columnas: N° + 30 campos solicitados
      const COLS = 31;
      const BLUE  = '#1B3A6B';
      const BLUE2 = '#243F6E';   // segundo tono para sub-cabecera
      const ALT   = '#EBF3FB';
      const SUBHD = '#F0F4FA';

      const token = this.authService.getToken ? this.authService.getToken() : localStorage.getItem('auth_token');
      const fetchOpts: RequestInit = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

      let logoHtml = '';
      if (this.businessLogo) {
        try {
          const resp = await fetch(this.businessLogo, fetchOpts);
          if (resp.ok) {
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((res, rej) => {
              const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob);
            });
            logoHtml = `<img src="${dataUrl}" style="height:56px;max-width:110px;object-fit:contain;" />`;
          }
        } catch { /* sin logo */ }
      }

      // Anchos de columna (en px, usado en <col>)
      const colWidths = [
        30,   // N°
        90,   // Cédula
        80,   // Cód. Trabajador
        110,  // Apellidos
        110,  // Nombres
        150,  // Email
        90,   // Teléfono
        88,   // F. Nacimiento
        140,  // Dirección
        70,   // Salario
        88,   // F. Ingreso
        110,  // Departamento
        120,  // Cargo
        110,  // Tipo Contrato
        115,  // Empresa Contratista
        75,   // Género
        90,   // Estado Civil
        90,   // Etnia
        105,  // Prov. Nacimiento
        105,  // Ciudad Nacimiento
        115,  // Parroquia Nacimiento
        110,  // Jornada Trabajo
        110,  // Horario Trabajo
        72,   // Tipo Sangre
        105,  // Nivel Educación
        90,   // Discapacidad
        100,  // Cód. IESS
        120,  // Nombre Contacto
        88,   // Parentesco
        90,   // Tel. Contacto
        140,  // Dir. Domiciliaria
      ];

      const colGroupHtml = `<colgroup>${colWidths.map(w => `<col style="width:${w}px">`).join('')}</colgroup>`;

      const td = (txt: string, bg = '#FFFFFF', extra = '') =>
        `<td style="border:1px solid #C8D6E5;padding:3px 5px;font-size:9px;vertical-align:middle;background:${bg};${extra}">${txt !== '' ? txt : '&nbsp;'}</td>`;

      const th = (txt: string, w = '') =>
        `<td style="border:1px solid #0A2040;padding:5px 4px;font-size:8.5px;font-weight:bold;background:${BLUE};color:#FFFFFF;text-align:center;vertical-align:middle;white-space:nowrap;${w ? `min-width:${w}px;` : ''}">${txt}</td>`;

      const rows: string[] = [];

      // ── FILA 1: Membrete principal ──────────────────────────────────────────
      rows.push(`<tr>
        <td colspan="${COLS}" style="padding:0;border:2px solid #0A2040;background:${BLUE};">
          <table style="width:100%;border-collapse:collapse;border:none;">
            <tr>
              <td style="border:none;width:90px;padding:6px 8px;text-align:center;vertical-align:middle;">
                ${logoHtml || `<div style="width:60px;height:60px;background:#FFFFFF22;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#FFFFFF;">${companyName.substring(0,2)}</div>`}
              </td>
              <td style="border:none;text-align:center;vertical-align:middle;padding:10px 6px;">
                <div style="color:#FFFFFF;font-size:14px;font-weight:900;letter-spacing:0.5px;">NÓMINA DE TRABAJADORES</div>
                <div style="color:#A8C8F0;font-size:11px;font-weight:700;margin-top:4px;">${companyName}${cityLine}</div>
              </td>
              <td style="border:none;width:160px;padding:6px 10px;text-align:right;vertical-align:middle;">
                <div style="color:#A8C8F0;font-size:8px;line-height:1.8;">Código: STH-PRO-001-PG-10</div>
                <div style="color:#A8C8F0;font-size:8px;line-height:1.8;">Fecha: ${dateStr}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`);

      // ── FILA 2: Proceso / Aprobado ─────────────────────────────────────────
      rows.push(`<tr>
        <td colspan="${Math.ceil(COLS * 0.55)}" style="background:${SUBHD};font-size:9px;padding:4px 8px;border:1px solid #C8D6E5;vertical-align:middle;">
          <b>PROCESO:</b> Gestión de Talento Humano &nbsp;&nbsp;|&nbsp;&nbsp; <b>EMPRESA:</b> ${companyName}
        </td>
        <td colspan="${COLS - Math.ceil(COLS * 0.55)}" style="background:${SUBHD};font-size:9px;padding:4px 8px;border:1px solid #C8D6E5;text-align:right;vertical-align:middle;">
          <b>Aprobado por:</b> ${legalRep} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Total colaboradores:</b> ${list.length}
        </td>
      </tr>`);

      // ── FILA 3: Cabeceras de columnas ──────────────────────────────────────
      rows.push(`<tr>
        ${th('N°')}
        ${th('CÉDULA')}
        ${th('CÓD. TRABAJADOR')}
        ${th('APELLIDOS')}
        ${th('NOMBRES')}
        ${th('EMAIL')}
        ${th('TELÉFONO')}
        ${th('F. NACIMIENTO')}
        ${th('DIRECCIÓN')}
        ${th('SALARIO')}
        ${th('F. INGRESO')}
        ${th('DEPARTAMENTO')}
        ${th('CARGO')}
        ${th('TIPO CONTRATO')}
        ${th('EMPRESA CONTRATISTA')}
        ${th('GÉNERO')}
        ${th('ESTADO CIVIL')}
        ${th('ETNIA')}
        ${th('PROV. NACIMIENTO')}
        ${th('CIUDAD NACIMIENTO')}
        ${th('PARROQUIA NAC.')}
        ${th('JORNADA TRABAJO')}
        ${th('HORARIO TRABAJO')}
        ${th('TIPO SANGRE')}
        ${th('NIVEL EDUCACIÓN')}
        ${th('DISCAPACIDAD')}
        ${th('CÓD. IESS')}
        ${th('NOMBRE CONTACTO')}
        ${th('PARENTESCO')}
        ${th('TEL. CONTACTO')}
        ${th('DIR. DOMICILIARIA')}
      </tr>`);

      // ── FILAS DE DATOS ─────────────────────────────────────────────────────
      list.forEach((e, idx) => {
        const bg  = idx % 2 === 1 ? ALT : '#FFFFFF';
        const ct  = 'text-align:center;';
        const rt  = 'text-align:right;';
        rows.push(`<tr>
          ${td(String(idx + 1), bg, ct)}
          ${td(fmt(e.cedula), bg, ct)}
          ${td(fmt(e.codigoTrabajador || ''), bg, ct)}
          ${td(fmt(e.apellidos || ''), bg)}
          ${td(fmt(e.nombres || ''), bg)}
          ${td(fmt(e.email), bg)}
          ${td(fmt(e.phone), bg, ct)}
          ${td(fmtDate(e.dateBirth || e.birthdate), bg, ct)}
          ${td(fmt(e.address || ''), bg)}
          ${td(fmtSalary(e.salario), bg, rt)}
          ${td(fmtDate(e.fechaIngreso), bg, ct)}
          ${td(fmt(e.departmentName || ''), bg)}
          ${td(fmt(e.positionName || e.position?.name || ''), bg)}
          ${td(fmt(e.contractTypeName || ''), bg)}
          ${td(fmt(e.contractorCompanyName || ''), bg)}
          ${td(fmt(e.genderName || ''), bg, ct)}
          ${td(fmt(e.civilStatusName || e.civil_status?.name || ''), bg, ct)}
          ${td(fmt(e.etniaName || e.ethnicity?.name || ''), bg, ct)}
          ${td(fmt(e.lugarNacimientoProvincia || ''), bg)}
          ${td(fmt(e.lugarNacimientoCiudad || ''), bg)}
          ${td(fmt(e.lugarNacimientoParroquia || ''), bg)}
          ${td(fmt(e.workScheduleName || ''), bg)}
          ${td(fmt(e.workShiftName || ''), bg)}
          ${td(fmt(e.tipoSangre || ''), bg, ct)}
          ${td(fmt(e.nivelEducacion || e.degreeName || ''), bg)}
          ${td(fmt(e.discapacidad || ''), bg)}
          ${td(fmt(e.codigoIess || ''), bg, ct)}
          ${td(fmt(e.contactName || e.contact_name || ''), bg)}
          ${td(fmt(e.contactKinship || e.contact_kinship || ''), bg, ct)}
          ${td(fmt(e.contactPhone || e.contact_phone || ''), bg, ct)}
          ${td(fmt(e.direccionDomiciliaria || ''), bg)}
        </tr>`);
      });

      // ── FILA TOTALES ───────────────────────────────────────────────────────
      rows.push(`<tr>
        <td colspan="${COLS}" style="background:${SUBHD};font-size:9px;font-weight:bold;padding:5px 8px;border:1px solid #C8D6E5;text-align:left;">
          Total: ${list.length} colaborador(es) &nbsp;&mdash;&nbsp; Generado el ${dateStr} &nbsp;&mdash;&nbsp; ${companyName}
        </td>
      </tr>`);

      const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    td, th { mso-number-format:"@"; word-wrap: break-word; }
  </style>
</head>
<body>
<table>${colGroupHtml}${rows.join('')}</table>
</body>
</html>`;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Nomina_${companyName}_${today.toISOString().slice(0, 10)}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('No se pudo exportar a Excel');
    }
  }
}