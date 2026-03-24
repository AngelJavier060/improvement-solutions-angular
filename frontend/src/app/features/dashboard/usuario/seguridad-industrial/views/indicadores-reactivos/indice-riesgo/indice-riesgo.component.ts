import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, SafetyIndicesSummary } from '../../../../talento-humano/services/attendance.service';

/** Celda heatmap: variante de opacidad primary/tertiary del HTML */
export type HeatVariant =
  | 'p5' | 'p10' | 'p20' | 'p25' | 'p30' | 'p40' | 'p50'
  | 't20' | 't30' | 't40' | 't50' | 't60' | 't70' | 't80' | 'tfull';

@Component({
  selector: 'app-si-indice-riesgo',
  templateUrl: './indice-riesgo.component.html',
  styleUrls: ['./indice-riesgo.component.scss']
})
export class IndiceRiesgoComponent implements OnInit {
  loading = false;
  loadError: string | null = null;
  filterYear = String(new Date().getFullYear());
  fiscalYears: string[] = [];

  diasPerdidosYtd = 0;
  diasPerdidosPy = 0;
  tendenciaDiasPct = 0;

  lesionesYtd = 0;
  tendenciaLesionesPct = 0;

  /** TR = IG / IF (ratio índice gravedad / índice frecuencia) */
  trActual = 0;

  barrasMensuales: { label: string; emp: number; contr: number }[] = [];

  /** 25 celdas en orden fila a fila (estructura fija del diseño HTML) */
  heatCells: { v: HeatVariant; t?: string }[] = [
    { v: 'p5', t: '1' }, { v: 'p10' },       { v: 'p20' },       { v: 'p40' },       { v: 't30', t: '4' },
    { v: 'p5' },         { v: 'p10' },       { v: 'p30', t: '12' }, { v: 't20' },    { v: 't40' },
    { v: 'p10' },        { v: 'p25', t: '8' }, { v: 'p50' },     { v: 't30' },       { v: 't50' },
    { v: 'p20' },        { v: 'p40' },       { v: 't40' },         { v: 't60' },     { v: 't80', t: '2' },
    { v: 'p30' },        { v: 'p50' },       { v: 't50' },         { v: 't70' },     { v: 'tfull', t: '1' }
  ];

  tablaMensual: {
    mes: string;
    igEmp: number;
    ifEmp: number;
    trEmp: number;
    igContr: number;
    ifContr: number;
    trContr: number;
  }[] = [];

  get promediosYtd(): {
    igEmp: number; ifEmp: number; trEmp: number;
    igContr: number; ifContr: number; trContr: number;
  } {
    const n = this.tablaMensual.length || 1;
    const s = this.tablaMensual.reduce(
      (a, r) => ({
        igEmp: a.igEmp + r.igEmp, ifEmp: a.ifEmp + r.ifEmp, trEmp: a.trEmp + r.trEmp,
        igContr: a.igContr + r.igContr, ifContr: a.ifContr + r.ifContr, trContr: a.trContr + r.trContr
      }),
      { igEmp: 0, ifEmp: 0, trEmp: 0, igContr: 0, ifContr: 0, trContr: 0 }
    );
    return {
      igEmp: s.igEmp / n, ifEmp: s.ifEmp / n, trEmp: s.trEmp / n,
      igContr: s.igContr / n, ifContr: s.ifContr / n, trContr: s.trContr / n
    };
  }

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
    this.diasPerdidosYtd = data.ytd.diasPerdidos;
    this.lesionesYtd     = data.ytd.lesiones;
    this.trActual        = data.ytd.tr;

    const maxTr = data.months.reduce((mx, m) => Math.max(mx, m.tr), 0.001);
    this.barrasMensuales = data.months.map(m => ({
      label: m.label,
      emp:   Math.round((m.tr / maxTr) * 100),
      contr: 0
    }));

    this.tablaMensual = data.months.map(m => ({
      mes:     m.mesAnio,
      igEmp:   m.ig,
      ifEmp:   m.if,
      trEmp:   m.tr,
      igContr: 0,
      ifContr: 0,
      trContr: 0
    }));

    this.loading = false;
  }

  exportarCsv(): void {
    const headers = ['Mes', 'IG Emp', 'IF Emp', 'TR Emp', 'IG Contr', 'IF Contr', 'TR Contr'];
    const lines = this.tablaMensual.map((r) =>
      [r.mes, r.igEmp, r.ifEmp, r.trEmp, r.igContr, r.ifContr, r.trContr].join(';')
    );
    const p = this.promediosYtd;
    lines.push(['Promedio YTD', p.igEmp.toFixed(1), p.ifEmp.toFixed(1), p.trEmp.toFixed(2),
                 p.igContr.toFixed(1), p.ifContr.toFixed(1), p.trContr.toFixed(2)].join(';'));
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
