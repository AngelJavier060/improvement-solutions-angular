import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, VacationRecord } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../models/employee.model';
import { Subject } from 'rxjs';
import { filter, map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { extractUsuarioRucFromRoute, resolveThBusinessFromRoute } from '../utils/th-business-from-route';

export interface AnnualPlanRow {
  employeeId: number;
  employeeName: string;
  department: string;
  hireDate: string;
  balanceDays: number;
  replacement: string;
  months: boolean[];
  replanification: string;
  observations: string;
}

@Component({
  selector: 'app-vacaciones',
  templateUrl: './vacaciones.component.html',
  styleUrls: ['./vacaciones.component.scss']
})
export class VacacionesComponent implements OnInit, OnDestroy, AfterViewInit {

  activeTab: 'solicitudes' | 'planificacion' = 'solicitudes';

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';
  businessLogoUrl: string | null = null;

  employees: EmployeeResponse[] = [];
  records: VacationRecord[] = [];
  uploadingPdfId: number | null = null;

  selectedEmployee: EmployeeResponse | null = null;
  previewRecord: VacationRecord | null = null;
  // Search used for employee list (legacy) and for records list
  searchEmp: string = '';
  // Filters for main schedule table
  searchDept: string = '';
  qRecords: string = '';
  activeStatus: 'ALL' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EN_CURSO' = 'ALL';
  showNewForm = false;

  form!: FormGroup;
  showForm = false;
  saving = false;
  loading = false;
  loadingEmps = false;
  error: string | null = null;
  successMsg: string | null = null;

  filterYear: number = new Date().getFullYear();
  filterMonth: number = new Date().getMonth() + 1;

  // ── Annual planning ──
  planYear: number = new Date().getFullYear();
  planRows: AnnualPlanRow[] = [];
  loadingPlan = false;
  printingPlan = false;
  planYearRecords: VacationRecord[] = [];
  private chartRenderTimer: any = null;
  planDeptFilter: string = '';
  private chartRetries = 0;

  private readonly destroy$ = new Subject<void>();

  // Approval section
  elaboradoNombre = '';
  elaboradoCargo  = '';
  revisadoNombre  = '';
  revisadoCargo   = '';
  aprobadoNombre  = '';
  aprobadoCargo   = '';

  readonly MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

  // Metadatos del documento (encabezado y resumen)
  docCode: string = 'GTH-PRO-01-F4';
  docRevisionDate: string = '';
  docRevision: string = '00';

  readonly months = [
    {v:1,l:'Enero'},{v:2,l:'Febrero'},{v:3,l:'Marzo'},{v:4,l:'Abril'},
    {v:5,l:'Mayo'},{v:6,l:'Junio'},{v:7,l:'Julio'},{v:8,l:'Agosto'},
    {v:9,l:'Septiembre'},{v:10,l:'Octubre'},{v:11,l:'Noviembre'},{v:12,l:'Diciembre'}
  ];
  readonly availableYears = Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private businessContext: BusinessContextService,
    private businessService: BusinessService
  ) {}

  get displayBusinessName(): string {
    return (this.businessName || '').trim() || 'Empresa';
  }

  ngOnInit(): void {
    this.buildForm();
    this.setDefaultSignatures();
    this.docRevisionDate = this.getTodayDateStr();
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
        this.businessLogoUrl = null;
        return;
      }
      this.businessId = b.id;
      this.businessRuc = b.ruc;
      this.businessName = b.name;
      this.businessLogoUrl = this.resolveLogoUrl(b.logo || '');
      this.businessService.getById(b.id).subscribe({
        next: (x: any) => {
          this.businessLogoUrl = this.resolveLogoUrl(x?.logo || x?.logoUrl || '');
        },
        error: () => { /* ignore */ }
      });
      this.loadEmployees();
      this.loadRecords();
    });
  }

  // Top meses por carga (empleados)
  get topMonthsByEmployees(): number[] {
    const counts = this.planMonthlyCounts.map((v, i) => ({ i, v }));
    counts.sort((a, b) => b.v - a.v);
    const top = counts.slice(0, 3).map(x => x.i);
    return top;
  }
  isTopMonth(i: number): boolean { return this.topMonthsByEmployees.includes(i); }

  ngAfterViewInit(): void {
    // Render inicial de gráficas tras montar vista
    setTimeout(() => this.renderPlanCharts(), 0);
  }

  activateTab(tab: 'solicitudes' | 'planificacion'): void {
    this.activeTab = tab;
    if (tab === 'planificacion') {
      // Pequeño delay para asegurar layout antes de medir canvas
      setTimeout(() => this.renderPlanCharts(), 60);
    }
  }

  onPlanDeptChange(): void {
    // Al cambiar el departamento filtramos KPIs y re-renderizamos las gráficas
    setTimeout(() => this.renderPlanCharts(), 0);
  }

  private buildForm(): void {
    this.form = this.fb.group({
      startDate:       ['', Validators.required],
      endDate:         ['', Validators.required],
      daysAccumulated: [15, [Validators.required, Validators.min(0)]],
      notes:           [''],
      status:          ['APROBADO']
    });
  }

  private getTodayDateStr(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  loadEmployees(): void {
    if (!this.businessRuc) return;
    this.loadingEmps = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: emps => {
        this.employees = emps.filter(e => e.active !== false);
        this.loadingEmps = false;
        this.buildPlanRows();
      },
      error: () => { this.loadingEmps = false; }
    });
  }

  loadRecords(): void {
    if (!this.businessId) return;
    this.loading = true;
    this.attendanceService.getVacations(this.businessId, this.filterYear, this.filterMonth).subscribe({
      next: recs => { this.records = recs; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  // ── Annual planning helpers ──

  buildPlanRows(): void {
    this.planRows = this.employees.map(emp => ({
      employeeId:      emp.id,
      employeeName:    this.getFullName(emp),
      department:      (emp as any).departmentName || (emp as any).department || (emp as any).cargo || '',
      hireDate:        (emp as any).fechaIngreso || (emp as any).hireDate || '',
      balanceDays:     15,
      replacement:     '',
      months:          Array(12).fill(false),
      replanification: '',
      observations:    ''
    }));
    this.enrichPlanRowsFromRecords();
  }

  private enrichPlanRowsFromRecords(): void {
    if (!this.businessId) return;
    this.loadingPlan = true;
    this.attendanceService.getVacations(this.businessId, this.planYear).subscribe({
      next: recs => {
        this.planYearRecords = recs || [];
        recs.forEach(rec => {
          const row = this.planRows.find(r => r.employeeId === rec.employeeId);
          if (!row) return;
          if (rec.daysAccumulated != null) row.balanceDays = rec.daysAccumulated;
          const sm = rec.startDate ? new Date(rec.startDate).getMonth() : null;
          const em = rec.endDate   ? new Date(rec.endDate).getMonth()   : null;
          if (sm !== null && em !== null) {
            const a = Math.min(sm, em);
            const b = Math.max(sm, em);
            for (let m = a; m <= b; m++) {
              if (m >= 0 && m < 12) row.months[m] = true;
            }
          } else if (sm !== null) {
            if (sm >= 0 && sm < 12) row.months[sm] = true;
          } else if (em !== null) {
            if (em >= 0 && em < 12) row.months[em] = true;
          }
          if (rec.notes) row.observations = rec.notes;
        });
        this.loadingPlan = false;
        setTimeout(() => this.renderPlanCharts(), 0);
      },
      error: () => { this.loadingPlan = false; }
    });
  }

  onPlanYearChange(): void {
    this.enrichPlanRowsFromRecords();
    setTimeout(() => this.renderPlanCharts(), 0);
  }

  toggleMonth(row: AnnualPlanRow, idx: number): void {
    row.months[idx] = !row.months[idx];
    this.renderPlanCharts();
  }

  checkedMonthsCount(row: AnnualPlanRow): number {
    return row.months.filter(Boolean).length;
  }

  printPlan(): void {
    window.print();
  }

  getEmptyRows(): number[] {
    const minRows = 21;
    const count = Math.max(0, minRows - this.planRows.length);
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  // ── Resumen de Planificación (Matriz) ──
  get filteredPlanRows(): AnnualPlanRow[] {
    const d = (this.planDeptFilter || '').trim().toLowerCase();
    if (!d) return this.planRows;
    return this.planRows.filter(r => (r.department || '').toLowerCase() === d);
  }
  get planSummaryEmployeesTotal(): number { return this.filteredPlanRows.length; }
  get planSummaryEmployeesWithPlan(): number { return this.filteredPlanRows.filter(r => this.checkedMonthsCount(r) > 0).length; }
  get planSummaryMonthsPlanned(): number { return this.filteredPlanRows.reduce((s, r) => s + this.checkedMonthsCount(r), 0); }
  get planSummarySaldoTotal(): number { return this.filteredPlanRows.reduce((s, r) => s + (Number(r.balanceDays) || 0), 0); }
  get planSummaryReplanCount(): number { return this.filteredPlanRows.filter(r => (r.replanification || '').trim().length > 0).length; }

  get planSummaryByDept(): Array<{ department: string; employees: number; months: number }>{
    const map = new Map<string, { department: string; employees: number; months: number }>();
    for (const r of this.filteredPlanRows) {
      const months = this.checkedMonthsCount(r);
      if (months <= 0) continue; // considerar solo quienes tienen planificación
      const key = (r.department || '—').toUpperCase();
      if (!map.has(key)) map.set(key, { department: key, employees: 0, months: 0 });
      const it = map.get(key)!;
      it.employees += 1;
      it.months    += months;
    }
    return Array.from(map.values()).sort((a,b) => b.employees - a.employees || b.months - a.months);
  }

  get planSummaryTopDepts(): Array<{ department: string; employees: number; months: number }>{
    return [...this.planSummaryByDept]
      .sort((a,b) => b.months - a.months || b.employees - a.employees)
      .slice(0, 5);
  }

  private get planAllowedEmpIds(): Set<number> | null {
    const d = (this.planDeptFilter || '').trim();
    if (!d) return null;
    return new Set(this.filteredPlanRows.map(r => r.employeeId));
  }

  get planMonthlyCounts(): number[] {
    // Contar empleados con planificación por mes usando los registros del año (automático)
    const sets: Array<Set<string>> = Array.from({ length: 12 }, () => new Set<string>());
    const dayMs = 24 * 60 * 60 * 1000;
    const allow = this.planAllowedEmpIds;
    for (const rec of this.planYearRecords || []) {
      if (!rec.startDate || !rec.endDate) continue;
      if (allow && rec.employeeId != null && !allow.has(rec.employeeId)) continue;
      const sd = new Date(rec.startDate + 'T00:00:00');
      const ed = new Date(rec.endDate   + 'T00:00:00');
      const edEx = new Date(ed.getTime() + dayMs); // fin exclusivo
      const empKey = String(rec.employeeId ?? rec.employeeName ?? rec.id ?? 'emp');
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(this.planYear, m, 1);
        const mEnd   = new Date(this.planYear, m + 1, 1);
        const start  = sd > mStart ? sd : mStart;
        const end    = edEx < mEnd ? edEx : mEnd;
        if (end.getTime() - start.getTime() > 0) sets[m].add(empKey);
      }
    }
    return sets.map(s => s.size);
  }

  get planMonthlyDaysCounts(): number[] {
    const dayMs = 24 * 60 * 60 * 1000;
    const res: number[] = Array(12).fill(0);
    const allow = this.planAllowedEmpIds;
    for (const rec of this.planYearRecords || []) {
      if (!rec.startDate || !rec.endDate) continue;
      if (allow && rec.employeeId != null && !allow.has(rec.employeeId)) continue;
      const sd = new Date(rec.startDate + 'T00:00:00');
      const ed = new Date(rec.endDate   + 'T00:00:00');
      // Usar fin exclusivo (+1 día) para conteo exacto
      const edEx = new Date(ed.getTime() + dayMs);
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(this.planYear, m, 1);
        const mEnd   = new Date(this.planYear, m + 1, 1); // exclusivo
        const start  = sd > mStart ? sd : mStart;
        const end    = edEx < mEnd ? edEx : mEnd;
        const diff   = end.getTime() - start.getTime();
        if (diff > 0) res[m] += Math.floor(diff / dayMs);
      }
    }
    return res;
  }

  // Helpers para gráficas (escalas y estilos)
  get planMonthlyMaxCount(): number {
    const arr = this.planMonthlyCounts;
    return arr.reduce((m, v) => Math.max(m, v || 0), 0);
  }
  get planMonthlyMaxDays(): number {
    const arr = this.planMonthlyDaysCounts;
    return arr.reduce((m, v) => Math.max(m, v || 0), 0);
  }
  get planDeptMaxMonths(): number {
    const arr = this.planSummaryByDept.map(d => d.months || 0);
    return arr.reduce((m, v) => Math.max(m, v || 0), 0);
  }
  barWidth(value: number | null | undefined, max: number): string {
    const v = Number(value) || 0;
    const mx = Number(max) || 0;
    if (mx <= 0) return '0%';
    const pct = Math.max(0, Math.min(100, Math.round((v / mx) * 100)));
    return pct + '%';
  }

  // ── Render de gráficas (Canvas 2D sin librerías) ──
  @HostListener('window:resize') onResize(): void {
    if (this.chartRenderTimer) clearTimeout(this.chartRenderTimer);
    this.chartRenderTimer = setTimeout(() => this.renderPlanCharts(), 200);
  }

  private renderPlanCharts(): void {
    try {
      if (typeof document !== 'undefined') {
        const ready = (id: string) => {
          const el = document.getElementById(id) as HTMLCanvasElement | null;
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 50 && rect.height >= 0; // height may be 0 until styled; we'll set default below
        };
        const allReady = ready('chartEmpPerMonth') && ready('chartDaysPerMonth') && ready('chartDeptBars');
        if (!allReady) {
          if (this.chartRetries < 6) {
            this.chartRetries++;
            setTimeout(() => this.renderPlanCharts(), 160);
          } else {
            this.chartRetries = 0;
          }
          return;
        }
      }
      this.chartRetries = 0;
      // Meses: empleados planificados
      this.drawBarChart('chartEmpPerMonth', this.MONTHS_SHORT, this.planMonthlyCounts, this.planMonthlyMaxCount, '#1d4ed8');
      // Meses: días planificados
      this.drawBarChart('chartDaysPerMonth', this.MONTHS_SHORT, this.planMonthlyDaysCounts, this.planMonthlyMaxDays, '#0ea5e9');
      // Departamentos (top): meses planificados
      const depts = this.planSummaryTopDepts;
      this.drawHBarChart('chartDeptBars', depts.map(d => d.department), depts.map(d => d.months || 0), this.planDeptMaxMonths, '#10b981');
    } catch { /* ignore */ }
  }

  private getCtx(canvasId: string): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!el) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = el.getBoundingClientRect();
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(160, Math.floor(rect.height || 200));
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(h * dpr);
    const ctx = el.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  private drawBarChart(canvasId: string, labels: string[], data: number[], max: number, color: string): void {
    const base = this.getCtx(canvasId);
    if (!base) return;
    const { ctx, w, h } = base;
    const m = { l: 28, r: 12, t: 16, b: 22 };
    const cw = w - m.l - m.r;
    const ch = h - m.t - m.b;
    const n = data.length;
    const gap = 6;
    const bar = Math.max(6, Math.floor((cw - gap * (n - 1)) / n));
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(m.l, m.t);
    ctx.lineTo(m.l, m.t + ch);
    ctx.lineTo(m.l + cw, m.t + ch);
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const v = Number(data[i]) || 0;
      const x = m.l + i * (bar + gap);
      const hBar = max > 0 ? Math.round((v / max) * ch) : 0;
      ctx.fillStyle = color;
      ctx.fillRect(x, m.t + ch - hBar, bar, hBar);
      // etiqueta inferior
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || '', x + bar / 2, h - 6);
    }
  }

  private drawHBarChart(canvasId: string, labels: string[], data: number[], max: number, color: string): void {
    const base = this.getCtx(canvasId);
    if (!base) return;
    const { ctx, w, h } = base;
    const m = { l: 120, r: 12, t: 14, b: 14 };
    const cw = w - m.l - m.r;
    const ch = h - m.t - m.b;
    const n = data.length;
    const row = Math.max(16, Math.floor(ch / Math.max(1, n)) - 6);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const y = m.t + i * (row + 6);
      const v = Number(data[i]) || 0;
      const wBar = max > 0 ? Math.round((v / max) * cw) : 0;
      // label
      ctx.fillStyle = '#0f172a';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(labels[i] || '', m.l - 8, y + row * .75);
      // bar
      ctx.fillStyle = color;
      ctx.fillRect(m.l, y, wBar, row);
      // value
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left';
      ctx.fillText(String(v), m.l + wBar + 6, y + row * .75);
    }
  }

  // ── Prefill de nombres en pie del documento ──
  private setDefaultSignatures(): void {
    if (!this.elaboradoNombre) this.elaboradoNombre = 'Talento Humano';
    if (!this.revisadoNombre)  this.revisadoNombre  = 'Jefe Inmediato';
    if (!this.aprobadoNombre)  this.aprobadoNombre  = 'Gerente General';
    if (!this.elaboradoCargo)  this.elaboradoCargo  = 'Analista';
    if (!this.revisadoCargo)   this.revisadoCargo   = 'Jefe de Área';
    if (!this.aprobadoCargo)   this.aprobadoCargo   = 'Gerencia';
  }

  // ── Solicitudes helpers ──

  get filteredEmployees(): EmployeeResponse[] {
    const q = this.searchEmp.trim().toLowerCase();
    const d = this.searchDept.trim().toLowerCase();
    return this.employees.filter(e => {
      const name = ((e.nombres || '') + ' ' + (e.apellidos || '')).toLowerCase();
      const dept = ((e as any).departmentName || (e as any).department || (e as any).cargo || '').toLowerCase();
      const matchName = !q || name.includes(q) || (e.cedula || '').includes(q);
      const matchDept = !d || dept.includes(d);
      return matchName && matchDept;
    });
  }

  // Records decorated with employee info for display in schedule table
  get decoratedRecords(): Array<VacationRecord & { department: string; hireDate: string; enCurso: boolean; cedula: string; position: string; permissionDays: number; signedPdfPath?: string | null } > {
    const today = new Date();
    return this.records.map(r => {
      const emp = this.employees.find(e => e.id === r.employeeId);
      const department = emp ? ((emp as any).departmentName || (emp as any).department || (emp as any).cargo || '') : '';
      const hireDate   = emp ? ((emp as any).fechaIngreso || (emp as any).hireDate || '') : '';
      const cedula     = (r as any).cedula || (emp?.cedula || '');
      const position   = emp ? (((emp as any).positionName) || ((emp as any).position?.name) || '') : '';
      // 'EN_CURSO' según estado de negocio (no por fechas)
      const enCurso = ((r.status || '').toUpperCase() === 'EN_CURSO');
      const permissionDays = this.computeDays(r.startDate, r.endDate, (r as any).daysTaken);
      const signedPdfPath = (r as any).signedPdfPath || null;
      return { ...r, department, hireDate, enCurso, cedula, position, permissionDays, signedPdfPath };
    });
  }

  get viewRecords(): Array<VacationRecord & { department: string; hireDate: string; enCurso: boolean; cedula: string; position: string; permissionDays: number; signedPdfPath?: string | null } > {
    const q = this.qRecords.trim().toLowerCase();
    const d = this.searchDept.trim().toLowerCase();
    let list = this.decoratedRecords.filter(r => {
      const matchQ = !q || (r.employeeName || '').toLowerCase().includes(q) || ('' + (r as any).employeeId).includes(q) || (r.cedula || '').includes(q);
      const matchD = !d || (r.department || '').toLowerCase().includes(d);
      return matchQ && matchD;
    });
    if (this.activeStatus !== 'ALL') {
      if (this.activeStatus === 'EN_CURSO') list = list.filter(r => r.enCurso);
      else list = list.filter(r => (r.status || '').toUpperCase() === this.activeStatus);
    }
    return list;
  }

  get statusCountApproved(): number { return this.records.filter(r => (r.status || '').toUpperCase() === 'APROBADO').length; }
  get statusCountPending(): number  { return this.records.filter(r => (r.status || '').toUpperCase() === 'PENDIENTE').length; }
  get statusCountRejected(): number { return this.records.filter(r => (r.status || '').toUpperCase() === 'RECHAZADO').length; }
  get statusCountEnCurso(): number  { return this.decoratedRecords.filter(r => (r.status || '').toUpperCase() === 'EN_CURSO').length; }
  get currentMonthCount(): number {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return this.records.filter(r => {
      if (!r.startDate) return false;
      const sd = new Date(r.startDate);
      return sd.getMonth() === m && sd.getFullYear() === y;
    }).length;
  }

  get uniqueDepartments(): string[] {
    const seen = new Set<string>();
    const depts: string[] = [];
    this.employees.forEach(e => {
      const d = (e as any).departmentName || (e as any).department || (e as any).cargo || '';
      if (d && !seen.has(d)) { seen.add(d); depts.push(d); }
    });
    return depts;
  }

  getEmployeeVacationStatus(emp: EmployeeResponse): string {
    const rec = this.records.find(r => r.employeeId === emp.id);
    return rec?.status || 'PENDIENTE';
  }

  getStatusBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'APROBADO') return 'badge-approved';
    if (s === 'EN_CURSO') return 'badge-progress';
    if (s === 'RECHAZADO') return 'badge-rejected';
    return 'badge-pending';
  }

  getEmployeeHireDate(emp: EmployeeResponse): string {
    return (emp as any).fechaIngreso || (emp as any).hireDate || '—';
  }

  getEmployeeDept(emp: EmployeeResponse): string {
    return (emp as any).departmentName || (emp as any).department || (emp as any).cargo || '—';
  }

  getEmployeeById(id: number | undefined | null): EmployeeResponse | undefined {
    if (!id) return undefined;
    return this.employees.find(e => e.id === id);
  }

  getEmployeeDeptById(id: number | undefined | null): string {
    const emp = this.getEmployeeById(id);
    return emp ? this.getEmployeeDept(emp) : '—';
  }

  getEmployeeHireDateById(id: number | undefined | null): string {
    const emp = this.getEmployeeById(id);
    return emp ? this.getEmployeeHireDate(emp) : '—';
  }

  openNewForm(emp?: EmployeeResponse): void {
    this.selectedEmployee = emp || null;
    this.previewRecord = null;
    this.showNewForm = true;
  }

  openPreviewForm(rec: VacationRecord): void {
    const emp = this.employees.find(e => e.id === rec.employeeId) || null;
    this.selectedEmployee = emp;
    this.previewRecord = rec;
    this.showNewForm = true;
  }

  onModalClosed(): void {
    this.showNewForm = false;
    this.selectedEmployee = null;
    this.previewRecord = null;
  }

  onModalSaved(): void {
    this.showNewForm = false;
    this.selectedEmployee = null;
    this.previewRecord = null;
    this.successMsg = 'Solicitud guardada. Se abrió la vista previa del PDF en una nueva pestaña.';
    setTimeout(() => this.successMsg = null, 4000);
    this.loadRecords();
    // Actualizar la matriz anual y las gráficas automáticamente
    this.enrichPlanRowsFromRecords();
    setTimeout(() => this.renderPlanCharts(), 0);
  }

  selectEmployee(emp: EmployeeResponse): void {
    this.selectedEmployee = emp;
    this.showForm = true;
    this.form.reset({ startDate: '', endDate: '', daysAccumulated: 15, notes: '', status: 'APROBADO' });
    this.error = null;
  }

  cancelForm(): void { this.showForm = false; this.selectedEmployee = null; }

  submitForm(): void {
    if (this.form.invalid || !this.businessId || !this.selectedEmployee) return;
    this.saving = true;
    this.error = null;
    this.attendanceService.saveVacation(this.businessId, this.selectedEmployee.id, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.selectedEmployee = null;
        this.successMsg = 'Vacaciones registradas correctamente';
        setTimeout(() => this.successMsg = null, 3500);
        this.loadRecords();
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.error || 'Error al guardar. Verifique los datos e intente nuevamente.';
        console.error(err);
      }
    });
  }

  deleteRecord(id: number): void {
    if (!this.businessId || !confirm('¿Eliminar este registro de vacaciones?')) return;
    this.attendanceService.deleteVacation(this.businessId, id).subscribe({
      next: () => this.loadRecords(),
      error: err => console.error(err)
    });
  }

  // ── Utilities / actions for PDF firmado ──
  computeDays(start?: string, end?: string, fallback?: number | null): number {
    if (typeof fallback === 'number' && fallback >= 0) return fallback;
    if (!start || !end) return 0;
    const sd = new Date(start + 'T00:00:00');
    const ed = new Date(end + 'T00:00:00');
    const diff = ed.getTime() - sd.getTime();
    return diff > 0 ? Math.round(diff / (24*60*60*1000)) : 0; // sin contar el día de ingreso
  }

  onUploadVacationPdf(rec: VacationRecord, evt: Event): void {
    if (!this.businessId) return;
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;
    this.uploadingPdfId = rec.id || null;
    this.attendanceService.uploadVacationSignedPdf(this.businessId, rec.id!, file).subscribe({
      next: () => {
        // Tras subir PDF, marcar como PENDIENTE (a revisión)
        if (!this.businessId || !rec.id) { this.uploadingPdfId = null; this.loadRecords(); return; }
        this.attendanceService.updateVacationStatus(this.businessId, rec.id, 'PENDIENTE').subscribe({
          next: () => { this.uploadingPdfId = null; this.loadRecords(); },
          error: (err: any) => { this.uploadingPdfId = null; console.error(err); this.loadRecords(); }
        });
      },
      error: (err: any) => { this.uploadingPdfId = null; console.error(err); }
    });
  }

  viewVacationPdf(rec: VacationRecord): void {
    if (!this.businessId || !rec.id) return;
    this.attendanceService.getVacationPdfBlob(this.businessId, rec.id).subscribe({
      next: (blob: Blob) => {
        const file = new Blob([blob], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(file);
        const w = window.open(objectUrl, '_blank');
        // Revocar después para evitar cortar la carga
        setTimeout(() => { try { URL.revokeObjectURL(objectUrl); } catch {} }, 60000);
        if (!w) {
          // Fallback si el navegador bloquea popups
          window.location.href = objectUrl;
        }
      },
      error: (err: any) => {
        console.error('Error abriendo PDF firmado:', err);
      }
    });
  }

  approveVacation(rec: VacationRecord): void {
    if (!this.businessId || !rec.id) return;
    this.attendanceService.updateVacationStatus(this.businessId, rec.id, 'APROBADO').subscribe({
      next: () => this.loadRecords(),
      error: (err: any) => console.error(err)
    });
  }

  rejectVacation(rec: VacationRecord): void {
    if (!this.businessId || !rec.id) return;
    this.attendanceService.updateVacationStatus(this.businessId, rec.id, 'RECHAZADO').subscribe({
      next: () => this.loadRecords(),
      error: (err: any) => console.error(err)
    });
  }

  getFullName(e: EmployeeResponse): string {
    return ((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || (e as any).name || '—';
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-other';
    const s = status.toUpperCase();
    if (s === 'APROBADO') return 'status-ok';
    if (s === 'PENDIENTE') return 'status-pend';
    return 'status-other';
  }

  // ── Resumen (usa vista actual filtrada) ──
  get summaryTotalSolicitudes(): number {
    return this.viewRecords.length;
  }

  get summaryTotalDias(): number {
    return this.viewRecords.reduce((acc, r) => acc + (((r as any).permissionDays || 0) as number), 0);
  }

  get summaryEstadoAprobado(): number {
    return this.viewRecords.filter(r => (r.status || '').toUpperCase() === 'APROBADO').length;
  }
  get summaryEstadoPendiente(): number {
    return this.viewRecords.filter(r => (r.status || '').toUpperCase() === 'PENDIENTE').length;
  }
  get summaryEstadoRechazado(): number {
    return this.viewRecords.filter(r => (r.status || '').toUpperCase() === 'RECHAZADO').length;
  }
  get summaryEstadoEnCurso(): number {
    return this.viewRecords.filter(r => (r.status || '').toUpperCase() === 'EN_CURSO').length;
  }

  get summaryByDept(): Array<{ department: string; count: number; days: number }>{
    const map = new Map<string, { department: string; count: number; days: number }>();
    for (const r of this.viewRecords) {
      const dept = (r.department || this.getEmployeeDeptById(r.employeeId)) || '—';
      const key = String(dept).toUpperCase();
      if (!map.has(key)) map.set(key, { department: key, count: 0, days: 0 });
      const it = map.get(key)!;
      it.count += 1;
      it.days += (r as any).permissionDays || 0;
    }
    return Array.from(map.values()).sort((a,b) => b.count - a.count || b.days - a.days);
  }

  printVacSummary(): void {
    window.print();
  }

  // ── Filtros visibles en el resumen ──
  get filterMonthLabel(): string {
    if (!this.filterMonth) return 'Todos';
    const m = this.months.find(x => x.v === +this.filterMonth);
    return m ? m.l : String(this.filterMonth);
  }
  get filterDeptLabel(): string { return this.searchDept ? this.searchDept : 'Todos'; }
  get filterStatusLabel(): string {
    const map: any = { ALL: 'Todos', PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', RECHAZADO: 'Rechazado', EN_CURSO: 'En curso' };
    return map[this.activeStatus] || 'Todos';
  }

  // ── Porcentajes por estado sobre la vista actual ──
  private pct(n: number, d: number): string { return d > 0 ? Math.round((n / d) * 100) + '%' : '0%'; }
  get pctAprobado(): string { return this.pct(this.summaryEstadoAprobado, this.summaryTotalSolicitudes); }
  get pctPendiente(): string { return this.pct(this.summaryEstadoPendiente, this.summaryTotalSolicitudes); }
  get pctEnCurso(): string  { return this.pct(this.summaryEstadoEnCurso,  this.summaryTotalSolicitudes); }
  get pctRechazado(): string{ return this.pct(this.summaryEstadoRechazado,this.summaryTotalSolicitudes); }

  // ── Top departamentos por días ──
  get summaryTopDepts(): Array<{ department: string; count: number; days: number }>{
    return this.summaryByDept.slice(0, 5);
  }

  // ── Pie de impresión ──
  get printPreparedAt(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  goBack(): void {
    if (this.businessRuc) this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'planilla-mensual']);
  }

  private resolveLogoUrl(raw: string): string | null {
    if (!raw || !raw.trim()) return null;
    raw = raw.trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('logos/')) return `/api/files/${raw}`;
    return `/api/files/logos/${raw}`;
  }
}
