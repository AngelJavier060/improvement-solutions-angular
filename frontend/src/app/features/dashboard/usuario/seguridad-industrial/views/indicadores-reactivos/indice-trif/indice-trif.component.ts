import { Component } from '@angular/core';

/**
 * TRIF (IADC / comparativas internacionales): (lesiones registrables / horas trabajadas) × 1.000.000
 * Los valores de tabla/KPI siguen el mock HTML hasta integrar API.
 */
@Component({
  selector: 'app-si-indice-trif',
  templateUrl: './indice-trif.component.html',
  styleUrls: ['./indice-trif.component.scss']
})
export class IndiceTrifComponent {
  readonly factorTrif = 1_000_000;

  vistaPeriodo: 'mensual' | 'trimestral' = 'mensual';

  lesionesYtd = 14;
  horasYtd = 1_124_580;
  /** Coherente con mock */
  trifActual = 1.24;
  metaCorporativa = 0.8;
  tendenciaLesionesPct = 2;

  get deltaVsMeta(): number {
    return this.trifActual - this.metaCorporativa;
  }

  usuario = { nombre: 'Ing. Marvín Rico', rol: 'Admin HSE' };

  /** Alturas relativas de barras (%) — mock */
  barrasMensuales = [
    { label: 'Ene', h: 40, highlight: false },
    { label: 'Feb', h: 55, highlight: false },
    { label: 'Mar', h: 30, highlight: false },
    { label: 'Abr', h: 70, highlight: false },
    { label: 'May', h: 45, highlight: false },
    { label: 'Jun', h: 60, highlight: false },
    { label: 'Jul', h: 85, highlight: true },
    { label: 'Ago', h: 50, highlight: false },
    { label: 'Sep', h: 40, highlight: false },
    { label: 'Oct', h: 35, highlight: false },
    { label: 'Nov', h: 55, highlight: false },
    { label: 'Dic', h: 65, highlight: false }
  ];

  /** Path SVG línea TRIF (viewBox 0 0 1200 300) — del HTML de referencia */
  lineaTrifPath =
    'M0,150 L100,120 L200,180 L300,80 L400,140 L500,100 L600,40 L700,110 L800,150 L900,170 L1000,120 L1100,100';

  distribucionImpacto = [
    { nombre: 'Operaciones campo', pct: 62 },
    { nombre: 'Logística y transp.', pct: 28 },
    { nombre: 'Otros', pct: 10 }
  ];

  /** Filas según mock (valores TRIF mensuales tal cual referencia) */
  tablaRows: {
    mes: string;
    lesiones: number;
    horasMes: number;
    horasAcum: number;
    trif: number;
    alerta?: boolean;
    esTotal?: boolean;
  }[] = [
    { mes: 'Enero', lesiones: 1, horasMes: 92_400, horasAcum: 92_400, trif: 1.08 },
    { mes: 'Febrero', lesiones: 2, horasMes: 88_500, horasAcum: 180_900, trif: 1.1 },
    { mes: 'Marzo', lesiones: 0, horasMes: 95_000, horasAcum: 275_900, trif: 0 },
    { mes: 'Abril', lesiones: 4, horasMes: 91_200, horasAcum: 367_100, trif: 1.09, alerta: true },
    { mes: 'Mayo', lesiones: 1, horasMes: 98_200, horasAcum: 465_300, trif: 2.15 },
    {
      mes: 'Total YTD',
      lesiones: 14,
      horasMes: 1_124_580,
      horasAcum: 0,
      trif: 1.24,
      esTotal: true
    }
  ];

  cierreDatos = 'Cierre de datos actualizado al 31 de diciembre de 2023 23:59 GMT-5';

  setVista(p: 'mensual' | 'trimestral'): void {
    this.vistaPeriodo = p;
  }

  exportarCsv(): void {
    const headers = ['Mes', 'Lesiones', 'H-Mes', 'H-Acumuladas', 'TRIF'];
    const lines = this.tablaRows.map((r) =>
      [
        r.mes,
        r.lesiones,
        r.horasMes,
        r.esTotal ? '' : r.horasAcum,
        r.trif.toFixed(2).replace('.', ',')
      ].join(';')
    );
    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trif-empresa.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
