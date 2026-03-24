import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, SafetyIndicesSummary } from '../../../../talento-humano/services/attendance.service';

/**
 * TRIF (IADC / comparativas internacionales): (lesiones registrables / horas trabajadas) × 1.000.000
 */
@Component({
  selector: 'app-si-indice-trif',
  templateUrl: './indice-trif.component.html',
  styleUrls: ['./indice-trif.component.scss']
})
export class IndiceTrifComponent implements OnInit {
  readonly factorTrif = 1_000_000;

  loading = false;
  loadError: string | null = null;
  filterYear = String(new Date().getFullYear());
  fiscalYears: string[] = [];

  vistaPeriodo: 'mensual' | 'trimestral' = 'mensual';

  lesionesYtd = 0;
  horasYtd = 0;
  trifActual = 0;
  metaCorporativa = 0.8;
  tendenciaLesionesPct = 0;

  get deltaVsMeta(): number {
    return this.trifActual - this.metaCorporativa;
  }

  usuario = { nombre: '', rol: 'Admin HSE' };

  barrasMensuales: { label: string; h: number; highlight: boolean }[] = [];

  lineaTrifPath = '';

  distribucionImpacto: { nombre: string; pct: number }[] = [];

  tablaRows: {
    mes: string;
    lesiones: number;
    horasMes: number;
    horasAcum: number;
    trif: number;
    alerta?: boolean;
    esTotal?: boolean;
  }[] = [];

  cierreDatos = '';

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

  setVista(p: 'mensual' | 'trimestral'): void {
    this.vistaPeriodo = p;
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
    this.lesionesYtd = data.ytd.lesiones;
    this.horasYtd    = data.ytd.horasHombre;
    this.trifActual  = data.ytd.trif;

    const maxTrif = data.months.reduce((mx, m) => Math.max(mx, m.trif), 0.001);
    this.barrasMensuales = data.months.map(m => ({
      label:     m.label,
      h:         Math.round((m.trif / maxTrif) * 100),
      highlight: m.trif === maxTrif
    }));

    let acum = 0;
    const rows: typeof this.tablaRows = data.months.map(m => {
      acum += m.horasHombre;
      return {
        mes:       m.mesAnio,
        lesiones:  m.lesiones,
        horasMes:  m.horasHombre,
        horasAcum: acum,
        trif:      m.trif,
        alerta:    m.trif > this.metaCorporativa
      };
    });
    rows.push({
      mes:      'Total YTD',
      lesiones:  data.ytd.lesiones,
      horasMes:  data.ytd.horasHombre,
      horasAcum: 0,
      trif:      data.ytd.trif,
      esTotal:   true
    });
    this.tablaRows = rows;

    this.lineaTrifPath = this.buildLinePath(data.months.map(m => m.trif));

    const now = new Date();
    this.cierreDatos = `Datos actualizados al ${now.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    this.loading = false;
  }

  private buildLinePath(values: number[]): string {
    if (!values.length) return '';
    const max = Math.max(...values, 0.001);
    const w = 1200, h = 300, pad = 20;
    const step = (w - pad * 2) / Math.max(values.length - 1, 1);
    return values.map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - ((v / max) * (h - pad * 2));
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(0)},${y.toFixed(0)}`;
    }).join(' ');
  }

  exportarCsv(): void {
    const headers = ['Mes', 'Lesiones', 'H-Mes', 'H-Acumuladas', 'TRIF'];
    const lines = this.tablaRows.map((r) =>
      [r.mes, r.lesiones, r.horasMes, r.esTotal ? '' : r.horasAcum,
       r.trif.toFixed(2).replace('.', ',')].join(';')
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
