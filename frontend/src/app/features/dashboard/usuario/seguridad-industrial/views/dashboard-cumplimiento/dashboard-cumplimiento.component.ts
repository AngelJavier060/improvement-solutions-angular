import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { BusinessService } from '../../../../../../services/business.service';
import { BusinessObligationMatrixService } from '../../../../../../services/business-obligation-matrix.service';
import { BusinessIncidentService, BusinessIncidentDto } from '../../../../../../services/business-incident.service';
import { interval, Subscription } from 'rxjs';
import { EmployeeService } from '../../../talento-humano/services/employee.service';
import { CommonModule } from '@angular/common';

interface EmployeeStats {
  total: number;
  hombres: number;
  mujeres: number;
  discapacidad: number;
  adolescentes: number;
}

@Component({
  selector: 'app-dashboard-cumplimiento',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule, RouterLink],
  templateUrl: './dashboard-cumplimiento.component.html',
  styleUrls: ['./dashboard-cumplimiento.component.scss'],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      // Use dynamic import to ensure the correct ECharts bundle is loaded
      useValue: { echarts: () => import('echarts') }
    }
  ]
})

export class DashboardCumplimientoComponent implements OnInit, OnDestroy {
  @Input() showLegalSection: boolean = false;
  @Input() showHeader: boolean = true;
  @Input() showCompanyInfo: boolean = false;
  @Input() showEmployeeStats: boolean = false;
  @Input() showGauge: boolean = true;
  @Input() showAgeBar: boolean = true;
  ruc: string = '';
  business: any = null;
  complianceData: any[] = [];
  employeeStats: EmployeeStats = {
    total: 0,
    hombres: 0,
    mujeres: 0,
    discapacidad: 0,
    adolescentes: 0
  };
  loading = false;
  error: string | null = null;

  // Auto-refresh
  private refreshSub: Subscription | null = null;
  private readonly refreshIntervalMs = 10000; // 10s

  // Configuraciones de gráficos
  gaugeOptions: any = {};
  barOptions: any = {};
  hsseTrendOptions: any = {};

  // Resumen para velocímetro desde backend
  summaryTotal = 0;
  summaryCompleted = 0;
  summaryPercentage = 0;

  // Rangos de edad (backend)
  ageRanges = {
    under18: 0,
    from19To30: 0,
    from31To50: 0,
    over50: 0
  };
  /** Total devuelto por API o suma de tramos */
  ageRangesTotal = 0;

  /** Incidentes de seguridad (misma fuente que accidentes-incidentes) */
  safetyIncidents: BusinessIncidentDto[] = [];

  private readonly hoursPerEmployeeYear = 2000;

