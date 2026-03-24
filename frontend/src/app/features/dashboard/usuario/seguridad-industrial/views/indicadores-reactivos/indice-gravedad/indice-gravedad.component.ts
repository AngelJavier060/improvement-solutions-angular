import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, IncidenteDetalle, SafetyIndicesMonth, SafetyIndicesSummary } from '../../../../talento-humano/services/attendance.service';

/**
 * Índice de Gravedad: (días perdidos / horas trabajadas del periodo) × 200.
 */
@Component({
  selector: 'app-si-indice-gravedad',
  templateUrl: './indice-gravedad.component.html',
  styleUrls: ['./indice-gravedad.component.scss']
})
export class IndiceGravedadComponent implements OnInit {
  /** Factor numérico alineado con filas del HTML de referencia */
  readonly factorIg = 200000;

  loading = false;
  loadError: string | null = null;
  filterYear = String(new Date().getFullYear());
  fiscalYears: string[] = [];

  diasPerdidosYtd = 0;
  horasTrabajadasYtd = 0;
  tendenciaDiasPct = 0;
  vsAnteriorPct = 0;

  get igActual(): number {
    if (!this.horasTrabajadasYtd) return 0;
    return (this.diasPerdidosYtd / this.horasTrabajadasYtd) * this.factorIg;
  }

  get etiquetaIg(): string {
    const v = this.igActual;
    if (v < 0.35) return 'Bajo';
    if (v < 0.6)  return 'Moderado';
    return 'Alto';
  }

  barrasMensuales: { label: string; h: number }[] = [];

  naturalezaLesion: {
    num: number;
    titulo: string;
    jornadas: number;
    icono: string;
    borde: 'tertiary' | 'error' | 'otv' | 'primary' | 'secondary';
  }[] = [
    { num:  1, titulo: 'Muerte',                                                      jornadas: 6_000, icono: 'person_off',       borde: 'tertiary' },
    { num:  2, titulo: 'Incapacidad permanente absoluta (I.P.A.)',                    jornadas: 6_000, icono: 'accessible_forward', borde: 'error' },
    { num:  3, titulo: 'Incapacidad permanente total (I.P.T.)',                       jornadas: 4_500, icono: 'accessible',         borde: 'error' },
    { num:  4, titulo: 'Pérdida del brazo por encima del codo',                      jornadas: 4_500, icono: 'back_hand',          borde: 'otv' },
    { num:  6, titulo: 'Pérdida de la mano',                                          jornadas: 3_000, icono: 'back_hand',          borde: 'primary' },
    { num:  7, titulo: 'Pérdida o invalidez permanente del pulgar',                   jornadas:   600, icono: 'thumb_up',           borde: 'secondary' },
    { num:  8, titulo: 'Pérdida o invalidez permanente de un dedo cualquiera',        jornadas:   300, icono: 'gesture',            borde: 'secondary' },
    { num:  9, titulo: 'Pérdida o invalidez permanente de dos dedos',                 jornadas:   750, icono: 'gesture',            borde: 'secondary' },
    { num: 10, titulo: 'Pérdida o invalidez permanente de tres dedos',                jornadas: 1_200, icono: 'gesture',            borde: 'secondary' },
    { num: 11, titulo: 'Pérdida o invalidez permanente de cuatro dedos',              jornadas: 1_800, icono: 'gesture',            borde: 'secondary' },
    { num: 12, titulo: 'Pérdida o invalidez permanente del pulgar y un dedo',         jornadas: 1_200, icono: 'gesture',            borde: 'secondary' },
    { num: 13, titulo: 'Pérdida o invalidez permanente del pulgar y dos dedos',       jornadas: 1_500, icono: 'gesture',            borde: 'secondary' },
    { num: 14, titulo: 'Pérdida o invalidez permanente del pulgar y tres dedos',      jornadas: 2_000, icono: 'gesture',            borde: 'secondary' },
    { num: 15, titulo: 'Pérdida o invalidez permanente del pulgar y cuatro dedos',    jornadas: 2_400, icono: 'gesture',            borde: 'secondary' },
    { num: 16, titulo: 'Pérdida de una pierna por encima de la rodilla',              jornadas: 4_500, icono: 'accessibility',       borde: 'otv' },
    { num: 17, titulo: 'Pérdida de una pierna por la rodilla o debajo',               jornadas: 3_000, icono: 'accessibility',       borde: 'primary' },
    { num: 18, titulo: 'Pérdida del pie',                                             jornadas: 2_400, icono: 'accessibility',       borde: 'primary' },
    { num: 19, titulo: 'Pérdida o invalidez permanente de dedo gordo o dos o más del pie', jornadas: 300, icono: 'straighten',       borde: 'secondary' },
    { num: 20, titulo: 'Pérdida de la visión de un ojo',                              jornadas: 1_800, icono: 'visibility_off',     borde: 'primary' },
    { num: 21, titulo: 'Ceguera total',                                               jornadas: 6_000, icono: 'visibility_off',     borde: 'tertiary' },
    { num: 22, titulo: 'Pérdida de un oído (uno sólo)',                               jornadas:   600, icono: 'hearing',            borde: 'secondary' },
    { num: 23, titulo: 'Sordera total',                                               jornadas: 3_000, icono: 'hearing',            borde: 'error' }
  ];

