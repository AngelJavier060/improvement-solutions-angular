import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, SafetyIndicesSummary } from '../../../../talento-humano/services/attendance.service';

/**
 * IF (OSHA): (# lesiones / # horas hombre trabajadas) × 200.000
 * Equivale a 100 trabajadores × 40 h/semana × 50 semanas.
 */
@Component({
  selector: 'app-si-indice-frecuencia',
  templateUrl: './indice-frecuencia.component.html',
  styleUrls: ['./indice-frecuencia.component.scss']
})
export class IndiceFrecuenciaComponent implements OnInit {
  /** Factor estándar OSHA (no 1.000.000) */
  readonly factorOsha = 200_000;

  loading = false;
  loadError: string | null = null;
  filterYear = String(new Date().getFullYear());
  fiscalYears: string[] = [];

  totalLesionesYtd = 0;
  totalHorasYtd = 0;

  get totalHorasYtdLabel(): string {
    const h = this.totalHorasYtd;
    if (h >= 1_000_000) return (h / 1_000_000).toFixed(1) + 'M';
    if (h >= 1_000) return (h / 1_000).toFixed(1) + 'K';
    return String(h);
  }

  metaIf = 0.25;

  /** IF consolidado YTD con factor 200k */
  get ifActual(): number {
    if (!this.totalHorasYtd) return 0;
    return (this.totalLesionesYtd / this.totalHorasYtd) * this.factorOsha;
  }

  /** Ancho barra meta vs actual (para KPI), cap 100 */
  get ifVsMetaBarPct(): number {
    if (this.metaIf <= 0) return 0;
    return Math.min(100, (this.ifActual / this.metaIf) * 100);
  }

  /** Franja mínima visible cuando IF = 0 (como el mock 2%) */
  get ifVsMetaBarDisplayPct(): number {
    if (this.ifActual <= 0) return 2;
    return this.ifVsMetaBarPct;
  }

  barHeightPx(ifReal: number): number {
    if (ifReal <= 0) return 4;
    return Math.max(8, Math.min(200, ifReal * 400));
  }

  mesesGrafico: { label: string; ifReal: number }[] = [];

  private tablaEmpresaRaw: { mes: string; lesiones: number; horas: number }[] = [];

  get tablaEmpresa(): { mes: string; lesiones: number; horas: number; if: number }[] {
    return this.tablaEmpresaRaw.map((r) => ({
      ...r,
      if: r.horas ? (r.lesiones / r.horas) * this.factorOsha : 0
    }));
  }

  get tablaEmpresaTotales(): { lesiones: number; horas: number; if: number } {
    const lesiones = this.tablaEmpresaRaw.reduce((a, r) => a + r.lesiones, 0);
    const horas = this.tablaEmpresaRaw.reduce((a, r) => a + r.horas, 0);
    return { lesiones, horas, if: horas ? (lesiones / horas) * this.factorOsha : 0 };
  }

  tablaContratistas: { mes: string; lesiones: number; horas: number; if: number }[] = [];

  private businessId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    const y = new Date().getFullYear();
    this.fiscalYears = [y, y - 1, y - 2].map(String);
    this.filterYear = String(y);

    let parent: ActivatedRoute | null = this.route;
    let ruc: string | null = null;
    while (parent) {
      ruc = parent.snapshot.paramMap.get('ruc');
      if (ruc) break;
      parent = parent.parent;
    }
    if (!ruc) { this.loadError = 'No se encontró el RUC en la ruta.'; return; }

    this.loading = true;
    this.businessService.getByRuc(ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) { this.loadError = 'Empresa no encontrada.'; this.loading = false; return; }
        this.businessId = Number(id);
        this.fetchIndices();
      },
      error: () => { this.loadError = 'No se pudo obtener la empresa.'; this.loading = false; }
    });
  }

  onYearChange(): void {
    if (this.businessId) this.fetchIndices();
  }

  private fetchIndices(): void {
    if (!this.businessId) return;
    this.loading = true;
    this.loadError = null;
    this.attendanceService.getSafetyIndices(this.businessId, Number(this.filterYear)).subscribe({
      next: (data: SafetyIndicesSummary) => this.applyData(data),
      error: () => { this.loadError = 'Error al cargar los índices.'; this.loading = false; }
    });
  }

  private applyData(data: SafetyIndicesSummary): void {
    this.totalLesionesYtd = data.ytd.lesiones;
    this.totalHorasYtd    = data.ytd.horasHombre;

    const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const byMonth = new Map(data.months.map(m => [m.month, m]));
    this.mesesGrafico = labels.map((label, i) => {
      const m = byMonth.get(i + 1);
      return { label, ifReal: m ? m.if : 0 };
    });

    this.tablaEmpresaRaw = data.months.map(m => ({
      mes: m.mesAnio,
      lesiones: m.lesiones,
      horas: m.horasHombre
    }));

    this.loading = false;
  }
}