  // Estado de carga de PDFs por fila
  pdfLoadingMap: Record<number, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private bomService: BusinessObligationMatrixService,
    private employeeService: EmployeeService,
    private incidentService: BusinessIncidentService
  ) {}

  ngOnInit(): void {
    console.log('[DashboardCumplimiento] Inicializando componente');
    console.log('[DashboardCumplimiento] URL actual:', window.location.href);
    console.log('[DashboardCumplimiento] Parámetros de ruta disponibles:', this.route.snapshot.params);

    // Buscar el parámetro :ruc en la jerarquía de rutas
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }

    console.log('[DashboardCumplimiento] RUC obtenido de jerarquía de rutas:', this.ruc);

    if (this.ruc) {
      console.log('[DashboardCumplimiento] RUC válido, cargando datos para:', this.ruc);
      this.loadData();
    } else {
      console.error('[DashboardCumplimiento] RUC no encontrado en jerarquía de rutas');
      console.error('[DashboardCumplimiento] Jerarquía de rutas:', this.getRouteHierarchy());
      this.error = 'No se pudo obtener el RUC de la empresa. Verifique que la URL sea correcta.';
      this.loading = false;
    }
  }

  private getRouteHierarchy(): string {
    let hierarchy = [];
    let current: ActivatedRoute | null = this.route;
    while (current) {
      hierarchy.push(current.snapshot.url.join('/'));
      current = current.parent;
    }
    return hierarchy.join(' -> ');
  }

  loadData(): void {
    console.log('[DashboardCumplimiento] Iniciando carga de datos para RUC:', this.ruc);
    this.loading = true;
    this.error = null;

    // Validar que el RUC esté presente
    if (!this.ruc || this.ruc.trim() === '') {
      console.error('[DashboardCumplimiento] RUC no válido o vacío:', this.ruc);
      this.error = 'RUC no proporcionado. Verifique la URL.';
      this.loading = false;
      return;
    }

    // Cargar datos de empresa
    console.log('[DashboardCumplimiento] Consultando empresa por RUC:', this.ruc);
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (business) => {
        console.log('[DashboardCumplimiento] Empresa cargada exitosamente:', business);
        if (!business) {
          console.warn('[DashboardCumplimiento] La respuesta de empresa es null/undefined');
          this.error = 'No se encontró información de la empresa';
          this.loading = false;
          return;
        }
        this.business = business;
        console.log('[DashboardCumplimiento] ID de empresa obtenido:', business.id);
        this.loadComplianceData();
        this.loadEmployeeStats();
        this.loadEmployeeAgeRanges();
        this.loadComplianceSummary();
        this.loadSafetyIncidents();
        this.startAutoRefresh();
      },
      error: (err) => {
        console.error('[DashboardCumplimiento] Error al cargar empresa:', err);
        console.error('[DashboardCumplimiento] Detalles del error:', err.message || err);
        this.error = `Error al cargar la empresa: ${err.message || 'Error desconocido'}`;
        this.loading = false;
      }
    });
  }

  // Cargar rangos de edad desde backend (por RUC)
  loadEmployeeAgeRanges(): void {
    if (!this.ruc) return;
    console.log('[DashboardCumplimiento] Consultando rangos de edad para RUC:', this.ruc);
    this.employeeService.getEmployeeAgeRangesByBusinessRuc(this.ruc).subscribe({
      next: (ranges: any) => {
        console.log('[DashboardCumplimiento] Rangos de edad recibidos:', ranges);
        this.ageRanges = {
          under18: Number(ranges?.under18) || 0,
          from19To30: Number(ranges?.from19To30) || 0,
          from31To50: Number(ranges?.from31To50) || 0,
          over50: Number(ranges?.over50) || 0
        };
        const sum =
          this.ageRanges.under18 +
          this.ageRanges.from19To30 +
          this.ageRanges.from31To50 +
          this.ageRanges.over50;
        this.ageRangesTotal = Number(ranges?.total) > 0 ? Number(ranges?.total) : sum;
        this.updateBarChart();
      },
      error: (err: any) => {
        console.error('[DashboardCumplimiento] Error al cargar rangos de edad:', err);
        this.ageRanges = { under18: 0, from19To30: 0, from31To50: 0, over50: 0 };
        this.ageRangesTotal = 0;
        this.updateBarChart();
      }
    });
  }

  loadSafetyIncidents(): void {
    if (!this.ruc) return;
    this.incidentService.getSafetyByRuc(this.ruc).subscribe({
      next: (list) => {
        this.safetyIncidents = Array.isArray(list) ? list : [];
        this.updateHsseTrendChart();
      },
      error: (err) => {
        console.error('[DashboardCumplimiento] Error al cargar incidentes de seguridad:', err);
        this.safetyIncidents = [];
        this.updateHsseTrendChart();
      }
    });
  }

  private incidentTimeMs(inc: BusinessIncidentDto): number {
    const raw = inc.incidentDate || inc.createdAt;
    if (!raw) return NaN;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : NaN;
  }

  private isHighRiskIncident(inc: BusinessIncidentDto): boolean {
    return !!(inc.isHighPotential || inc.isFatal || inc.involvesAmputation);
  }

  /** Requisitos pendientes (matriz legal) */
  get summaryPending(): number {
    return Math.max(0, (this.summaryTotal || 0) - (this.summaryCompleted || 0));
  }

  get incidents30dCount(): number {
    const now = Date.now();
    const from = now - 30 * 86400000;
    return this.safetyIncidents.filter((i) => {
      const t = this.incidentTimeMs(i);
      return Number.isFinite(t) && t >= from && t <= now;
    }).length;
  }

  get incidents12mCount(): number {
    const now = Date.now();
    const from = now - 365 * 86400000;
    return this.safetyIncidents.filter((i) => {
      const t = this.incidentTimeMs(i);
      return Number.isFinite(t) && t >= from && t <= now;
    }).length;
  }

  get highRisk12mCount(): number {
    const now = Date.now();
    const from = now - 365 * 86400000;
    return this.safetyIncidents.filter((i) => {
      const t = this.incidentTimeMs(i);
      return Number.isFinite(t) && t >= from && t <= now && this.isHighRiskIncident(i);
    }).length;
  }

  /** Días desde el último incidente con fecha conocida (mínimo 0). */
  get daysWithoutIncident(): number {
    let latest = 0;
    for (const i of this.safetyIncidents) {
      const t = this.incidentTimeMs(i);
      if (Number.isFinite(t) && t > latest) latest = t;
    }
    if (!latest) return 0;
    const diff = Date.now() - latest;
    return Math.max(0, Math.floor(diff / 86400000));
  }

  /**
   * IF aproximado estilo OSHA: (casos con pérdida de tiempo no disponible → usamos todos los incidentes 12m)
   * sobre horas-hombre anuales estimadas (empleados × 2000 h).
   */
  get ifOshaApprox(): number {
    const emp = Math.max(0, this.employeeStats.total || 0);
    const hours = Math.max(1, emp * this.hoursPerEmployeeYear);
    return (this.incidents12mCount * 200000) / hours;
  }

  /** TRIF aproximado (1.000.000 / horas-hombre anual estimada). */
  get trifApprox(): number {
    const emp = Math.max(0, this.employeeStats.total || 0);
    const hours = Math.max(1, emp * this.hoursPerEmployeeYear);
    return (this.incidents12mCount * 1000000) / hours;
  }

  /**
   * Índice de gravedad operativo (proxy): pondera incidentes críticos y volumen anual.
   * El cálculo normado de IG está en Indicadores reactivos.
   */
  get igSeverityIndex(): number {
    return Math.min(
      999,
      Math.round(this.highRisk12mCount * 22 + this.incidents12mCount * 1.5)
    );
  }

  /** Ratio cumplidos / pendientes (tasa de riesgo normativo); null si no hay pendientes. */
  get trComplianceRatio(): number | null {
    const p = this.summaryPending;
    if (p <= 0) return null;
    return this.summaryCompleted / p;
  }

  /** % de requisitos pendientes sobre el total (riesgo normativo). */
  get legalPendingPct(): number {
    const t = this.summaryTotal || 0;
    if (t <= 0) return 0;
    return (this.summaryPending / t) * 100;
  }

  /** Puntos de edad por tramo (para barra visual). */
  agePercent(idx: 0 | 1 | 2 | 3): number {
    const t = this.ageRangesTotal || 0;
    if (t <= 0) return 0;
    const vals = [
      this.ageRanges.under18,
      this.ageRanges.from19To30,
      this.ageRanges.from31To50,
      this.ageRanges.over50
    ];
    return (vals[idx] / t) * 100;
  }

  /** Promedio de edad estimado por punto medio de cada tramo. */
  get estimatedAverageAge(): number {
    const t = this.ageRangesTotal || 0;
    if (t <= 0) return 0;
    const w =
      this.ageRanges.under18 * 16.5 +
      this.ageRanges.from19To30 * 24.5 +
      this.ageRanges.from31To50 * 40.5 +
      this.ageRanges.over50 * 58;
    return Math.round((w / t) * 10) / 10;
  }

  /** Circunferencia del anillo (r=70) para SVG. */
  get complianceRingLen(): number {
    return 2 * Math.PI * 70;
  }

  get complianceRingOffset(): number {
    const p = Math.min(100, Math.max(0, Number(this.summaryPercentage) || 0));
    return this.complianceRingLen * (1 - p / 100);
  }

  get complianceRingLabel(): string {
    const p = Math.min(100, Math.max(0, Number(this.summaryPercentage) || 0));
    if (p >= 70) return 'Zona segura';
    if (p >= 40) return 'Atención';
    return 'Crítico';
  }

  get nextDueComplianceHint(): string {
    const items = this.complianceData || [];
    let best: number | null = null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (const it of items) {
      const raw = it?.dueDate;
      if (!raw) continue;
      const d = new Date(raw).getTime();
      if (!Number.isFinite(d)) continue;
      if (d < start.getTime()) continue;
      if (best === null || d < best) best = d;
    }
    if (best === null) {
      return 'No hay fechas de vencimiento futuras registradas en la matriz.';
    }
    return `Próximo vencimiento relevante: ${new Date(best).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}.`;
  }

  updateHsseTrendChart(): void {
    const labels: string[] = [];
    const totals: number[] = [];
    const highs: number[] = [];
    const now = new Date();
    for (let k = 11; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      labels.push(
        d
          .toLocaleDateString('es-EC', { month: 'short' })
          .replace('.', '')
          .toUpperCase()
          .slice(0, 3)
      );
      let c = 0;
      let h = 0;
      for (const inc of this.safetyIncidents) {
        const t = this.incidentTimeMs(inc);
        if (!Number.isFinite(t)) continue;
        const dt = new Date(t);
        if (dt.getFullYear() === y && dt.getMonth() === m) {
          c++;
          if (this.isHighRiskIncident(inc)) h++;
        }
      }
      totals.push(c);
      highs.push(h);
    }

    this.hsseTrendOptions = {
      color: ['#002b7d', '#6c0008'],
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['Incidentes', 'Alta criticidad'],
        bottom: 0,
        textStyle: { fontSize: 11, color: '#444652' }
      },
      grid: { left: '3%', right: '3%', bottom: '18%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLabel: { fontSize: 10, color: '#444652' }
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(116,118,131,0.15)' } },
        axisLabel: { fontSize: 10, color: '#444652' }
      },
      series: [
        {
          name: 'Incidentes',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: totals,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.06, color: '#002b7d' }
        },
        {
          name: 'Alta criticidad',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: highs,
          lineStyle: { width: 2 }
        }
      ]
    };
  }

  private startAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = null;
    }
    // Solo refrescar si ya existe empresa resuelta
    if (this.business?.id) {
      this.refreshSub = interval(this.refreshIntervalMs).subscribe(() => {
        this.loadComplianceData();
        this.loadEmployeeAgeRanges();
        this.loadComplianceSummary();
        this.loadSafetyIncidents();
      });
    }
  }

  loadComplianceData(): void {
    if (!this.business?.id) {
      console.warn('[DashboardCumplimiento] No hay ID de empresa para cargar datos de cumplimiento');
      console.warn('[DashboardCumplimiento] Business object:', this.business);
      this.complianceData = [];
      this.updateCharts();
      this.loading = false;
      return;
    }

    console.log('[DashboardCumplimiento] Consultando datos de cumplimiento para empresa ID:', this.business.id);
    console.log('[DashboardCumplimiento] Tipo de ID:', typeof this.business.id);
    this.bomService.getByBusiness(this.business.id).subscribe({
      next: (data) => {
        console.log('[DashboardCumplimiento] Datos de cumplimiento recibidos:', data);
        console.log('[DashboardCumplimiento] Tipo de respuesta:', typeof data, Array.isArray(data) ? 'array' : 'no-array');
        this.complianceData = Array.isArray(data) ? data : [];
        console.log('[DashboardCumplimiento] Datos de cumplimiento procesados, cantidad:', this.complianceData.length);
        if (this.complianceData.length > 0) {
          console.log('[DashboardCumplimiento] Primer elemento de ejemplo:', this.complianceData[0]);
        }
        this.updateCharts();
        this.loading = false;
      },
      error: (err) => {
        console.error('[DashboardCumplimiento] Error al cargar datos de cumplimiento:', err);
        console.error('[DashboardCumplimiento] Detalles del error:', err.message || err);
        this.complianceData = [];
        this.updateCharts();
        this.loading = false;
        // Mostrar error si no hay datos previos
        if (this.complianceData.length === 0) {
          this.error = 'No se pudieron cargar los datos de cumplimiento';
        }
      }
    });
  }

  loadEmployeeStats(): void {
    console.log('[DashboardCumplimiento] Consultando estadísticas de empleados para RUC:', this.ruc);
    this.employeeService.getEmployeeStatsByBusinessRuc(this.ruc).subscribe({
      next: (stats) => {
        console.log('[DashboardCumplimiento] Estadísticas de empleados recibidas desde backend:', stats);
        this.employeeStats = stats;
        console.log('[DashboardCumplimiento] Estadísticas asignadas:', this.employeeStats);
      },
      error: (err) => {
        console.error('[DashboardCumplimiento] Error al cargar estadísticas de empleados:', err);
        console.error('[DashboardCumplimiento] Detalles del error:', err.message || err);
        // Usar valores por defecto si falla la carga
        this.employeeStats = {
          total: 0,
          hombres: 0,
          mujeres: 0,
          discapacidad: 0,
          adolescentes: 0
        };
        console.log('[DashboardCumplimiento] Usando estadísticas por defecto:', this.employeeStats);
      }
    });
  }


  updateCharts(): void {
    console.log('[DashboardCumplimiento] Actualizando gráficas con', this.complianceData.length, 'elementos');
    this.updateGaugeChart();
    this.updateBarChart();
  }

  updateGaugeChart(): void {
    // Usar porcentaje calculado en el backend, con 1 decimal
    const raw = Number(this.summaryPercentage) || 0;
    const percentage = Math.max(0, Math.min(100, Math.round(raw * 10) / 10));

    this.gaugeOptions = {
      series: [{
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        radius: '100%',
        center: ['50%', '70%'],
        itemStyle: {
          color: '#52c41a'
        },
        progress: {
          show: true,
          width: 28
        },
        pointer: {
          show: true,
          length: '72%',
          width: 8
        },
        axisLine: {
          lineStyle: {
            width: 28,
            color: [
              [0.3, '#ff4d4f'],
              [0.7, '#faad14'],
              [1, '#52c41a']
            ]
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        detail: {
          valueAnimation: true,
          formatter: (val: number) => `${(Math.round((val ?? 0) * 10) / 10).toFixed(1)}%`,
          color: '#1a1b21',
          fontSize: 44,
          fontWeight: 800,
          fontFamily: 'Manrope, Inter, system-ui, sans-serif',
          offsetCenter: [0, '52%']
        },
        data: [{
          value: percentage
        }]
      }]
    };
  }

  updateBarChart(): void {
    const categories = ['< 18', '19-30', '31-50', '> 50'];
    const data = [
      this.ageRanges.under18,
      this.ageRanges.from19To30,
      this.ageRanges.from31To50,
      this.ageRanges.over50
    ];

    this.barOptions = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: '#444652', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(116,118,131,0.15)' } },
        axisLabel: { color: '#444652', fontSize: 11 }
      },
      series: [
        {
          name: 'Personas',
          type: 'bar',
          data,
          barMaxWidth: 36,
          itemStyle: {
            color: '#1a429f',
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };
  }

  // Cargar resumen de cumplimiento desde backend (para velocímetro)
  loadComplianceSummary(): void {
    if (!this.business?.id) return;
    this.bomService.getComplianceSummaryByBusiness(this.business.id).subscribe({
      next: (summary: { total: number; completed: number; percentage: number }) => {
        this.summaryTotal = summary?.total ?? 0;
        this.summaryCompleted = summary?.completed ?? 0;
        this.summaryPercentage = summary?.percentage ?? 0;
        this.updateGaugeChart();
      },
      error: (err) => {
        console.error('[DashboardCumplimiento] Error al cargar resumen de cumplimiento:', err);
        this.summaryTotal = 0;
        this.summaryCompleted = 0;
        this.summaryPercentage = 0;
        this.updateGaugeChart();
      }
    });
  }

  // === PDF preview helpers ===
  private sortFiles(files: any[]): any[] {
    const arr = Array.isArray(files) ? [...files] : [];
    try {
      arr.sort((a: any, b: any) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        const aId = Number(a?.id) || 0;
        const bId = Number(b?.id) || 0;
        return aId - bId;
      });
    } catch {}
    return arr;
  }

  private openBlobInNewTab(blob: Blob, filename?: string): void {
    try {
      const typed = new Blob([blob], { type: blob.type || 'application/pdf' });
      const url = window.URL.createObjectURL(typed);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'documento.pdf';
        a.click();
      }
    } catch (e) {
      console.error('No se pudo abrir el PDF:', e);
    }
  }

  previewLatestPdf(item: any): void {
    const id = Number(item?.id);
    if (!id) return;
    this.pdfLoadingMap[id] = true;
    this.bomService.listFiles(id, { currentOnly: true }).subscribe({
      next: (files: any[]) => {
        const sorted = this.sortFiles(files);
        const pdfs = sorted.filter((f: any) => {
          const name = (f?.name ?? f?.path ?? '').toString().toLowerCase();
          return name.endsWith('.pdf');
        });
        if (pdfs.length === 0) {
          this.pdfLoadingMap[id] = false;
          alert('No hay PDF vigente para esta obligación.');
          return;
        }
        const pick = pdfs[pdfs.length - 1];
        const fileId = Number(pick?.id);
        if (!fileId) {
          this.pdfLoadingMap[id] = false;
          alert('Archivo inválido.');
          return;
        }
        this.bomService.downloadFile(fileId).subscribe({
          next: (blob: Blob) => {
            this.pdfLoadingMap[id] = false;
            this.openBlobInNewTab(blob, pick?.name || 'documento.pdf');
          },
          error: (err) => {
            console.error('Error al descargar PDF:', err);
            this.pdfLoadingMap[id] = false;
            alert('No se pudo abrir el PDF.');
          }
        });
      },
      error: (err) => {
        console.error('Error al listar archivos:', err);
        this.pdfLoadingMap[id] = false;
        alert('No se pudo obtener los archivos de esta obligación.');
      }
    });
  }

  // Métodos para badges
  getDaysBadgeClass(days: number): string {
    if (isNaN(days)) return 'bg-secondary-subtle text-secondary';
    if (days >= 30) return 'bg-success-subtle text-success';
    if (days >= 15) return 'bg-warning-subtle text-warning';
    if (days <= 5) return 'bg-danger-subtle text-danger';
    return 'bg-warning-subtle text-warning';
  }

  getDaysLabel(days: number): string {
    if (isNaN(days)) return '—';
    if (days > 0) return `${days} día${days === 1 ? '' : 's'}`;
    if (days === 0) return 'Hoy';
    const overdue = Math.abs(days);
    return `Hace ${overdue} día${overdue === 1 ? '' : 's'}`;
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CUMPLIDA':
      case 'CUMPLIDO':
        return 'fa-check-circle';
      case 'VENCIDA':
        return 'fa-exclamation-triangle';
      case 'EN PROCESO':
        return 'fa-clock';
      case 'PENDIENTE':
      default:
        return 'fa-pause-circle';
    }
  }

  // Nuevo: derivar estado mostrado en la tabla
  getDisplayStatus(item: any): string {
    try {
      const raw = (item?.status ?? '').toString().trim().toUpperCase();
      const completedFlag = !!item?.completed;
      const days = this.calculateDaysRemaining(item);

      // 1) Cumplido si texto lo indica o flag completed = true
      if (completedFlag || raw.includes('CUMPLID')) return 'CUMPLIDO';

      // 2) Vencida si la fecha ya pasó
      if (!isNaN(days) && days < 0) return 'VENCIDA';

      // 3) En proceso si está próximo a vencer (<= 5 días)
      if (!isNaN(days) && days <= 5) return 'EN PROCESO';

      // 4) Pendiente por defecto
      return 'PENDIENTE';
    } catch {
      return 'PENDIENTE';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'ALTA':
        return 'fa-exclamation-triangle';
      case 'MEDIA':
        return 'fa-minus';
      case 'BAJA':
        return 'fa-arrow-down';
      default:
        return 'fa-question';
    }
  }

  calculateDaysRemaining(item: any): number {
    try {
      const dueRaw = item?.dueDate;
      if (!dueRaw) return NaN;
      const due = new Date(dueRaw);
      const today = new Date();
      due.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffMs = due.getTime() - today.getTime();
      return Math.floor(diffMs / 86400000);
    } catch {
      return NaN;
    }
  }

  goToWelcome() {
    // Redirige a la página de bienvenida de la empresa actual
    if (this.ruc) {
      this.router.navigate([`/usuario/${this.ruc}/welcome`]);
    } else {
      this.router.navigate(['/usuario']);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = null;
    }
  }
}