  tablaMensual: {
    mes: string;
    dias: number | null;
    horas: number | null;
    incapacidad: 'Temporal' | 'Permanente' | '—';
    indiceG: number | null;
    destacado?: boolean;
    permanente?: boolean;
    resto?: boolean;
  }[] = [];

  private businessId: number | null = null;
  private monthsData: SafetyIndicesMonth[] = [];

  /** Panel de parámetros por mes */
  showParamPanel = false;
  paramMes: SafetyIndicesMonth | null = null;

  get paramIncidentes(): IncidenteDetalle[] {
    return this.paramMes?.incidentes ?? [];
  }

  get paramTotalDias(): number {
    const sum = this.paramIncidentes.reduce((s, i) => s + (i.lostDays || 0), 0);
    return sum > 0 ? sum : (this.paramMes?.diasPerdidos || 0);
  }

  get paramIg(): number {
    if (!this.paramMes?.horasHombre) return 0;
    return Math.round((this.paramTotalDias / this.paramMes.horasHombre) * 200000 * 1000) / 1000;
  }

  openParam(mesAnio: string): void {
    this.paramMes = this.monthsData.find(m => m.mesAnio === mesAnio) ?? null;
    this.showParamPanel = true;
  }

  closeParam(): void {
    this.showParamPanel = false;
    this.paramMes = null;
  }

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
    this.horasTrabajadasYtd = data.ytd.horasHombre;

    // Normalizar días perdidos por mes tomando la suma de incidentes si está disponible
    const monthsNorm = data.months.map(m => {
      const sumInc = (m.incidentes ?? []).reduce((s, it) => s + (it.lostDays || 0), 0);
      const dp = Math.max(m.diasPerdidos || 0, sumInc);
      const igCalc = m.horasHombre > 0 ? (dp / m.horasHombre) * this.factorIg : 0;
      // Retornamos con días normalizados y un IG recalculado
      return { ...m, diasPerdidos: dp, ig: Math.round(igCalc * 1000) / 1000 } as SafetyIndicesMonth;
    });

    // YTD de días perdidos confiable (suma mensual)
    this.diasPerdidosYtd = monthsNorm.reduce((s, m) => s + (m.diasPerdidos || 0), 0);

    const maxIg = monthsNorm.reduce((mx, m) => Math.max(mx, m.ig), 0.001);
    this.barrasMensuales = monthsNorm.map(m => ({
      label: m.label,
      h:     Math.round((m.ig / maxIg) * 100)
    }));

    const maxIgMonth = monthsNorm.reduce(
      (best, m) => m.ig > best.ig ? m : best,
      monthsNorm[0] ?? { ig: 0, diasPerdidos: 0 } as any
    );

    this.monthsData = monthsNorm;

    this.tablaMensual = monthsNorm.map(m => ({
      mes:         m.mesAnio,
      dias:        m.diasPerdidos,
      horas:       m.horasHombre,
      incapacidad: 'Temporal' as const,
      indiceG:     m.ig,
      destacado:   m.ig === maxIgMonth?.ig && m.ig > 0,
      permanente:  false
    }));

    this.loading = false;
  }
}
