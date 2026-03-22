import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, ConsolidadoHhttSummary } from '../../../../talento-humano/services/attendance.service';

export interface MesTrendHh {
  label: string;
  ordin: number;
  extra: number;
}

export interface AreaDistribucion {
  nombre: string;
  pct: number;
  barClass: 'primary' | 'primary-container' | 'secondary' | 'outline';
}

export interface RegistroDetalladoHh {
  mesAnio: string;
  departamento: string;
  horasOrdinarias: number;
  horasExtras: number;
  totalHh: number;
  numColaboradores: number;
}

const BAR_CYCLE: AreaDistribucion['barClass'][] = [
  'primary',
  'primary-container',
  'secondary',
  'outline'
];

@Component({
  selector: 'app-si-consolidado-hhtt',
  templateUrl: './consolidado-hhtt.component.html',
  styleUrls: ['./../si-indicadores-theme.scss', './consolidado-hhtt.component.scss']
})
export class ConsolidadoHhttComponent implements OnInit {
  ruc: string | null = null;
  businessId: number | null = null;
  loading = false;
  loadError: string | null = null;

  filterYear = String(new Date().getFullYear());
  filterDepartment = 'all';
  filterProject = 'all';

  fiscalYears: string[] = [];

  departmentOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los departamentos' }
  ];
  projectOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los proyectos activos' }
  ];

  kpiTotalYtd = 0;
  kpiTotalPrev = 0;
  kpiTrendPct = 0;
  kpiPromedioMensual = 0;
  kpiHorasExtras = 0;
  kpiExtrasDelTotalPct = 0;
  kpiExtrasTrendPct = 0;
  kpiColaboradores = 0;

  mesesTrend: MesTrendHh[] = [];
  areasHhtt: AreaDistribucion[] = [];
  registrosDetalle: RegistroDetalladoHh[] = [];

  /** Horas/día usadas en el cálculo (viene del backend) */
  standardHoursPerDay = 8;

  pageSize = 5;
  currentPage = 0;

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    const y = new Date().getFullYear();
    this.fiscalYears = [y, y - 1, y - 2, y - 3].map(String);
    this.filterYear = String(y);

    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }

    if (!this.ruc) {
      this.loadError = 'No se encontró el RUC en la ruta.';
      return;
    }

    this.loading = true;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) {
          this.loadError = 'No se encontró la empresa por el RUC proporcionado.';
          this.loading = false;
          return;
        }
        this.businessId = Number(id);
        this.fetchConsolidado();
      },
      error: () => {
        this.loadError = 'No se pudo obtener la información de la empresa.';
        this.loading = false;
      }
    });
  }

  onYearChange(): void {
    if (this.businessId) {
      this.fetchConsolidado();
    }
  }

  private fetchConsolidado(): void {
    if (!this.businessId) return;
    const year = Number(this.filterYear);
    if (!Number.isFinite(year)) return;

    this.loading = true;
    this.loadError = null;
    this.currentPage = 0;

    // standardHoursPerDay se omite (o se pasa 0); el backend usa las horas de la jornada de cada empleado
    this.attendanceService.getConsolidadoHhtt(this.businessId, year).subscribe({
      next: (data) => this.applySummary(data),
      error: (err) => {
        console.error('[Consolidado HHTT]', err);
        this.loadError =
          err?.error?.message ?? err?.message ?? 'No se pudo cargar el consolidado de horas hombre.';
        this.mesesTrend = [];
        this.areasHhtt = [];
        this.registrosDetalle = [];
        this.loading = false;
      }
    });
  }

  private applySummary(data: ConsolidadoHhttSummary): void {
    this.standardHoursPerDay = data.standardHoursPerDay ?? 8;

    this.kpiTotalYtd = data.totalHoursYtd ?? 0;
    this.kpiTotalPrev = data.previousYearTotalHours ?? 0;
    this.kpiTrendPct = Math.round((data.ytdVsPreviousYearPct ?? 0) * 10) / 10;
    this.kpiPromedioMensual = data.averageMonthlyHours ?? 0;
    this.kpiHorasExtras = data.extraHoursYtd ?? 0;
    this.kpiExtrasDelTotalPct = Math.round((data.extraHoursSharePct ?? 0) * 10) / 10;
    this.kpiColaboradores = data.activeEmployees ?? 0;

    const prevTot = data.previousYearTotalHours ?? 0;
    const prevExtra = data.previousYearExtraHours ?? 0;
    const prevShare = prevTot > 0 ? (prevExtra / prevTot) * 100 : 0;
    const curShare = data.extraHoursSharePct ?? 0;
    this.kpiExtrasTrendPct = Math.round((curShare - prevShare) * 10) / 10;

    this.mesesTrend = (data.monthsTrend ?? []).map((m) => ({
      label: m.label,
      ordin: m.ordinHours ?? 0,
      extra: m.extraHours ?? 0
    }));

    this.areasHhtt = (data.byDepartment ?? []).map((d, i) => ({
      nombre: d.nombre,
      pct: Math.round((d.pct ?? 0) * 10) / 10,
      barClass: BAR_CYCLE[i % BAR_CYCLE.length]
    }));

    const raw = [...(data.detailRows ?? [])];
    raw.sort((a, b) => {
      const sa = a.mesSort ?? 0;
      const sb = b.mesSort ?? 0;
      if (sb !== sa) return sb - sa;
      return (a.departamento ?? '').localeCompare(b.departamento ?? '', 'es');
    });
    this.registrosDetalle = raw.map((r) => ({
      mesAnio: r.mesAnio,
      departamento: r.departamento,
      horasOrdinarias: r.horasOrdinarias,
      horasExtras: r.horasExtras,
      totalHh: r.totalHh,
      numColaboradores: r.numColaboradores
    }));

    this.departmentOptions =
      data.departmentOptions?.length > 0
        ? data.departmentOptions
        : [{ value: 'all', label: 'Todos los departamentos' }];
    this.projectOptions =
      data.projectOptions?.length > 0
        ? data.projectOptions
        : [{ value: 'all', label: 'Todos los proyectos activos' }];

    if (!this.departmentOptions.some((o) => o.value === this.filterDepartment)) {
      this.filterDepartment = 'all';
    }
    if (!this.projectOptions.some((o) => o.value === this.filterProject)) {
      this.filterProject = 'all';
    }

    this.loading = false;
  }

  private get maxMesTotal(): number {
    return Math.max(...this.mesesTrend.map((m) => m.ordin + m.extra), 1);
  }

  heightPct(m: MesTrendHh): number {
    const t = m.ordin + m.extra;
    return Math.max(12, Math.round((t / this.maxMesTotal) * 100));
  }

  /** Tabla filtrada por departamento (proyecto sin dato en backend: sin efecto) */
  get registrosFiltrados(): RegistroDetalladoHh[] {
    if (this.filterDepartment === 'all' || !this.filterDepartment.startsWith('dept:')) {
      return this.registrosDetalle;
    }
    const name = this.filterDepartment.slice('dept:'.length);
    return this.registrosDetalle.filter((r) => r.departamento === name);
  }

  get paginatedRegistros(): RegistroDetalladoHh[] {
    const src = this.registrosFiltrados;
    const start = this.currentPage * this.pageSize;
    return src.slice(start, start + this.pageSize);
  }

  get totalRegistros(): number {
    return this.registrosFiltrados.length;
  }

  get firstIdx(): number {
    if (this.totalRegistros === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  get lastIdx(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalRegistros);
  }

  get canPrev(): boolean {
    return this.currentPage > 0;
  }

  get canNext(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.registrosFiltrados.length;
  }

  prevPage(): void {
    if (this.canPrev) this.currentPage--;
  }

  nextPage(): void {
    if (this.canNext) this.currentPage++;
  }

  clearFilters(): void {
    const y = new Date().getFullYear();
    this.filterYear = String(y);
    this.filterDepartment = 'all';
    this.filterProject = 'all';
    this.currentPage = 0;
    this.fetchConsolidado();
  }

  generarReporte(): void {
    console.log('[Consolidado HHTT] Generar reporte', {
      year: this.filterYear,
      dept: this.filterDepartment,
      project: this.filterProject,
      businessId: this.businessId
    });
  }

  verRegistro(_row: RegistroDetalladoHh): void {
    console.log('[Consolidado HHTT] Ver detalle', _row);
  }
}
