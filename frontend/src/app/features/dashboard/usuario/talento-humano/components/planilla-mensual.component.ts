import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AttendanceService,
  EmployeeSheetRow,
  MonthlyKpis,
  DayType,
  DAY_TYPES,
  WorkDayEntry,
  DayTotals,
  WorkScheduleHistoryEntry,
  MonthlyClosureEntry,
  PermissionRecord
} from '../services/attendance.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { Business } from '../../../../../models/business.model';
import { ConfigurationService, WorkSchedule } from '../services/configuration.service';
import { AttendanceHolidayService, HolidayDto } from '../services/attendance.service';
import { PlanillaPdfService } from '../services/planilla-pdf.service';
import { BusinessIncidentService, BusinessIncidentDto } from '../../../../../services/business-incident.service';

@Component({
  selector: 'app-planilla-mensual',
  templateUrl: './planilla-mensual.component.html',
  styleUrls: ['./planilla-mensual.component.scss']
})
export class PlanillaMensualComponent implements OnInit {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';
  businessLogoUrl: string | null = null;
  businessLogoBase64: string | null = null;

  year: number = new Date().getFullYear();
  month: number = new Date().getMonth() + 1;

  sheet: EmployeeSheetRow[] = [];
  filteredSheet: EmployeeSheetRow[] = [];
  kpis: MonthlyKpis | null = null;

  searchTerm: string = '';
  filterDayType: string = '';

  loading = false;
  loadingKpis = false;
  error: string | null = null;

  selectedRow: EmployeeSheetRow | null = null;

  savingScheduleStart = false;
  scheduleStartError: string | null = null;
  scheduleStartDraft: string = '';

  // Histórico de jornadas
  scheduleHistory: WorkScheduleHistoryEntry[] = [];
  loadingHistory = false;
  showHistoryForm = false;
  historyFormError: string | null = null;
  savingHistory = false;
  historyDraft = { workScheduleId: '', startDate: '', endDate: '', cycleStartDate: '', notes: '' };

  // Cierre mensual
  monthClosure: MonthlyClosureEntry | null = null;
  closingMonth = false;
  closureError: string | null = null;
  uploadingPdf = false;
  uploadPdfError: string | null = null;

  // Catálogo de jornadas disponibles para el selector del histórico
  availableSchedules: WorkSchedule[] = [];

  daysInMonth: number[] = [];
  monthDates: string[] = [];

  // Feriados
  holidays: HolidayDto[] = [];
  holidaysLoading = false;
  holidaysError: string | null = null;
  holidayDraft = { date: '', name: '' };

  readonly dayTypes = DAY_TYPES;
  readonly dayTypeKeys: DayType[] = ['T', 'D', 'EX', 'V', 'P', 'E', 'A'];

  // Accidentes de seguridad: mapa cédula+fecha → incidente
  private incidentMap: Map<string, BusinessIncidentDto> = new Map();
  accidentPopover: { empId: number; dayIdx: number; incident: BusinessIncidentDto } | null = null;

  readonly months = [
    { v: 1,  l: 'Enero' },   { v: 2,  l: 'Febrero' }, { v: 3,  l: 'Marzo' },
    { v: 4,  l: 'Abril' },   { v: 5,  l: 'Mayo' },    { v: 6,  l: 'Junio' },
    { v: 7,  l: 'Julio' },   { v: 8,  l: 'Agosto' },  { v: 9,  l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' },{ v: 12, l: 'Diciembre' }
  ];

  readonly availableYears: number[] = Array.from(
    { length: 5 }, (_, i) => new Date().getFullYear() - 2 + i
  );

  editingCell: { empId: number; dayIdx: number } | null = null;
  notePopover: { empId: number; dayIdx: number } | null = null;
  permPopover: { empId: number; dayIdx: number; loading: boolean; error: string | null; data: PermissionRecord | null } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private attendanceService: AttendanceService,
    private businessContext: BusinessContextService,
    private businessService: BusinessService,
    private configService: ConfigurationService,
    private pdfService: PlanillaPdfService,
    private holidayService: AttendanceHolidayService,
    private incidentService: BusinessIncidentService
  ) {}

  ngOnInit(): void {
    this.extractParams();
    this.buildCalendar();
    this.loadData();
  }

