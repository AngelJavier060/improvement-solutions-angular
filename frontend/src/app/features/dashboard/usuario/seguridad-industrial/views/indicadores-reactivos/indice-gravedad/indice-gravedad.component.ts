import { Component } from '@angular/core';

/**
 * Índice G del mock: (días perdidos / horas trabajadas del periodo) × factor.
 * Los valores de tabla (0,353; 0,455; …) coinciden con factor 200, no 200.000.
 * La UI muestra "200.000" como en el diseño y aclara la escala en nota.
 */
@Component({
  selector: 'app-si-indice-gravedad',
  templateUrl: './indice-gravedad.component.html',
  styleUrls: ['./indice-gravedad.component.scss']
})
export class IndiceGravedadComponent {
  /** Factor numérico alineado con filas del HTML de referencia */
  readonly factorIg = 200;

  diasPerdidosYtd = 1_240;
  horasTrabajadasYtd = 842_500;
  tendenciaDiasPct = 12;
  vsAnteriorPct = -15.4;

  get igActual(): number {
    if (!this.horasTrabajadasYtd) {
      return 0;
    }
    return (this.diasPerdidosYtd / this.horasTrabajadasYtd) * this.factorIg;
  }

  get etiquetaIg(): string {
    const v = this.igActual;
    if (v < 0.35) {
      return 'Bajo';
    }
    if (v < 0.6) {
      return 'Moderado';
    }
    return 'Alto';
  }

  barrasMensuales = [
    { label: 'ENE', h: 40 },
    { label: 'FEB', h: 55 },
    { label: 'MAR', h: 35 },
    { label: 'ABR', h: 70 },
    { label: 'MAY', h: 45 },
    { label: 'JUN', h: 25 },
    { label: 'JUL', h: 50 },
    { label: 'AGO', h: 65 },
    { label: 'SEP', h: 30 },
    { label: 'OCT', h: 40 },
    { label: 'NOV', h: 55 },
    { label: 'DIC', h: 20 }
  ];

  naturalezaLesion: {
    titulo: string;
    sub: string;
    jornadas: number;
    icono: string;
    borde: 'tertiary' | 'error' | 'on-tertiary-fixed-variant' | 'primary' | 'secondary';
  }[] = [
    { titulo: 'Muerte', sub: 'Pérdida de vida', jornadas: 6_000, icono: 'person_off', borde: 'tertiary' },
    {
      titulo: 'Incapacidad total',
      sub: 'Permanente',
      jornadas: 6_000,
      icono: 'accessible',
      borde: 'error'
    },
    {
      titulo: 'Pérdida de un brazo',
      sub: 'Cualquier punto',
      jornadas: 4_500,
      icono: 'healing',
      borde: 'on-tertiary-fixed-variant'
    },
    {
      titulo: 'Pérdida de un ojo',
      sub: 'Visión completa',
      jornadas: 1_800,
      icono: 'visibility_off',
      borde: 'primary'
    },
    {
      titulo: 'Pérdida de un dedo',
      sub: 'Cualquier dedo',
      jornadas: 300,
      icono: 'back_hand',
      borde: 'secondary'
    }
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
  }[] = [
    { mes: 'Enero', dias: 124, horas: 70_200, incapacidad: 'Temporal', indiceG: 0.353 },
    { mes: 'Febrero', dias: 156, horas: 68_500, incapacidad: 'Temporal', indiceG: 0.455 },
    { mes: 'Marzo', dias: 98, horas: 72_000, incapacidad: 'Temporal', indiceG: 0.272 },
    {
      mes: 'Abril',
      dias: 450,
      horas: 69_800,
      incapacidad: 'Permanente',
      indiceG: 1.289,
      destacado: true,
      permanente: true
    },
    { mes: 'Mayo', dias: 112, horas: 71_400, incapacidad: 'Temporal', indiceG: 0.313 },
    {
      mes: 'Resto del año',
      dias: null,
      horas: null,
      incapacidad: '—',
      indiceG: null,
      resto: true
    }
  ];
}
