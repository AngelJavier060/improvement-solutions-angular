import { Component } from '@angular/core';

/**
 * IF (OSHA): (# lesiones / # horas hombre trabajadas) × 200.000
 * Equivale a 100 trabajadores × 40 h/semana × 50 semanas.
 */
@Component({
  selector: 'app-si-indice-frecuencia',
  templateUrl: './indice-frecuencia.component.html',
  styleUrls: ['./indice-frecuencia.component.scss']
})
export class IndiceFrecuenciaComponent {
  /** Factor estándar OSHA (no 1.000.000) */
  readonly factorOsha = 200_000;

  /** Demo YTD — sustituir por API */
  totalLesionesYtd = 0;
  totalHorasYtd = 1_200_000;
  totalHorasYtdLabel = '1,2M';

  metaIf = 0.25;

  /** IF consolidado YTD con factor 200k */
  get ifActual(): number {
    if (!this.totalHorasYtd) {
      return 0;
    }
    return (this.totalLesionesYtd / this.totalHorasYtd) * this.factorOsha;
  }

  /** Ancho barra meta vs actual (para KPI), cap 100 */
  get ifVsMetaBarPct(): number {
    if (this.metaIf <= 0) {
      return 0;
    }
    return Math.min(100, (this.ifActual / this.metaIf) * 100);
  }

  /** Franja mínima visible cuando IF = 0 (como el mock 2%) */
  get ifVsMetaBarDisplayPct(): number {
    if (this.ifActual <= 0) {
      return 2;
    }
    return this.ifVsMetaBarPct;
  }

  barHeightPx(ifReal: number): number {
    if (ifReal <= 0) {
      return 4;
    }
    return Math.max(8, Math.min(200, ifReal * 400));
  }

  mesesGrafico = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic'
  ].map((label) => ({ label, ifReal: 0 }));

  private readonly tablaEmpresaRaw = [
    { mes: 'Enero', lesiones: 0, horas: 105_400 },
    { mes: 'Febrero', lesiones: 0, horas: 98_200 },
    { mes: 'Marzo', lesiones: 0, horas: 112_000 }
  ];

  get tablaEmpresa(): { mes: string; lesiones: number; horas: number; if: number }[] {
    return this.tablaEmpresaRaw.map((r) => ({
      ...r,
      if: r.horas ? (r.lesiones / r.horas) * this.factorOsha : 0
    }));
  }

  get tablaEmpresaTotales(): { lesiones: number; horas: number; if: number } {
    const lesiones = this.tablaEmpresaRaw.reduce((a, r) => a + r.lesiones, 0);
    const horas = this.tablaEmpresaRaw.reduce((a, r) => a + r.horas, 0);
    const ifVal = horas ? (lesiones / horas) * this.factorOsha : 0;
    return { lesiones, horas, if: ifVal };
  }

  /** Contratistas: sin datos de demo */
  tablaContratistas: { mes: string; lesiones: number; horas: number; if: number }[] = [];
}
