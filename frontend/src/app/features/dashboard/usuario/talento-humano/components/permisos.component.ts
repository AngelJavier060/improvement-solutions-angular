import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, PermissionRecord, DayType } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { forkJoin, Subject } from 'rxjs';
import { filter, map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { extractUsuarioRucFromRoute, resolveThBusinessFromRoute } from '../utils/th-business-from-route';
import { EmployeeResponse } from '../models/employee.model';

export interface PermissionTypeRow {
  label: string;
  key: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-permisos',
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.scss']
})
export class PermisosComponent implements OnInit, OnDestroy {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';

  employees: EmployeeResponse[] = [];
  records: PermissionRecord[] = [];

  selectedEmployee: EmployeeResponse | null = null;
  searchEmp: string = '';

  form!: FormGroup;
  showModal = false;
  showPdfPreview = false;
  saving = false;
  loading = false;
  loadingEmps = false;
  error: string | null = null;
  successMsg: string | null = null;

  filterYear: number = new Date().getFullYear();
  filterMonth: number = new Date().getMonth() + 1;
  filterType: string = '';
  filterSearch: string = '';

  savedRecord: PermissionRecord | null = null;
  editingRecord: PermissionRecord | null = null;
  showSignedPdfModal = false;
  signedPdfUrl: string | null = null;
  signedPdfSafeUrl: SafeResourceUrl | null = null;
  currentPdfRecordId: number | null = null;
  // Modal de detalle (similar a Horas Extra)
  showPermDetail = false;
  detailPerm: PermissionRecord | null = null;

  // Advertencia de solapamiento de fecha (se muestra en zona de error del modal)
  dateConflictWarning: string | null = null;
  private _lastCheckedDate: string = '';

