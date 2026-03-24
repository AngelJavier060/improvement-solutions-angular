import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, SafetyIndicesSummary } from '../../../../talento-humano/services/attendance.service';

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
  readonly factorIg = 200;

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
    titulo: string;
    sub: string;
    jornadas: number;
    icono: string;
    borde: 'tertiary' | 'error' | 'on-tertiary-fixed-variant' | 'primary' | 'secondary';
  }[] = [
    { titulo: 'Muerte',           sub: 'Pérdida de vida',  jornadas: 6_000, icono: 'person_off',    borde: 'tertiary' },
    { titulo: 'Incapacidad total', sub: 'Permanente',       jornadas: 6_000, icono: 'accessible',    borde: 'error' },
    { titulo: 'Pérdida de un brazo', sub: 'Cualquier punto', jornadas: 4_500, icono: 'healing',      borde: 'on-tertiary-fixed-variant' },
    { titulo: 'Pérdida de un ojo',   sub: 'Visión completa', jornadas: 1_800, icono: 'visibility_off', borde: 'primary' },
    { titulo: 'Pérdida de un dedo',  sub: 'Cualquier dedo',  jornadas: 300,   icono: 'back_hand',    borde: 'secondary' }
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
    this.diasPerdidosYtd    = data.ytd.diasPerdidos;
    this.horasTrabajadasYtd = data.ytd.horasHombre;

    const maxIg = data.months.reduce((mx, m) => Math.max(mx, m.ig), 0.001);
    this.barrasMensuales = data.months.map(m => ({
      label: m.label,
      h:     Math.round((m.ig / maxIg) * 100)
    }));

    const maxIgMonth = data.months.reduce(
      (best, m) => m.ig > best.ig ? m : best,
      data.months[0] ?? { ig: 0, diasPerdidos: 0 } as any
    );

    this.tablaMensual = data.months.map(m => ({
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