  private loadAvailableSchedules(): void {
    if (!this.businessId) return;
    this.configService.getWorkSchedulesByCompany(this.businessId).subscribe({
      next: list => { this.availableSchedules = list; },
      error: () => {}
    });
  }

  private extractParams(): void {
    // 1. Buscar RUC en todos los segmentos de ruta padre
    let r: any = this.route;
    while (r) {
      const ruc = r.snapshot?.params?.['ruc'] || r.snapshot?.params?.['businessRuc'];
      if (ruc) { this.businessRuc = ruc; break; }
      r = r.parent;
    }
    // 2. Fallback: extraer RUC desde la URL
    if (!this.businessRuc && typeof window !== 'undefined') {
      const m = window.location.pathname.match(/\/usuario\/([^/]+)\//);
      if (m?.[1]) this.businessRuc = m[1];
    }
    // 3. Intentar obtener businessId desde contexto activo
    const active = this.businessContext.getActiveBusiness();
    if (active) {
      this.businessId   = active.id;
      this.businessName = active.name ?? '';
      if (!this.businessRuc) this.businessRuc = active.ruc;
      this.loadBusinessInfo();
    }
    // 4. Si tenemos RUC pero no ID, buscar en el listado de empresas
    if (this.businessRuc && !this.businessId) {
      this.businessService.getAll().subscribe({
        next: (list: any[]) => {
          const found = list.find((b: any) => b.ruc === this.businessRuc);
          if (found) {
            this.businessId   = found.id;
            this.businessName = found.name ?? '';
            this.loadBusinessInfo();
          }
          if (this.businessId) this.loadData();
        },
        error: () => { this.loadData(); }
      });
    }
  }

  private loadBusinessInfo(): void {
    if (!this.businessId) return;
    this.businessService.getById(this.businessId).subscribe({
      next: (b: Business) => {
        // nombre en caso de que venga vacío desde el contexto
        if (!this.businessName) this.businessName = b.name ?? '';
        const raw = (b.logo || '').trim();
        const base = '';
        if (!raw) { this.businessLogoUrl = null; return; }
        if (/^https?:\/\//i.test(raw)) {
          this.businessLogoUrl = raw;
        } else if (raw.startsWith('logos/')) {
          // Servido por FileController /api/files/{filename}
          this.businessLogoUrl = `${base}/api/files/${raw}`;
        } else {
          // Asumir nombre de archivo dentro de /api/files/logos/{file}
          this.businessLogoUrl = `${base}/api/files/logos/${raw}`;
        }
      },
      error: () => { this.businessLogoUrl = null; }
    });
  }

  private async toDataUrl(url: string): Promise<string> {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private buildCalendar(): void {
    const days = new Date(this.year, this.month, 0).getDate();
    this.daysInMonth = Array.from({ length: days }, (_, i) => i + 1);
    this.monthDates  = this.daysInMonth.map(d =>
      `${this.year}-${String(this.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    );
  }

  onMonthChange(): void {
    this.buildCalendar();
    this.loadData();
  }

  loadData(): void {
    if (!this.businessId) return;
    this.loading = true;
    this.loadingKpis = true;
    this.error = null;
    this.loadAvailableSchedules();

    this.attendanceService.getKpis(this.businessId, this.year, this.month).subscribe({
      next: kpis => { this.kpis = kpis; this.loadingKpis = false; },
      error: () => { this.loadingKpis = false; }
    });

    this.attendanceService.getMonthlySheet(this.businessId, this.year, this.month).subscribe({
      next: rows => {
        this.sheet = rows;
        this.applyAccidentOverlay();
        // Refresh selected row data if panel is open
        if (this.selectedRow) {
          const refreshed = rows.find(r => r.employeeId === this.selectedRow!.employeeId);
          if (refreshed) this.selectedRow = refreshed;
        }
        this.applyFilters();
        this.loading = false;
      },
      error: err => {
        this.error = 'No se pudo cargar la planilla. Intente nuevamente.';
        this.loading = false;
        console.error(err);
      }
    });

    this.loadClosure();
    this.loadHolidays();
    this.loadSafetyIncidents();
  }

  loadHolidays(): void {
    if (!this.businessId) return;
    this.holidaysLoading = true;
    this.holidaysError = null;
    this.holidayService.getHolidays(this.businessId, this.year, this.month).subscribe({
      next: list => { this.holidays = list; this.holidaysLoading = false; },
      error: () => { this.holidaysLoading = false; this.holidaysError = 'No se pudieron cargar los feriados.'; }
    });
  }

  addHoliday(): void {
    if (!this.businessId) return;
    const d = (this.holidayDraft.date || '').trim();
    const n = (this.holidayDraft.name || '').trim();
    if (!d || !n) { this.holidaysError = 'Fecha y nombre son obligatorios.'; return; }
    this.holidaysError = null;
    this.holidayService.addHoliday(this.businessId, { date: d, name: n }).subscribe({
      next: () => { this.holidayDraft = { date: '', name: '' }; this.loadHolidays(); this.loadData(); },
      error: err => { this.holidaysError = err?.error?.error || 'No se pudo agregar el feriado.'; }
    });
  }

  deleteHoliday(h: HolidayDto): void {
    if (!this.businessId || h.scope === 'NATIONAL') return;
    if (!confirm('¿Eliminar este feriado de empresa?')) return;
    this.holidayService.deleteHoliday(this.businessId, h.id).subscribe({
      next: () => { this.loadHolidays(); this.loadData(); },
      error: () => {}
    });
  }

  applyFilters(): void {
    let list = [...this.sheet];
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.fullName.toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q) ||
        (r.cedula || '').includes(q)
      );
    }
    if (this.filterDayType) {
      list = list.filter(r => r.days.some(d => d.dayType === this.filterDayType));
    }
    this.filteredSheet = list;
  }

  getDayForEmployee(row: EmployeeSheetRow, dayIdx: number): WorkDayEntry {
    return row.days[dayIdx] ?? { day: dayIdx + 1, date: this.monthDates[dayIdx], dayType: null as any };
  }

  getDayClass(type: string | null | undefined): string {
    if (!type) return 'day-blank';
    return (DAY_TYPES as any)[type]?.cls ?? 'day-blank';
  }

  selectRow(row: EmployeeSheetRow): void {
    if (this.selectedRow?.employeeId === row.employeeId) {
      this.selectedRow = null;
      this.scheduleStartDraft = '';
      this.scheduleStartError = null;
      return;
    }
    this.selectedRow = row;
    this.scheduleStartDraft = row.workScheduleStartDate || '';
    this.scheduleStartError = null;
    this.showHistoryForm = false;
    this.historyFormError = null;
    this.loadScheduleHistory();
  }

  closeDetail(): void {
    this.selectedRow = null;
    this.scheduleHistory = [];
    this.showHistoryForm = false;
  }

  loadScheduleHistory(): void {
    if (!this.businessId || !this.selectedRow) return;
    this.loadingHistory = true;
    this.attendanceService.getScheduleHistory(this.businessId, this.selectedRow.employeeId).subscribe({
      next: list => { this.scheduleHistory = list; this.loadingHistory = false; },
      error: () => { this.loadingHistory = false; }
    });
  }

  openHistoryForm(): void {
    this.showHistoryForm = true;
    this.historyFormError = null;
    this.historyDraft = {
      workScheduleId: this.selectedRow?.workScheduleId ? String(this.selectedRow.workScheduleId) : '',
      startDate: '',
      endDate: '',
      cycleStartDate: '',
      notes: ''
    };
  }

  saveHistoryEntry(): void {
    if (!this.businessId || !this.selectedRow) return;
    if (!this.historyDraft.workScheduleId || !this.historyDraft.startDate) {
      this.historyFormError = 'La jornada y la fecha de inicio son obligatorias.';
      return;
    }
    this.savingHistory = true;
    this.historyFormError = null;
    this.attendanceService.addScheduleHistory(this.businessId, this.selectedRow.employeeId, {
      workScheduleId: Number(this.historyDraft.workScheduleId),
      startDate: this.historyDraft.startDate,
      endDate: this.historyDraft.endDate || null,
      cycleStartDate: this.historyDraft.cycleStartDate || null,
      notes: this.historyDraft.notes || null
    }).subscribe({
      next: () => {
        this.savingHistory = false;
        this.showHistoryForm = false;
        this.loadScheduleHistory();
        this.loadData();
      },
      error: (err) => {
        this.savingHistory = false;
        this.historyFormError = err?.error?.error || 'Error al guardar el cambio de jornada.';
      }
    });
  }

  deleteHistoryEntry(id: number): void {
    if (!this.businessId || !confirm('¿Eliminar este registro de jornada?')) return;
    this.attendanceService.deleteScheduleHistory(this.businessId, id).subscribe({
      next: () => { this.loadScheduleHistory(); this.loadData(); },
      error: () => {}
    });
  }

  loadClosure(): void {
    if (!this.businessId) return;
    this.attendanceService.getClosure(this.businessId, this.year, this.month).subscribe({
      next: c => { this.monthClosure = c; },
      error: () => { this.monthClosure = null; }
    });
  }

  closeCurrentMonth(): void {
    if (!this.businessId || !confirm('¿Cerrar la planilla de este mes? Los datos quedarán bloqueados para edición.')) return;
    this.closingMonth = true;
    this.closureError = null;
    this.attendanceService.closeMonth(this.businessId, this.year, this.month).subscribe({
      next: c => { this.monthClosure = c; this.closingMonth = false; },
      error: err => { this.closureError = err?.error?.error || 'Error al cerrar el mes.'; this.closingMonth = false; }
    });
  }

  reopenCurrentMonth(): void {
    if (!this.businessId || !confirm('¿Reabrir la planilla de este mes?')) return;
    this.attendanceService.reopenMonth(this.businessId, this.year, this.month).subscribe({
      next: c => { this.monthClosure = c; },
      error: () => {}
    });
  }

  get isMonthClosed(): boolean {
    return this.monthClosure?.status === 'CLOSED' || this.monthClosure?.status === 'APPROVED';
  }

  /** Genera y descarga el PDF de la planilla */
  async downloadPdf(): Promise<void> {
    // Resolver logo a Base64 si hay URL y aún no está convertido
    if (!this.businessLogoBase64 && this.businessLogoUrl) {
      try { this.businessLogoBase64 = await this.toDataUrl(this.businessLogoUrl); } catch { /* ignore */ }
    }
    this.pdfService.generate({
      businessName : this.businessName || 'Empresa',
      businessRuc  : this.businessRuc  ?? undefined,
      year         : this.year,
      month        : this.month,
      monthLabel   : this.getMonthLabel(),
      sheet        : this.filteredSheet.length ? this.filteredSheet : this.sheet,
      dayTypeKeys  : this.dayTypeKeys,
      logoBase64   : this.businessLogoBase64 || undefined,
    });
  }

  /** Al seleccionar el PDF firmado: cierra el mes automáticamente y sube el archivo */
  onSignedPdfSelected(event: Event): void {
    if (!this.businessId) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingPdf = true;
    this.uploadPdfError = null;

    const doUpload = () => {
      this.attendanceService.uploadSignedPdf(this.businessId!, this.year, this.month, file).subscribe({
        next: c => { this.monthClosure = c; this.uploadingPdf = false; },
        error: err => {
          this.uploadPdfError = err?.error?.error || 'Error al subir el PDF firmado.';
          this.uploadingPdf = false;
        }
      });
    };

    // Si el mes no está cerrado, cerrarlo primero y luego subir
    if (!this.isMonthClosed) {
      this.attendanceService.closeMonth(this.businessId!, this.year, this.month).subscribe({
        next: () => doUpload(),
        error: err => {
          this.uploadPdfError = err?.error?.error || 'Error al cerrar el mes antes de subir.';
          this.uploadingPdf = false;
        }
      });
    } else {
      doUpload();
    }

    // Limpiar input para permitir re-selección del mismo archivo
    input.value = '';
  }

  saveWorkScheduleStartDate(): void {
    if (!this.businessId || !this.selectedRow) return;
    this.savingScheduleStart = true;
    this.scheduleStartError = null;

    const startDate = (this.scheduleStartDraft || '').trim();
    const payload = startDate.length ? startDate : null;

    this.attendanceService.setWorkScheduleStartDate(this.businessId, this.selectedRow.employeeId, payload).subscribe({
      next: () => {
        this.savingScheduleStart = false;
        this.loadData();
      },
      error: () => {
        this.savingScheduleStart = false;
        this.scheduleStartError = 'No se pudo guardar la fecha de inicio.';
      }
    });
  }

  saveDay(row: EmployeeSheetRow, dayIdx: number, newType: DayType): void {
    if (!this.businessId) return;
    const date = this.monthDates[dayIdx];
    this.attendanceService.saveWorkDay(this.businessId, row.employeeId, date, newType).subscribe({
      next: () => {
        const entry = row.days[dayIdx];
        if (entry) {
          const oldType = entry.dayType;
          entry.dayType = newType;
          // Actualizar totales localmente
          if (row.totals[oldType as keyof DayTotals] > 0) {
            (row.totals as any)[oldType]--;
          }
          (row.totals as any)[newType] = ((row.totals as any)[newType] ?? 0) + 1;
          // Actualizar detalle si está abierto
          if (this.selectedRow?.employeeId === row.employeeId) {
            this.selectedRow = { ...row };
          }
        }
        this.editingCell = null;
      },
      error: err => console.error('Error guardando día:', err)
    });
  }

  startEdit(empId: number, dayIdx: number, event: Event): void {
    event.stopPropagation();
    // Si el popover de nota está abierto, cerrar y NO abrir el editor
    if (this.notePopover) {
      this.closeNotePopover();
      return;
    }
    if (this.permPopover) {
      this.closePermPopover();
      return;
    }
    if (this.accidentPopover) {
      this.closeAccidentPopover();
      return;
    }
    const row = this.filteredSheet.find(r => r.employeeId === empId) || this.sheet.find(r => r.employeeId === empId);
    if (row && this.isLocked(row, dayIdx)) {
      // Si es día de accidente, mostrar popover de accidente
      if (this.isAccidentDay(row, dayIdx)) {
        this.toggleAccidentPopover(empId, dayIdx, event);
        return;
      }
      // Si está bloqueado y es permiso aprobado con detalle, mostrar popover de permiso
      const entry = row.days[dayIdx];
      if (entry?.dayType === 'P' && typeof entry.notes === 'string' && entry.notes.trim().toUpperCase().startsWith('PERM:')) {
        this.togglePermPopover(empId, dayIdx, event);
      } else {
        this.notePopover = { empId, dayIdx };
      }
      return;
    }
    this.notePopover = null;
    this.permPopover = null;
    this.accidentPopover = null;
    this.editingCell = { empId, dayIdx };
  }

  isEditing(empId: number, dayIdx: number): boolean {
    return this.editingCell?.empId === empId && this.editingCell?.dayIdx === dayIdx;
  }

  cancelEdit(): void { this.editingCell = null; }

  isLocked(row: EmployeeSheetRow, dayIdx: number): boolean {
    const entry = row.days[dayIdx];
    if (!entry) return false;
    // Bloquear días de accidente de seguridad
    if (this.isAccidentDay(row, dayIdx)) return true;
    // Bloquear días de Vacaciones (V) y Horas Extra con motivo HE
    if (entry.dayType === 'V') return true;
    if (entry.dayType === 'EX' && typeof entry.notes === 'string' && entry.notes.trim().toUpperCase().startsWith('HE:')) return true;
    // Bloquear Permiso marcado automáticamente tras aprobación (nota PERM:{id})
    return entry.dayType === 'P' && typeof entry.notes === 'string' && entry.notes.trim().toUpperCase().startsWith('PERM:');
  }

  isNoteOpen(empId: number, dayIdx: number): boolean {
    return !!this.notePopover && this.notePopover.empId === empId && this.notePopover.dayIdx === dayIdx;
  }

  toggleNotePopover(empId: number, dayIdx: number, event: Event): void {
    event.stopPropagation();
    if (this.isNoteOpen(empId, dayIdx)) {
      this.notePopover = null;
    } else {
      this.notePopover = { empId, dayIdx };
      this.editingCell = null;
    }
  }

  closeNotePopover(): void { this.notePopover = null; }

  // ====== Popover Permiso ======
  isPermOpen(empId: number, dayIdx: number): boolean {
    return !!this.permPopover && this.permPopover.empId === empId && this.permPopover.dayIdx === dayIdx;
  }

  togglePermPopover(empId: number, dayIdx: number, event: Event): void {
    event.stopPropagation();
    if (!this.businessId) return;
    if (this.isPermOpen(empId, dayIdx)) { this.permPopover = null; return; }
    const row = this.filteredSheet.find(r => r.employeeId === empId) || this.sheet.find(r => r.employeeId === empId);
    if (!row) return;
    const entry = row.days[dayIdx];
    if (!entry || entry.dayType !== 'P' || typeof entry.notes !== 'string') return;
    const m = (entry.notes || '').trim().toUpperCase().match(/^PERM:(\d+)/);
    if (!m) { this.permPopover = { empId, dayIdx, loading: false, error: 'Permiso no vinculado', data: null }; return; }
    const permId = Number(m[1]);
    this.permPopover = { empId, dayIdx, loading: true, error: null, data: null };
    this.attendanceService.getPermissionById(this.businessId, permId).subscribe({
      next: (perm) => { this.permPopover = { empId, dayIdx, loading: false, error: null, data: perm }; },
      error: () => { this.permPopover = { empId, dayIdx, loading: false, error: 'No se pudo cargar el permiso.', data: null }; }
    });
    this.editingCell = null;
    this.notePopover = null;
  }

  closePermPopover(): void { this.permPopover = null; }

  getMonthLabel(): string {
    return this.months.find(m => m.v === this.month)?.l ?? '';
  }

  getTotalForKey(key: string): number {
    if (!this.kpis) return 0;
    return (this.kpis as any)[key] ?? 0;
  }

  // ─── Accidentes de seguridad ───
  private loadSafetyIncidents(): void {
    if (!this.businessRuc) return;
    const from = `${this.year}-${String(this.month).padStart(2,'0')}-01`;
    const lastDay = new Date(this.year, this.month, 0).getDate();
    const to = `${this.year}-${String(this.month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    this.incidentService.getSafetyByRucAndRange(this.businessRuc, from, to).subscribe({
      next: list => {
        this.incidentMap.clear();
        for (const inc of list) {
          if (inc.personCedula && inc.incidentDate) {
            const key = `${inc.personCedula.trim()}|${inc.incidentDate}`;
            this.incidentMap.set(key, inc);
          }
        }
        // Overlay accident days onto the already-loaded sheet
        this.applyAccidentOverlay();
        this.applyFilters();
      },
      error: () => {}
    });
  }

  /** Marca las celdas de accidente con dayType='A' en el sheet cargado */
  private applyAccidentOverlay(): void {
    if (this.incidentMap.size === 0 || this.sheet.length === 0) return;
    for (const row of this.sheet) {
      if (!row.cedula) continue;
      let accidentCount = 0;
      for (let i = 0; i < row.days.length; i++) {
        const date = this.monthDates[i];
        if (!date) continue;
        const key = `${row.cedula.trim()}|${date}`;
        if (this.incidentMap.has(key)) {
          const entry = row.days[i];
          const oldType = entry.dayType;
          if (oldType !== 'A' as DayType) {
            entry.dayType = 'A' as DayType;
            // Ajustar totales
            if (oldType && (row.totals as any)[oldType] > 0) {
              (row.totals as any)[oldType]--;
            }
            (row.totals as any)['A'] = ((row.totals as any)['A'] ?? 0) + 1;
          }
          accidentCount++;
        }
      }
    }
  }

  getIncidentForCell(row: EmployeeSheetRow, dayIdx: number): BusinessIncidentDto | null {
    if (!row.cedula) return null;
    const date = this.monthDates[dayIdx];
    return this.incidentMap.get(`${row.cedula.trim()}|${date}`) || null;
  }

  isAccidentDay(row: EmployeeSheetRow, dayIdx: number): boolean {
    return this.getIncidentForCell(row, dayIdx) !== null;
  }

  isAccidentPopoverOpen(empId: number, dayIdx: number): boolean {
    return !!this.accidentPopover && this.accidentPopover.empId === empId && this.accidentPopover.dayIdx === dayIdx;
  }

  toggleAccidentPopover(empId: number, dayIdx: number, event: Event): void {
    event.stopPropagation();
    if (this.isAccidentPopoverOpen(empId, dayIdx)) {
      this.accidentPopover = null;
      return;
    }
    const row = this.filteredSheet.find(r => r.employeeId === empId) || this.sheet.find(r => r.employeeId === empId);
    if (!row) return;
    const inc = this.getIncidentForCell(row, dayIdx);
    if (!inc) return;
    this.accidentPopover = { empId, dayIdx, incident: inc };
    this.editingCell = null;
    this.notePopover = null;
    this.permPopover = null;
  }

  closeAccidentPopover(): void {
    this.accidentPopover = null;
  }

  navigateTo(sub: string): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', sub]);
    }
  }

  trackByEmployee(_i: number, row: EmployeeSheetRow): number { return row.employeeId; }
  trackByDay(_i: number, d: WorkDayEntry): string { return d.date; }
}
