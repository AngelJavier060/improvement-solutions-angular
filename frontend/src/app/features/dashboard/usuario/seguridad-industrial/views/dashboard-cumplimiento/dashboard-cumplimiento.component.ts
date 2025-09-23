import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { BusinessService } from '../../../../../../services/business.service';
import { BusinessObligationMatrixService } from '../../../../../../services/business-obligation-matrix.service';
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
  imports: [CommonModule, NgxEchartsModule],
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

  // Estado de carga de PDFs por fila
  pdfLoadingMap: Record<number, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private bomService: BusinessObligationMatrixService,
    private employeeService: EmployeeService
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
        this.updateBarChart();
      },
      error: (err: any) => {
        console.error('[DashboardCumplimiento] Error al cargar rangos de edad:', err);
        this.ageRanges = { under18: 0, from19To30: 0, from31To50: 0, over50: 0 };
        this.updateBarChart();
      }
    });
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
        itemStyle: {
          color: '#52c41a'
        },
        progress: {
          show: true,
          width: 18
        },
        pointer: {
          show: true,
          length: '60%'
        },
        axisLine: {
          lineStyle: {
            width: 18,
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
          color: '#000',
          fontSize: 24,
          offsetCenter: [0, '40%']
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
      xAxis: {
        type: 'category',
        data: categories
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Personas',
          type: 'bar',
          data,
          itemStyle: { color: '#1890ff' }
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