  readonly months = [
    {v:0,l:'Todos los meses'},
    {v:1,l:'Enero'},{v:2,l:'Febrero'},{v:3,l:'Marzo'},{v:4,l:'Abril'},
    {v:5,l:'Mayo'},{v:6,l:'Junio'},{v:7,l:'Julio'},{v:8,l:'Agosto'},
    {v:9,l:'Septiembre'},{v:10,l:'Octubre'},{v:11,l:'Noviembre'},{v:12,l:'Diciembre'}
  ];
  readonly availableYears = Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i);

  // Opciones de motivo disponibles
  readonly permissionTypeOptions = [
    { key: 'MATERNIDAD', label: 'Paternidad / Maternidad' },
    { key: 'PERSONAL',   label: 'Permisos por asuntos personales' },
    { key: 'CALAMIDAD',  label: 'Calamidad doméstica' },
    { key: 'MEDICO',     label: 'Enfermedad no profesional' },
  ];

  // Filas dinámicas del detalle de permiso (inicia con una sola fila)
  permissionTypeRows: PermissionTypeRow[] = [
    { label: 'Permisos por asuntos personales', key: 'PERSONAL', startDate: '', endDate: '' }
  ];

  replacementEmployee: string = '';
  pdfObservations: string = '';
  requestDate: string = new Date().toLocaleDateString('es-EC', {day:'2-digit',month:'short',year:'2-digit'});

  // Nombres a mostrar en firmas del PDF
  immediateBossName: string = '';
  hrManagerName: string = '';
  generalManagerName: string = '';

  // Storage key prefix for per-company default signers
  private readonly SIGNERS_KEY_PREFIX = 'perm_signers_';

  /** Código de documento (PDF solicitud de permiso) */
  readonly docCode = 'GTH-PRO-01-F5';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private businessContext: BusinessContextService,
    private businessService: BusinessService,
    private sanitizer: DomSanitizer
  ) {}

  /** Nombre de la empresa en gestión (URL / RUC), para encabezados y PDF */
  get displayBusinessName(): string {
    return (this.businessName || '').trim() || 'Empresa';
  }

  ngOnInit(): void {
    this.buildForm();
    this.initFromRoute();
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => extractUsuarioRucFromRoute(this.route)),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.initFromRoute());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initFromRoute(): void {
    resolveThBusinessFromRoute(this.route, this.businessService, this.businessContext).subscribe(b => {
      if (!b) {
        this.businessId = null;
        this.businessRuc = null;
        this.businessName = '';
        return;
      }
      this.businessId = b.id;
      this.businessRuc = b.ruc;
      this.businessName = b.name;
      this.loadEmployees();
      this.loadRecords();
    });
  }

  private buildForm(): void {
    this.form = this.fb.group({
      permissionDate:  ['', Validators.required],
      permissionType:  ['PERSONAL', Validators.required],
      hoursRequested:  [8, [Validators.required, Validators.min(0)]],
      reason:          ['', [Validators.required, Validators.minLength(5)]],
      notes:           [''],
      status:          ['PENDIENTE']
    });
  }

  loadEmployees(): void {
    if (!this.businessRuc) return;
    this.loadingEmps = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: emps => { this.employees = emps.filter(e => e.active !== false); this.loadingEmps = false; },
      error: () => { this.loadingEmps = false; }
    });
  }

  loadRecords(): void {
    if (!this.businessId) return;
    this.loading = true;
    const monthParam = (this.filterMonth === 0 ? undefined : this.filterMonth);
    this.attendanceService.getPermissions(this.businessId, this.filterYear, monthParam).subscribe({
      next: recs => { this.records = recs; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openNewModal(): void {
    this.selectedEmployee = null;
    this.resetTypeRows();
    this.replacementEmployee = '';
    this.pdfObservations = '';
    this.immediateBossName = '';
    this.hrManagerName = '';
    this.generalManagerName = '';
    this.error = null;
    this.form.reset({ permissionDate: '', permissionType: 'PERSONAL', hoursRequested: 8, reason: '', notes: '', status: 'PENDIENTE' });
    this.showModal = true;
    // Autocargar firmantes predeterminados por empresa (si existen)
    this.loadDefaultSigners(true);
    this.editingRecord = null;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEmployee = null;
  }

  get filteredEmployees(): EmployeeResponse[] {
    const q = this.searchEmp.trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter(e =>
      ((e.nombres || '') + ' ' + (e.apellidos || '')).toLowerCase().includes(q) ||
      (e.cedula || '').includes(q)
    );
  }

  selectEmployeeForModal(emp: EmployeeResponse): void {
    this.selectedEmployee = emp;
    // Re-evaluar si ya hay una fecha seleccionada
    if (this._lastCheckedDate) {
      this.onRowDateChange(0, this._lastCheckedDate);
    }
  }

  private resetTypeRows(): void {
    this.permissionTypeRows = [
      { label: 'Permisos por asuntos personales', key: 'PERSONAL', startDate: '', endDate: '' }
    ];
    this.dateConflictWarning = null;
    this._lastCheckedDate = '';
  }

  addPermissionRow(): void {
    this.permissionTypeRows = [
      ...this.permissionTypeRows,
      { label: 'Permisos por asuntos personales', key: 'PERSONAL', startDate: '', endDate: '' }
    ];
  }

  removePermissionRow(index: number): void {
    if (this.permissionTypeRows.length <= 1) return;
    this.permissionTypeRows = this.permissionTypeRows.filter((_, i) => i !== index);
  }

  onRowDateChange(idx: number, date: string): void {
    this._lastCheckedDate = date;
    this.dateConflictWarning = null;
    if (!date || !this.businessId || !this.selectedEmployee) return;
    this.attendanceService.checkDateConflict(this.businessId, this.selectedEmployee.id, date).subscribe({
      next: res => { this.dateConflictWarning = res.conflict ? res.detail : null; },
      error: () => { this.dateConflictWarning = null; }
    });
  }

  getTypeLabel(key: string): string {
    const f = this.permissionTypeOptions.find(o => o.key === key);
    return f ? f.label : key;
  }

  // ===== Predeterminados de firmantes (por empresa) =====
  private getSignersStorageKey(): string | null {
    return this.businessRuc ? `${this.SIGNERS_KEY_PREFIX}${this.businessRuc}` : null;
  }

  loadDefaultSigners(apply: boolean = false): { immediateBossName: string; hrManagerName: string; generalManagerName: string } | null {
    try {
      const key = this.getSignersStorageKey();
      if (!key || typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw || '{}') || {};
      if (apply) {
        this.immediateBossName = parsed.immediateBossName || '';
        this.hrManagerName = parsed.hrManagerName || '';
        this.generalManagerName = parsed.generalManagerName || '';
      }
      return parsed;
    } catch {
      return null;
    }
  }

  applyDefaultSigners(): void {
    const ok = this.loadDefaultSigners(true);
    if (ok) {
      this.successMsg = 'Firmantes predeterminados cargados';
      setTimeout(() => this.successMsg = null, 2500);
    } else {
      this.error = 'No hay firmantes predeterminados guardados para esta empresa.';
      setTimeout(() => this.error = null, 3000);
    }
  }

  saveDefaultSigners(): void {
    try {
      const key = this.getSignersStorageKey();
      if (!key || typeof window === 'undefined' || !window.localStorage) return;
      const payload = {
        immediateBossName: this.immediateBossName || '',
        hrManagerName: this.hrManagerName || '',
        generalManagerName: this.generalManagerName || ''
      };
      window.localStorage.setItem(key, JSON.stringify(payload));
      this.successMsg = 'Firmantes guardados como predeterminados';
      setTimeout(() => this.successMsg = null, 2500);
    } catch (e) {
      console.error(e);
      this.error = 'No se pudo guardar predeterminado. Intente nuevamente.';
      setTimeout(() => this.error = null, 3000);
    }
  }

  clearDefaultSigners(): void {
    try {
      const key = this.getSignersStorageKey();
      if (!key || typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
      this.successMsg = 'Predeterminado de firmantes eliminado';
      setTimeout(() => this.successMsg = null, 2500);
    } catch (e) {
      console.error(e);
      this.error = 'No se pudo eliminar el predeterminado.';
      setTimeout(() => this.error = null, 3000);
    }
  }

  getActiveTypeRow(): PermissionTypeRow | null {
    return this.permissionTypeRows.find(r => r.key && r.startDate && r.endDate) || null;
  }

  calcDays(row: PermissionTypeRow): number {
    if (!row.startDate || !row.endDate) return 0;
    const a = this.parseIsoDateOnly(row.startDate);
    const b = this.parseIsoDateOnly(row.endDate);
    if (!a || !b) return 0;
    const t0 = new Date(a.y, a.m - 1, a.d).getTime();
    const t1 = new Date(b.y, b.m - 1, b.d).getTime();
    const diff = Math.ceil((t1 - t0) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  /**
   * Fecha calendario yyyy-MM-dd sin interpretación UTC (evita desfase de un día al aprobar permisos).
   */
  private parseIsoDateOnly(iso: string | undefined | null): { y: number; m: number; d: number } | null {
    if (!iso) return null;
    // Aceptar "yyyy-MM-dd" o prefijo "yyyy-MM-ddTHH..." (evita fallar si el API envía instante)
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }

  submitForm(): void {
    if (!this.businessId || !this.selectedEmployee) {
      this.error = 'Seleccione un empleado para continuar.';
      return;
    }
    const validRows = this.permissionTypeRows.filter(r => r.key && r.startDate && r.endDate);
    if (validRows.length === 0) {
      this.error = 'Complete al menos un tipo de permiso con fechas Desde y Hasta.';
      return;
    }
    if (!this.pdfObservations.trim()) {
      this.error = 'Ingrese las observaciones / justificación del permiso.';
      return;
    }
    this.saving = true;
    this.error = null;
    if (this.editingRecord) {
      // Modo edición: solo actualizamos la primera fila válida sobre el registro existente
      const row = validRows[0];
      const dto: PermissionRecord = {
        permissionDate: row.startDate,
        permissionType: row.key,
        hoursRequested: this.calcDays(row) * 8,
        reason: this.pdfObservations.trim(),
        notes: this.replacementEmployee ? `Reemplazo: ${this.replacementEmployee}` : '',
        status: 'PENDIENTE'
      };
      this.attendanceService.updatePermission(this.businessId!, this.editingRecord.id!, dto).subscribe({
        next: (saved) => {
          this.saving = false;
          this.showModal = false;
          this.savedRecord = { ...dto, id: (saved as any)?.id ?? this.editingRecord!.id, employeeName: this.getFullName(this.selectedEmployee!), employeeId: this.selectedEmployee!.id } as any;
          this.showPdfPreview = true;
          this.successMsg = 'Solicitud actualizada correctamente';
          setTimeout(() => this.successMsg = null, 3500);
          this.loadRecords();
        },
        error: err => {
          this.saving = false;
          this.error = err?.error?.error || 'Error al actualizar la solicitud.';
          console.error(err);
        }
      });
    } else {
      const dtos: PermissionRecord[] = validRows.map(row => ({
        permissionDate: row.startDate,
        permissionType: row.key,
        hoursRequested: this.calcDays(row) * 8,
        reason: this.pdfObservations.trim(),
        notes: this.replacementEmployee ? `Reemplazo: ${this.replacementEmployee}` : '',
        status: 'PENDIENTE'
      }));
      const saves$ = dtos.map(dto => this.attendanceService.savePermission(this.businessId!, this.selectedEmployee!.id, dto));
      forkJoin(saves$).subscribe({
        next: (savedArr: any[]) => {
          this.saving = false;
          this.showModal = false;
          const first = dtos[0];
          this.savedRecord = { ...first, employeeName: this.getFullName(this.selectedEmployee!), employeeId: this.selectedEmployee!.id, id: savedArr?.[0]?.id } as any;
          this.showPdfPreview = true;
          this.successMsg = `Se registraron ${dtos.length} permiso(s) correctamente`;
          setTimeout(() => this.successMsg = null, 3500);
          this.loadRecords();
        },
        error: err => {
          this.saving = false;
          this.error = err?.error?.error || 'Error al guardar uno o más permisos. Verifique los datos e intente nuevamente.';
          console.error(err);
        }
      });
    }
  }

  saveDraft(): void {
    if (!this.businessId || !this.selectedEmployee) {
      this.error = 'Seleccione un empleado para continuar.';
      return;
    }
    const validRows = this.permissionTypeRows.filter(r => r.key && r.startDate && r.endDate);
    if (validRows.length === 0) {
      this.error = 'Complete al menos un tipo de permiso con fechas Desde y Hasta.';
      return;
    }
    this.saving = true;
    this.error = null;
    if (this.editingRecord) {
      const row = validRows[0];
      const dto: PermissionRecord = {
        permissionDate: row.startDate,
        permissionType: row.key,
        hoursRequested: this.calcDays(row) * 8,
        reason: this.pdfObservations.trim() || 'Borrador',
        notes: this.replacementEmployee ? `Reemplazo: ${this.replacementEmployee}` : '',
        status: 'PENDIENTE'
      };
      this.attendanceService.updatePermission(this.businessId!, this.editingRecord.id!, dto).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.successMsg = 'Borrador actualizado correctamente';
          setTimeout(() => this.successMsg = null, 3500);
          this.loadRecords();
        },
        error: err => {
          this.saving = false;
          this.error = err?.error?.error || 'Error al guardar el borrador.';
          console.error(err);
        }
      });
    } else {
      const dtos: PermissionRecord[] = validRows.map(row => ({
        permissionDate: row.startDate,
        permissionType: row.key,
        hoursRequested: this.calcDays(row) * 8,
        reason: this.pdfObservations.trim() || 'Borrador',
        notes: this.replacementEmployee ? `Reemplazo: ${this.replacementEmployee}` : '',
        status: 'PENDIENTE'
      }));
      const saves$ = dtos.map(dto => this.attendanceService.savePermission(this.businessId!, this.selectedEmployee!.id, dto));
      forkJoin(saves$).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.successMsg = `Borrador guardado (${dtos.length}) correctamente`;
          setTimeout(() => this.successMsg = null, 3500);
          this.loadRecords();
        },
        error: err => {
          this.saving = false;
          this.error = err?.error?.error || 'Error al guardar el borrador. Verifique los datos e intente nuevamente.';
          console.error(err);
        }
      });
    }
  }

  closePdfPreview(): void {
    this.showPdfPreview = false;
    this.savedRecord = null;
  }

  printPdf(): void {
    window.print();
  }

  deleteRecord(id: number): void {
    if (!this.businessId || !confirm('¿Eliminar este permiso?')) return;
    this.attendanceService.deletePermission(this.businessId, id).subscribe({
      next: () => this.loadRecords(),
      error: err => console.error(err)
    });
  }

  getFullName(e: EmployeeResponse): string {
    return ((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || e.name || '—';
  }

  getStatusClass(status: string): string {
    if (!status) return 'perm-badge perm-other';
    const s = status.toUpperCase();
    if (s === 'APROBADO')  return 'perm-badge perm-ok';
    if (s === 'PENDIENTE') return 'perm-badge perm-pend';
    if (s === 'EN_EJECUCION') return 'perm-badge perm-pend';
    if (s === 'RECHAZADO') return 'perm-badge perm-reject';
    return 'perm-badge perm-other';
  }

  get viewRecords(): PermissionRecord[] {
    let list = (this.records || []).slice();
    if (this.filterSearch.trim()) {
      const q = this.filterSearch.trim().toLowerCase();
      list = list.filter(r => (r.employeeName || '').toLowerCase().includes(q));
    }
    if (this.filterType) {
      list = list.filter(r => r.permissionType === this.filterType);
    }
    return list.sort((a, b) =>
      (b.permissionDate || '').localeCompare(a.permissionDate || '', 'en-CA'));
  }

  get kpiTotal(): number { return this.records.length; }
  get kpiPending(): number { return this.records.filter(r => (r.status || '').toUpperCase() === 'PENDIENTE').length; }
  get kpiApproved(): number { return this.records.filter(r => (r.status || '').toUpperCase() === 'APROBADO').length; }

  clearFilters(): void {
    this.filterSearch = '';
    this.filterType = '';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  }

  // ====== Acciones por registro ======
  startEditRecord(r: PermissionRecord): void {
    this.error = null;
    this.successMsg = null;
    // Preseleccionar empleado
    if (r.employeeId) {
      const emp = this.employees.find(e => e.id === r.employeeId);
      if (emp) this.selectedEmployee = emp; else this.selectedEmployee = null;
    }
    // Cargar una sola fila con los datos del registro
    this.permissionTypeRows = [
      { key: r.permissionType, label: this.getTypeLabel(r.permissionType), startDate: r.permissionDate, endDate: r.permissionDate }
    ];
    // Observaciones y reemplazo
    this.pdfObservations = r.reason || '';
    this.replacementEmployee = (r.notes || '').startsWith('Reemplazo: ') ? (r.notes || '').replace('Reemplazo: ', '') : '';
    this.editingRecord = r;
    // Abrir modal
    this.showModal = true;
    this.loadDefaultSigners(true);
  }

  triggerUpload(input: HTMLInputElement): void { input.click(); }

  onSignedPdfSelectedForPermission(event: Event, r: PermissionRecord): void {
    if (!this.businessId || !r.id || !r.employeeId) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.saving = true;
    this.attendanceService.uploadPermissionSignedPdf(this.businessId, r.id, file).subscribe({
      next: () => {
        this.attendanceService.updatePermissionStatus(this.businessId!, r.id!, 'APROBADO').subscribe({
          next: () => {
            // La planilla (P + PERM:id) la sincroniza el backend al pasar a APROBADO
            this.saving = false;
            this.successMsg = 'PDF subido y permiso aprobado';
            setTimeout(() => this.successMsg = null, 3000);
            this.loadRecords();
          },
          error: () => { this.saving = false; this.error = 'Error al aprobar el permiso.'; }
        });
      },
      error: () => { this.saving = false; this.error = 'Error al subir el PDF firmado.'; }
    });
    input.value = '';
  }

  approvePermission(r: PermissionRecord): void {
    if (!this.businessId || !r.id || !r.employeeId) return;
    this.saving = true;
    this.attendanceService.updatePermissionStatus(this.businessId!, r.id!, 'APROBADO').subscribe({
      next: () => {
        // La planilla (P + PERM:id) la sincroniza el backend al pasar a APROBADO
        this.saving = false;
        this.successMsg = 'Permiso aprobado y planilla marcada';
        setTimeout(() => this.successMsg = null, 3000);
        this.loadRecords();
      },
      error: () => { this.saving = false; this.error = 'Error al aprobar el permiso.'; }
    });
  }

  openPermissionPdf(r: PermissionRecord): void {
    if (!this.businessId || !r.id) return;
    this.attendanceService.getPermissionPdfBlob(this.businessId, r.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        this.signedPdfUrl = url;
        this.signedPdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.currentPdfRecordId = r.id || null;
        this.showSignedPdfModal = true;
      },
      error: () => {
        this.error = 'No se pudo abrir el PDF firmado (verifique autenticación o que exista el archivo).';
        setTimeout(() => this.error = null, 4000);
      }
    });
  }

  closeSignedPdfModal(): void {
    if (this.signedPdfUrl) {
      try { window.URL.revokeObjectURL(this.signedPdfUrl); } catch {}
    }
    this.showSignedPdfModal = false;
    this.signedPdfUrl = null;
    this.signedPdfSafeUrl = null;
    this.currentPdfRecordId = null;
  }

  downloadSignedPdf(): void {
    if (!this.signedPdfUrl) return;
    const a = document.createElement('a');
    a.href = this.signedPdfUrl;
    a.download = `permiso_${this.currentPdfRecordId || ''}.pdf`;
    a.click();
  }

  printSignedPdf(): void {
    if (!this.signedPdfUrl) return;
    const win = window.open(this.signedPdfUrl, '_blank');
    if (win) {
      win.onload = () => win.print();
    }
  }

  // ===== Detalle y PDF de solicitud (similar a Horas Extra) =====
  openDetails(r: PermissionRecord): void {
    this.detailPerm = r;
    this.showPermDetail = true;
  }

  closeDetails(): void {
    this.showPermDetail = false;
    this.detailPerm = null;
  }

  openRequestPdf(r: PermissionRecord): void {
    // Reutiliza la vista PDF de 'Guardar Solicitud' poblando datos desde el registro
    this.savedRecord = {
      ...r,
      employeeName: r.employeeName || (this.selectedEmployee ? this.getFullName(this.selectedEmployee) : undefined)
    } as any;
    this.permissionTypeRows = [
      { key: r.permissionType, label: this.getTypeLabel(r.permissionType), startDate: r.permissionDate, endDate: r.permissionDate }
    ];
    this.pdfObservations = r.reason || '';
    this.replacementEmployee = (r.notes || '').startsWith('Reemplazo: ') ? (r.notes || '').replace('Reemplazo: ', '') : (r.notes || '');
    this.showPdfPreview = true;
  }

  rejectPermission(r: PermissionRecord): void {
    if (!this.businessId || !r.id) return;
    if (!confirm('¿Rechazar esta solicitud de permiso?')) return;
    this.attendanceService.updatePermissionStatus(this.businessId!, r.id!, 'RECHAZADO').subscribe({
      next: () => { this.loadRecords(); },
      error: () => { this.error = 'No se pudo rechazar la solicitud.'; setTimeout(() => this.error = null, 3000); }
    });
  }

  goBack(): void {
    if (this.businessRuc) this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'planilla-mensual']);
  }
}
