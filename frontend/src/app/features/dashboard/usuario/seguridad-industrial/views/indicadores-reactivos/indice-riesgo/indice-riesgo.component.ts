import { Component } from '@angular/core';

/** Celda heatmap: variante de opacidad primary/tertiary del HTML */
export type HeatVariant =
  | 'p5'
  | 'p10'
  | 'p20'
  | 'p25'
  | 'p30'
  | 'p40'
  | 'p50'
  | 't20'
  | 't30'
  | 't40'
  | 't50'
  | 't60'
  | 't70'
  | 't80'
  | 'tfull';

@Component({
  selector: 'app-si-indice-riesgo',
  templateUrl: './indice-riesgo.component.html',
  styleUrls: ['./indice-riesgo.component.scss']
})
export class IndiceRiesgoComponent {
  diasPerdidosYtd = 1_248;
  diasPerdidosPy = 1_114;
  tendenciaDiasPct = 12;

  lesionesYtd = 142;
  tendenciaLesionesPct = -4;

  /** TR directo: días / lesiones (demo coherente con KPI) */
  get trActual(): number {
    if (!this.lesionesYtd) {
      return 0;
    }
    return this.diasPerdidosYtd / this.lesionesYtd;
  }

  barrasMensuales: { label: string; emp: number; contr: number }[] = [
    { label: 'ENE', emp: 45, contr: 30 },
    { label: 'FEB', emp: 55, contr: 40 },
    { label: 'MAR', emp: 65, contr: 55 },
    { label: 'ABR', emp: 40, contr: 35 },
    { label: 'MAY', emp: 75, contr: 60 },
    { label: 'JUN', emp: 90, contr: 80 },
    { label: 'JUL', emp: 60, contr: 50 },
    { label: 'AGO', emp: 45, contr: 30 }
  ];

  /** 25 celdas en orden fila a fila (mock HTML) */
  heatCells: { v: HeatVariant; t?: string }[] = [
    { v: 'p5', t: '1' },
    { v: 'p10' },
    { v: 'p20' },
    { v: 'p40' },
    { v: 't30', t: '4' },
    { v: 'p5' },
    { v: 'p10' },
    { v: 'p30', t: '12' },
    { v: 't20' },
    { v: 't40' },
    { v: 'p10' },
    { v: 'p25', t: '8' },
    { v: 'p50' },
    { v: 't30' },
    { v: 't50' },
    { v: 'p20' },
    { v: 'p40' },
    { v: 't40' },
    { v: 't60' },
    { v: 't80', t: '2' },
    { v: 'p30' },
    { v: 'p50' },
    { v: 't50' },
    { v: 't70' },
    { v: 'tfull', t: '1' }
  ];

  tablaMensual: {
    mes: string;
    igEmp: number;
    ifEmp: number;
    trEmp: number;
    igContr: number;
    ifContr: number;
    trContr: number;
  }[] = [
    { mes: 'Enero', igEmp: 124.5, ifEmp: 14.2, trEmp: 8.77, igContr: 88.2, ifContr: 9.1, trContr: 9.69 },
    { mes: 'Febrero', igEmp: 110.2, ifEmp: 12.5, trEmp: 8.82, igContr: 92.4, ifContr: 10.2, trContr: 9.05 },
    { mes: 'Marzo', igEmp: 145.8, ifEmp: 15.4, trEmp: 9.46, igContr: 75.1, ifContr: 7.8, trContr: 9.62 },
    { mes: 'Abril', igEmp: 98.2, ifEmp: 11.1, trEmp: 8.85, igContr: 81.5, ifContr: 8.9, trContr: 9.15 },
    { mes: 'Mayo', igEmp: 132.4, ifEmp: 15.2, trEmp: 8.71, igContr: 102.3, ifContr: 11.4, trContr: 8.97 }
  ];

  get promediosYtd(): {
    igEmp: number;
    ifEmp: number;
    trEmp: number;
    igContr: number;
    ifContr: number;
    trContr: number;
  } {
    const n = this.tablaMensual.length;
    const s = this.tablaMensual.reduce(
      (a, r) => ({
        igEmp: a.igEmp + r.igEmp,
        ifEmp: a.ifEmp + r.ifEmp,
        trEmp: a.trEmp + r.trEmp,
        igContr: a.igContr + r.igContr,
        ifContr: a.ifContr + r.ifContr,
        trContr: a.trContr + r.trContr
      }),
      { igEmp: 0, ifEmp: 0, trEmp: 0, igContr: 0, ifContr: 0, trContr: 0 }
    );
    return {
      igEmp: s.igEmp / n,
      ifEmp: s.ifEmp / n,
      trEmp: s.trEmp / n,
      igContr: s.igContr / n,
      ifContr: s.ifContr / n,
      trContr: s.trContr / n
    };
  }

  exportarCsv(): void {
    const headers = [
      'Mes',
      'IG Emp',
      'IF Emp',
      'TR Emp',
      'IG Contr',
      'IF Contr',
      'TR Contr'
    ];
    const lines = this.tablaMensual.map((r) =>
      [r.mes, r.igEmp, r.ifEmp, r.trEmp, r.igContr, r.ifContr, r.trContr].join(';')
    );
    const p = this.promediosYtd;
    lines.push(
      [
        'Promedio YTD',
        p.igEmp.toFixed(1),
        p.ifEmp.toFixed(1),
        p.trEmp.toFixed(2),
        p.igContr.toFixed(1),
        p.ifContr.toFixed(1),
        p.trContr.toFixed(2)
      ].join(';')
    );
    const csv = [headers.join(';'), ...lines].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasa-riesgo-consolidado.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarPdf(): void {
    window.print();
  }
}
