import { Component, HostListener, OnInit } from '@angular/core';
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

/** Fila del modal “Detalle de registro de asistencia” (derivada de planilla + horas extra API) */
export interface AttendanceDetailRow {
  employeeId: number;
  initials: string;
  fullName: string;
  position: string;
  cedula: string;
  daysWorked: number;
  overtimeHours: number;
  extraDays: number;
  restDays: number;
  permDays: number;
  permHours: number;
  sickness: number;
  accidents: number;
  /** Horas pactadas por día según jornada/horario (8, 10, etc.) */
  dailyHours: number;
  /** Horas hombre trabajadas en el periodo (días trabajados + extras) * horas/día + horas extra */
  hhtt: number;
  /** Días perdidos: permisos (días + horas convertidas), enfermedad y accidentes */
  lostDays: number;
}

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
  historyDraft = { workScheduleId: '', startDate: '', endDate: '', cycleStartDate: '', dailyHours: '', notes: '' };
  updatingDailyHours = false;
  dailyHoursUpdateError: string | null = null;

  // Cierre mensual
  monthClosure: MonthlyClosureEntry | null = null;
  closingMonth = false;
  closureError: string | null = null;
  uploadingPdf = false;
  uploadPdfError: string | null = null;

  // Historial de cierres (todos los meses)
  closures: MonthlyClosureEntry[] = [];
  closuresLoading = false;
  closuresError: string | null = null;

  // Resumen mensual (personas y HHTT)
  peopleCountSummary = 0;
  hhttTotalSummary: number | null = null;
  hhttSummaryLoading = false;
  hhttSummaryError: string | null = null;

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
  /** Solo las opciones editables manualmente desde la planilla */
  readonly editableDayTypeKeys: DayType[] = ['T', 'D'];

  clearingDay = false;

  // Accidentes de seguridad: mapa cédula+fecha → incidente
  private incidentMap: Map<string, BusinessIncidentDto> = new Map();
  accidentPopover: { empId: number; dayIdx: number; incident: BusinessIncidentDto } | null = null;

  /** Modal: detalle de asistencia (vista tipo dashboard) */
  showAttendanceDetailModal = false;
  attendanceDetailLoading = false;
  attendanceDetailError: string | null = null;
  attendanceDetailRows: AttendanceDetailRow[] = [];
  attendanceDetailMetrics = { total: 0, avgOvertimeHrs: 0, incidentEmployees: 0 };
  attendanceDetailTotals = { scheduledHours: 0, hhtt: 0, lostDays: 0 };
  /** Horas extra del mes por empleado (tabla employee_overtime) */
  private overtimeHoursByEmployee = new Map<number, number>();
  readonly attendanceDetailStandardHrs = 8;
  readonly defaultDailyHours = 8;

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
        // Resumen: cantidad de personas + HHTT total para el mes seleccionado
        this.computeMonthlySummary();
        this.loading = false;
      },
      error: err => {
        this.error = 'No se pudo cargar la planilla. Intente nuevamente.';
        this.loading = false;
        console.error(err);
      }
    });

    this.loadClosure();
    this.loadClosures();
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
    this.dailyHoursUpdateError = null;
    this.historyDraft = {
      workScheduleId: this.selectedRow?.workScheduleId ? String(this.selectedRow.workScheduleId) : '',
      startDate: '',
      endDate: '',
      cycleStartDate: '',
      dailyHours: this.selectedDailyHours ? String(this.selectedDailyHours) : '',
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
      dailyHours: this.historyDraft.dailyHours
        ? Number(this.historyDraft.dailyHours.replace(',', '.'))
        : null,
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
      next: c => {
        this.monthClosure = c;
        this.applyClosureMetricsToSummary();
      },
      error: () => { this.monthClosure = null; }
    });
  }

   loadClosures(): void {
    if (!this.businessId) return;
    this.closuresLoading = true;
    this.closuresError = null;
    this.attendanceService.getClosures(this.businessId).subscribe({
      next: list => {
        this.closures = [...list].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        this.closuresLoading = false;
      },
      error: err => {
        console.error('[Planilla] Error cargando historial de cierres:', err);
        this.closuresLoading = false;
        this.closuresError = 'No se pudo cargar el historial de meses.';
      }
    });
  }

  closeCurrentMonth(): void {
    if (!this.businessId || !confirm('¿Cerrar la planilla de este mes? Los datos quedarán bloqueados para edición.')) return;
    this.closingMonth = true;
    this.closureError = null;
    this.attendanceService.closeMonth(this.businessId, this.year, this.month).subscribe({
      next: c => {
        this.monthClosure = c;
        this.closingMonth = false;
        this.applyClosureMetricsToSummary();
      },
      error: err => { this.closureError = err?.error?.error || 'Error al cerrar el mes.'; this.closingMonth = false; }
    });
  }

  reopenCurrentMonth(): void {
    if (!this.businessId || !confirm('¿Reabrir la planilla de este mes?')) return;
    this.attendanceService.reopenMonth(this.businessId, this.year, this.month).subscribe({
      next: c => {
        this.monthClosure = c;
        this.applyClosureMetricsToSummary();
      },
      error: () => {}
    });
  }

  get isMonthClosed(): boolean {
    return this.monthClosure?.status === 'CLOSED' || this.monthClosure?.status === 'APPROVED';
  }

  viewSignedClosurePdf(c: MonthlyClosureEntry): void {
    if (!this.businessId || !c || !c.signedPdfPath) return;
    this.attendanceService.getClosureSignedPdf(this.businessId, c.year, c.month).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: err => {
        const msg = err?.error?.error || 'No se pudo descargar el PDF firmado.';
        alert(msg);
      }
    });
  }

  getClosureMonthLabel(month: number): string {
    const found = this.months.find(m => m.v === month);
    return found ? found.l : String(month);
  }

  private computeMonthlySummary(): void {
    if (!this.businessId) return;
    const src = this.sheet;
    this.peopleCountSummary = src.length;
    if (!src.length) {
      this.hhttTotalSummary = 0;
      this.hhttSummaryError = null;
      this.hhttSummaryLoading = false;
      return;
    }

    this.hhttSummaryLoading = true;
    this.hhttSummaryError = null;

    this.attendanceService.getOvertime(this.businessId, this.year, this.month).subscribe({
      next: list => {
        const map = new Map<number, number>();
        for (const o of list) {
          const eid = o.employeeId;
          if (eid == null) continue;
          const h = Number(o.hoursTotal) || 0;
          map.set(eid, (map.get(eid) ?? 0) + h);
        }
        let total = 0;
        for (const row of src) {
          const daily = this.parseDailyHoursFromShiftName(row.workShiftName) ?? this.defaultDailyHours;
          const t = row.totals.T ?? 0;
          const ex = row.totals.EX ?? 0;
          const oh = map.get(row.employeeId) ?? 0;
          const workedDays = t + ex;
          const ordHrs = workedDays * daily;
          total += ordHrs + oh;
        }
        this.hhttTotalSummary = Math.round(total * 10) / 10;
        this.hhttSummaryLoading = false;
      },
      error: err => {
        console.error('[Planilla] Error cargando horas extra para resumen HHTT:', err);
        let total = 0;
        for (const row of src) {
          const daily = this.parseDailyHoursFromShiftName(row.workShiftName) ?? this.defaultDailyHours;
          const t = row.totals.T ?? 0;
          const ex = row.totals.EX ?? 0;
          const workedDays = t + ex;
          total += workedDays * daily;
        }
        this.hhttTotalSummary = Math.round(total * 10) / 10;
        this.hhttSummaryLoading = false;
        this.hhttSummaryError = 'No se pudieron incluir las horas extra en el cálculo de HHTT.';
      }
    });
  }

  private applyClosureMetricsToSummary(): void {
    if (!this.monthClosure) return;
    if (this.monthClosure.peopleCount != null) {
      this.peopleCountSummary = this.monthClosure.peopleCount;
    }
    if (this.monthClosure.hhttTotalHours != null) {
      this.hhttTotalSummary = Math.round(this.monthClosure.hhttTotalHours * 10) / 10;
      this.hhttSummaryLoading = false;
      this.hhttSummaryError = null;
    }
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
      monthClosed  : this.isMonthClosed,
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
        next: c => {
          this.monthClosure = c;
          this.uploadingPdf = false;
          this.applyClosureMetricsToSummary();
        },
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
          // Actualizar totales localmente (oldType puede ser null si era un día vacío)
          if (oldType && (row.totals as any)[oldType] > 0) {
            (row.totals as any)[oldType]--;
          }
          (row.totals as any)[newType] = ((row.totals as any)[newType] ?? 0) + 1;
          // Actualizar detalle si está abierto
          if (this.selectedRow?.employeeId === row.employeeId) {
            this.selectedRow = { ...row };
          }
        }
        // Mantener picker abierto para edición continua; el usuario cierra con Escape o X
      },
      error: err => console.error('Error guardando día:', err)
    });
  }

  clearDay(row: EmployeeSheetRow, dayIdx: number): void {
    if (!this.businessId) return;
    const date = this.monthDates[dayIdx];
    this.clearingDay = true;
    this.attendanceService.deleteWorkDay(this.businessId, row.employeeId, date).subscribe({
      next: () => {
        const entry = row.days[dayIdx];
        if (entry) {
          const oldType = entry.dayType;
          entry.dayType = null as any;
          if (oldType && (row.totals as any)[oldType] > 0) {
            (row.totals as any)[oldType]--;
          }
          if (this.selectedRow?.employeeId === row.employeeId) {
            this.selectedRow = { ...row };
          }
        }
        this.clearingDay = false;
        this.editingCell = null;
      },
      error: err => {
        console.error('Error borrando día:', err);
        this.clearingDay = false;
      }
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
  trackByDetailRow(_i: number, row: AttendanceDetailRow): number { return row.employeeId; }
  trackByDay(_i: number, d: WorkDayEntry): string { return d.date; }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(_ev: KeyboardEvent): void {
    // Cerrar picker de día primero; si no hay picker, cerrar modal si está abierto
    if (this.editingCell) {
      this.editingCell = null;
      return;
    }
    if (this.showAttendanceDetailModal) {
      this.closeAttendanceDetail();
    }
  }

  openAttendanceDetail(): void {
    if (!this.businessId || this.loading) return;
    this.showAttendanceDetailModal = true;
    this.refreshAttendanceDetail();
  }

  closeAttendanceDetail(): void {
    this.showAttendanceDetailModal = false;
    this.attendanceDetailError = null;
  }

  onAttendanceDetailBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.closeAttendanceDetail();
    }
  }

  /** Recarga el detalle (y la planilla) cuando se cambia año/mes desde el modal. */
  onDetailPeriodChange(): void {
    this.buildCalendar();
    this.loadData();
    if (this.businessId) {
      this.refreshAttendanceDetail();
    }
  }

  private refreshAttendanceDetail(): void {
    if (!this.businessId) return;
    this.attendanceDetailLoading = true;
    this.attendanceDetailError = null;
    this.attendanceService.getOvertime(this.businessId, this.year, this.month).subscribe({
      next: (list) => {
        this.overtimeHoursByEmployee.clear();
        for (const o of list) {
          const eid = o.employeeId;
          if (eid == null) continue;
          const h = Number(o.hoursTotal) || 0;
          this.overtimeHoursByEmployee.set(eid, (this.overtimeHoursByEmployee.get(eid) ?? 0) + h);
        }
        this.rebuildAttendanceDetailRows();
        this.attendanceDetailLoading = false;
      },
      error: (err) => {
        console.error('[Consolidado HHTT] Error cargando horas extra para detalle:', err);
        this.attendanceDetailLoading = false;
        this.attendanceDetailError =
          err?.error?.message ?? err?.message ?? 'No se pudo cargar el detalle de horas extra.';
        // Aun con error en horas extra, mostrar filas con horas extra = 0
        this.overtimeHoursByEmployee.clear();
        this.rebuildAttendanceDetailRows();
      }
    });
  }

  private rebuildAttendanceDetailRows(): void {
    const src = this.filteredSheet.length ? this.filteredSheet : this.sheet;
    let scheduledHoursTotal = 0;
    let hhttTotal = 0;
    let lostDaysTotal = 0;

    this.attendanceDetailRows = src.map((row) => {
      const oh = this.overtimeHoursByEmployee.get(row.employeeId) ?? 0;
      // Usar totals.T/EX del sheet (siempre calculados desde los datos cargados del servidor)
      const t = row.totals.T ?? 0;
      const ex = row.totals.EX ?? 0;
      const rest = row.totals.D ?? 0;
      const permDays = row.totals.P ?? 0;
      const sick = row.totals.E ?? 0;
      const acc = row.totals.A ?? 0;
      // Horas pactadas por día: intentar leer del nombre del horario de trabajo; fallback a default
      const daily = this.parseDailyHoursFromShiftName(row.workShiftName) ?? this.defaultDailyHours;
      // HHTT (en horas): (días trabajados + días EX guardados) * horas/día + horas extra
      const workedDays = t + ex;
      const ordHrs = workedDays * daily;
      const hhtt = ordHrs + oh;
      // Días perdidos: permisos (días) + enfermedad + accidentes (+ permisos por horas cuando se conecten)
      const permHours = 0; // TODO: sumar permisos por horas desde módulo de permisos
      const lostFromPermHours = daily > 0 ? permHours / daily : 0;
      const lostDays = permDays + sick + acc + lostFromPermHours;

      scheduledHoursTotal += daily;
      hhttTotal += hhtt;
      lostDaysTotal += lostDays;

      return {
        employeeId: row.employeeId,
        initials: this.initialsFromName(row.fullName),
        fullName: row.fullName,
        position: row.position || '—',
        cedula: row.cedula || '—',
        daysWorked: t,
        overtimeHours: Math.round(oh * 10) / 10,
        extraDays: ex,
        restDays: rest,
        permDays,
        permHours,
        sickness: sick,
        accidents: acc,
        dailyHours: Math.round(daily * 10) / 10,
        hhtt: Math.round(hhtt * 10) / 10,
        lostDays: Math.round(lostDays * 10) / 10
      };
    });
    const n = this.attendanceDetailRows.length;
    const sumOh = this.attendanceDetailRows.reduce((a, r) => a + r.overtimeHours, 0);
    const inc = this.attendanceDetailRows.filter((r) => r.accidents > 0).length;
    this.attendanceDetailMetrics = {
      total: n,
      avgOvertimeHrs: n ? Math.round((sumOh / n) * 10) / 10 : 0,
      incidentEmployees: inc
    };

    this.attendanceDetailTotals = {
      scheduledHours: Math.round(scheduledHoursTotal * 10) / 10,
      hhtt: Math.round(hhttTotal * 10) / 10,
      lostDays: Math.round(lostDaysTotal * 10) / 10
    };
  }

  private initialsFromName(name: string): string {
    const p = (name || '').trim().split(/\s+/).filter(Boolean);
    if (p.length === 0) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  attendanceDetailAvatarClass(index: number): string {
    return ['pm-ad-avatar--a', 'pm-ad-avatar--b', 'pm-ad-avatar--c'][index % 3];
  }

  attendanceDetailSecurityLabel(): string {
    const n = this.attendanceDetailMetrics.incidentEmployees;
    if (n === 0) return 'Sin incidencias';
    if (n === 1) return '1 incidencia';
    return `${n} incidencias`;
  }

  /** Actualiza las horas/día del periodo vigente directamente en el historial (auto-guardado al salir del campo). */
  onDailyHoursBlur(h: WorkScheduleHistoryEntry, rawValue: string): void {
    if (!this.businessId || !h || !!h.endDate) return;
    const trimmed = (rawValue ?? '').toString().trim();
    let value: number | null;
    if (!trimmed) {
      value = null;
    } else {
      const parsed = parseFloat(trimmed.replace(',', '.'));
      if (isNaN(parsed) || parsed <= 0 || parsed > 24) {
        this.dailyHoursUpdateError = 'Las horas por día deben estar entre 1 y 24.';
        return;
      }
      value = parsed;
    }
    // Si no hay cambio real, no llamar al backend
    const current = h.dailyHours != null ? h.dailyHours : null;
    if ((current === null && value === null) || (current !== null && value !== null && Math.abs(current - value) < 0.01)) {
      return;
    }

    this.updatingDailyHours = true;
    this.dailyHoursUpdateError = null;
    this.attendanceService.updateScheduleHistory(this.businessId, h.id, {
      endDate: h.endDate,
      cycleStartDate: h.cycleStartDate,
      dailyHours: value,
      notes: h.notes
    }).subscribe({
      next: (updated) => {
        // Actualizar el registro en memoria
        h.dailyHours = updated.dailyHours;
        h.endDate = updated.endDate;
        h.cycleStartDate = updated.cycleStartDate;
        this.updatingDailyHours = false;
      },
      error: (err) => {
        this.updatingDailyHours = false;
        this.dailyHoursUpdateError = err?.error?.error || 'No se pudieron guardar las horas por día.';
      }
    });
  }

  /** Horas/día estimadas para la jornada activa del empleado seleccionado. */
  get selectedDailyHours(): number {
    const row = this.selectedRow;
    if (!row) return this.defaultDailyHours;
    // 1) Preferir horas del registro vigente en el histórico, si ya está cargado
    const currentHist = this.scheduleHistory.find((h) => !h.endDate) || this.scheduleHistory[0];
    if (currentHist && currentHist.dailyHours && currentHist.dailyHours > 0 && currentHist.dailyHours <= 24) {
      return currentHist.dailyHours;
    }
    // 2) Intentar inferir desde el nombre del horario de trabajo (workShift)
    const fromShift = this.parseDailyHoursFromShiftName(row.workShiftName);
    return fromShift ?? this.defaultDailyHours;
  }

  private parseDailyHoursFromShiftName(name?: string | null): number | null {
    if (!name) return null;
    const s = name.toLowerCase();
    // 1) Buscar patrón explícito de horas, p.ej. "8h", "10 horas", "12 hora"
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*(h|hora|horas)\b/);
    if (m) {
      const raw = m[1].replace(',', '.');
      const v = parseFloat(raw);
      if (!isNaN(v) && v > 0 && v <= 24) return v;
    }
    // 2) Fallback: primer número "suelto" razonable (evitar capturar años, etc.)
    const m2 = s.match(/(\d+(?:[.,]\d+)?)/);
    if (m2) {
      const raw = m2[1].replace(',', '.');
      const v = parseFloat(raw);
      if (!isNaN(v) && v > 0 && v <= 24) return v;
    }
    return null;
  }
}
