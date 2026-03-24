import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../../services/business.service';
import { AttendanceService, ConsolidadoHhttSummary } from '../../../../talento-humano/services/attendance.service';

export interface MesTrendHh {
  label: string;
  ordin: number;
  extra: number;
}

export interface AreaDistribucion {
  nombre: string;
  pct: number;
  barClass: 'primary' | 'primary-container' | 'secondary' | 'outline';
}

export interface RegistroDetalladoHh {
  mesAnio: string;
  departamento: string;
  cargo: string;
  horasOrdinarias: number;
  horasExtraOt: number;
  diasExtrasCount: number;
  horasExtras: number;
  totalHh: number;
  numColaboradores: number;
}

export interface MesGroup {
  mesAnio: string;
  totalHh: number;
  totalOtHoras: number;
  totalDiasExtras: number;
  rows: RegistroDetalladoHh[];
}

const BAR_CYCLE: AreaDistribucion['barClass'][] = [
  'primary',
  'primary-container',
  'secondary',
  'outline'
];

@Component({
  selector: 'app-si-consolidado-hhtt',
  templateUrl: './consolidado-hhtt.component.html',
  styleUrls: ['./../si-indicadores-theme.scss', './consolidado-hhtt.component.scss']
})
export class ConsolidadoHhttComponent implements OnInit {
  ruc: string | null = null;
  businessId: number | null = null;
  loading = false;
  loadError: string | null = null;

  filterYear       = String(new Date().getFullYear());
  filterDepartment = 'all';
  filterProject    = 'all';
  filterCargo      = 'all';

  fiscalYears: string[] = [];

  departmentOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los departamentos' }
  ];
  projectOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los proyectos activos' }
  ];
  cargoOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos los cargos' }
  ];

  kpiTotalYtd = 0;
  kpiTotalPrev = 0;
  kpiTrendPct = 0;
  kpiPromedioMensual = 0;
  kpiHorasExtras = 0;
  kpiExtrasDelTotalPct = 0;
  kpiExtrasTrendPct = 0;
  kpiColaboradores = 0;

  mesesTrend: MesTrendHh[] = [];
  areasHhtt: AreaDistribucion[] = [];
  registrosDetalle: RegistroDetalladoHh[] = [];

  /** Horas/día usadas en el cálculo (viene del backend) */
  standardHoursPerDay = 8;

  pageSize = 5;
  currentPage = 0;

  expandedMonths = new Set<string>();

  selectedRow: RegistroDetalladoHh | null = null;
  showModal = false;

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    const y = new Date().getFullYear();
    this.fiscalYears = [y, y - 1, y - 2, y - 3].map(String);
    this.filterYear = String(y);

    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }

    if (!this.ruc) {
      this.loadError = 'No se encontró el RUC en la ruta.';
      return;
    }

    this.loading = true;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) {
          this.loadError = 'No se encontró la empresa por el RUC proporcionado.';
          this.loading = false;
          return;
        }
        this.businessId = Number(id);
        this.fetchConsolidado();
      },
      error: () => {
        this.loadError = 'No se pudo obtener la información de la empresa.';
        this.loading = false;
      }
    });
  }

  onYearChange(): void {
    if (this.businessId) {
      this.fetchConsolidado();
    }
  }

  private fetchConsolidado(): void {
    if (!this.businessId) return;
    const year = Number(this.filterYear);
    if (!Number.isFinite(year)) return;

    this.loading = true;
    this.loadError = null;
    this.currentPage = 0;

    // standardHoursPerDay se omite (o se pasa 0); el backend usa las horas de la jornada de cada empleado
    this.attendanceService.getConsolidadoHhtt(this.businessId, year).subscribe({
      next: (data) => this.applySummary(data),
      error: (err) => {
        console.error('[Consolidado HHTT]', err);
        this.loadError =
          err?.error?.message ?? err?.message ?? 'No se pudo cargar el consolidado de horas hombre.';
        this.mesesTrend = [];
        this.areasHhtt = [];
        this.registrosDetalle = [];
        this.loading = false;
      }
    });
  }

  private applySummary(data: ConsolidadoHhttSummary): void {
    this.standardHoursPerDay = data.standardHoursPerDay ?? 8;

    this.kpiTotalYtd = data.totalHoursYtd ?? 0;
    this.kpiTotalPrev = data.previousYearTotalHours ?? 0;
    this.kpiTrendPct = Math.round((data.ytdVsPreviousYearPct ?? 0) * 10) / 10;
    this.kpiPromedioMensual = data.averageMonthlyHours ?? 0;
    this.kpiHorasExtras = data.extraHoursYtd ?? 0;
    this.kpiExtrasDelTotalPct = Math.round((data.extraHoursSharePct ?? 0) * 10) / 10;
    this.kpiColaboradores = data.activeEmployees ?? 0;

    const prevTot = data.previousYearTotalHours ?? 0;
    const prevExtra = data.previousYearExtraHours ?? 0;
    const prevShare = prevTot > 0 ? (prevExtra / prevTot) * 100 : 0;
    const curShare = data.extraHoursSharePct ?? 0;
    this.kpiExtrasTrendPct = Math.round((curShare - prevShare) * 10) / 10;

    this.mesesTrend = (data.monthsTrend ?? []).map((m) => ({
      label: m.label,
      ordin: m.ordinHours ?? 0,
      extra: m.extraHours ?? 0
    }));

    this.areasHhtt = (data.byDepartment ?? []).map((d, i) => ({
      nombre: d.nombre,
      pct: Math.round((d.pct ?? 0) * 10) / 10,
      barClass: BAR_CYCLE[i % BAR_CYCLE.length]
    }));

    const raw = [...(data.detailRows ?? [])];
    raw.sort((a, b) => {
      const sa = a.mesSort ?? 0;
      const sb = b.mesSort ?? 0;
      if (sb !== sa) return sb - sa;
      return (a.departamento ?? '').localeCompare(b.departamento ?? '', 'es');
    });
    this.registrosDetalle = raw.map((r) => ({
      mesAnio:         r.mesAnio,
      departamento:    r.departamento,
      cargo:           r.cargo           ?? 'Sin cargo',
      horasOrdinarias: r.horasOrdinarias  ?? 0,
      horasExtraOt:    r.horasExtraOt     ?? 0,
      diasExtrasCount: r.diasExtrasCount  ?? 0,
      horasExtras:     r.horasExtras      ?? 0,
      totalHh:         r.totalHh          ?? 0,
      numColaboradores: r.numColaboradores ?? 0
    }));

    this.departmentOptions =
      data.departmentOptions?.length > 0
        ? data.departmentOptions
        : [{ value: 'all', label: 'Todos los departamentos' }];
    this.projectOptions =
      data.projectOptions?.length > 0
        ? data.projectOptions
        : [{ value: 'all', label: 'Todos los proyectos activos' }];

    const cargosUnicos = Array.from(
      new Set(this.registrosDetalle.map((r) => r.cargo).filter((c) => !!c))
    ).sort();
    this.cargoOptions = [
      { value: 'all', label: 'Todos los cargos' },
      ...cargosUnicos.map((c) => ({ value: c, label: c }))
    ];

    if (!this.departmentOptions.some((o) => o.value === this.filterDepartment)) {
      this.filterDepartment = 'all';
    }
    if (!this.projectOptions.some((o) => o.value === this.filterProject)) {
      this.filterProject = 'all';
    }
    if (!this.cargoOptions.some((o) => o.value === this.filterCargo)) {
      this.filterCargo = 'all';
    }

    this.loading = false;
  }

  private get maxMesTotal(): number {
    return Math.max(...this.mesesTrend.map((m) => m.ordin + m.extra), 1);
  }

  heightPct(m: MesTrendHh): number {
    const t = m.ordin + m.extra;
    return Math.max(12, Math.round((t / this.maxMesTotal) * 100));
  }

  get registrosFiltrados(): RegistroDetalladoHh[] {
    let result = this.registrosDetalle;
    if (this.filterDepartment !== 'all' && this.filterDepartment.startsWith('dept:')) {
      const name = this.filterDepartment.slice('dept:'.length);
      result = result.filter((r) => r.departamento === name);
    }
    if (this.filterCargo !== 'all') {
      result = result.filter((r) => r.cargo === this.filterCargo);
    }
    return result;
  }

  get registrosPorMes(): MesGroup[] {
    const groups = new Map<string, MesGroup>();
    for (const row of this.registrosFiltrados) {
      let g = groups.get(row.mesAnio);
      if (!g) {
        g = { mesAnio: row.mesAnio, totalHh: 0, totalOtHoras: 0, totalDiasExtras: 0, rows: [] };
        groups.set(row.mesAnio, g);
      }
      g.totalHh        += row.totalHh;
      g.totalOtHoras   += row.horasExtraOt;
      g.totalDiasExtras += row.diasExtrasCount;
      g.rows.push(row);
    }
    return Array.from(groups.values());
  }

  toggleMonth(mesAnio: string): void {
    if (this.expandedMonths.has(mesAnio)) {
      this.expandedMonths.delete(mesAnio);
    } else {
      this.expandedMonths.add(mesAnio);
    }
  }

  get paginatedRegistros(): RegistroDetalladoHh[] {
    const src = this.registrosFiltrados;
    const start = this.currentPage * this.pageSize;
    return src.slice(start, start + this.pageSize);
  }

  get totalRegistros(): number {
    return this.registrosFiltrados.length;
  }

  get firstIdx(): number {
    if (this.totalRegistros === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  get lastIdx(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalRegistros);
  }

  get canPrev(): boolean {
    return this.currentPage > 0;
  }

  get canNext(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.registrosFiltrados.length;
  }

  prevPage(): void {
    if (this.canPrev) this.currentPage--;
  }

  nextPage(): void {
    if (this.canNext) this.currentPage++;
  }

  clearFilters(): void {
    const y = new Date().getFullYear();
    this.filterYear       = String(y);
    this.filterDepartment = 'all';
    this.filterProject    = 'all';
    this.filterCargo      = 'all';
    this.expandedMonths.clear();
    this.currentPage = 0;
    this.fetchConsolidado();
  }

  verRegistro(row: RegistroDetalladoHh): void {
    this.selectedRow = row;
    this.showModal = true;
  }

  closeSummaryModal(): void {
    this.showModal = false;
    this.selectedRow = null;
  }

  generarReporte(): void {
    const rows = this.registrosFiltrados;
    const year = this.filterYear;

    const totalOtHoras  = rows.reduce((s, r) => s + r.horasExtraOt,    0);
    const totalDiasEx   = rows.reduce((s, r) => s + r.diasExtrasCount,  0);
    const totalHh       = rows.reduce((s, r) => s + r.totalHh,          0);
    const totalColab    = this.kpiColaboradores;

    // Build dept distribution bars
    const deptMap = new Map<string, number>();
    rows.forEach(r => deptMap.set(r.departamento, (deptMap.get(r.departamento) ?? 0) + r.totalHh));
    const deptBars = Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, hrs]) => ({
        name,
        pct: totalHh > 0 ? Math.round((hrs / totalHh) * 1000) / 10 : 0
      }));

    // Build monthly trend
    const monthMap = new Map<string, { ord: number; ext: number }>();
    rows.forEach(r => {
      const cur = monthMap.get(r.mesAnio) ?? { ord: 0, ext: 0 };
      cur.ord += r.horasOrdinarias;
      cur.ext += r.horasExtraOt;
      monthMap.set(r.mesAnio, cur);
    });
    const months = Array.from(monthMap.entries());
    const maxMonthHh = Math.max(...months.map(([, v]) => v.ord + v.ext), 1);

    const trendBars = months.map(([label, v]) => {
      const total  = v.ord + v.ext;
      const ordPx  = Math.max(4, Math.round((v.ord / maxMonthHh) * 140));
      const extPx  = v.ext > 0 ? Math.max(3, Math.round((v.ext / maxMonthHh) * 140)) : 0;
      return `<div style="flex:1;min-width:28px;display:flex;flex-direction:column;align-items:center;gap:4px;">
  <div style="display:flex;align-items:flex-end;gap:3px;height:144px;">
    <div style="width:16px;height:${ordPx}px;background:#002855;border-radius:3px 3px 0 0;"></div>
    <div style="width:10px;height:${extPx}px;background:#59000d;border-radius:3px 3px 0 0;${extPx===0?'opacity:0;':''}"></div>
  </div>
  <span style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#43474f;white-space:nowrap;">${label.split(' ')[0].slice(0, 3).toUpperCase()}</span>
</div>`;
    }).join('');

    const distBars = deptBars.map(d => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${d.name}</span>
          <span style="font-size:12px;font-weight:900;color:#001430">${d.pct}%</span>
        </div>
        <div style="height:5px;background:#e5e9eb;border-radius:9999px;overflow:hidden">
          <div style="height:100%;width:${d.pct}%;background:#002855"></div>
        </div>
      </div>`).join('');

    const tableRows = rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f1f4f6'};border-bottom:1px solid #ebeef0">
        <td style="padding:8px 14px;font-size:9px;color:#181c1e">${r.mesAnio}</td>
        <td style="padding:8px 14px;font-size:9px;color:#181c1e">${r.departamento}</td>
        <td style="padding:8px 14px;font-size:9px;color:#181c1e">${r.cargo}</td>
        <td style="padding:8px 14px;font-size:9px;text-align:right">${r.numColaboradores}</td>
        <td style="padding:8px 14px;font-size:9px;text-align:right">${r.horasExtraOt}</td>
        <td style="padding:8px 14px;font-size:9px;text-align:right">${r.diasExtrasCount}</td>
        <td style="padding:8px 14px;font-size:9px;text-align:right;font-weight:700">${r.totalHh}</td>
      </tr>`).join('');

    const now = new Date();
    const fechaLabel = now.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    const reportId   = 'RPT-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Informe HHTT ${year}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#f7fafc;color:#181c1e}
  .a4{width:210mm;min-height:297mm;padding:18mm 20mm;margin:0 auto;background:#fff;box-shadow:0 0 40px rgba(0,20,48,.08)}
  @media print{body{background:#fff}.a4{box-shadow:none;margin:0;padding:14mm 16mm}.no-print{display:none}}
  h1{font-size:18px;font-weight:900;color:#001430;letter-spacing:-.03em}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
  .kpi{background:#f1f4f6;border-radius:6px;padding:14px}
  .kpi-lbl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#43474f;margin-bottom:4px}
  .kpi-val{font-size:26px;font-weight:900;letter-spacing:-.03em;color:#001430}
  .section-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#43474f;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .section-title::before{content:'';display:inline-block;width:3px;height:14px;background:#002855;border-radius:2px}
  table{width:100%;border-collapse:collapse}
  th{background:#002855;color:#fff;padding:9px 14px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}
  th.right{text-align:right}
  tfoot td{background:#001430;color:#fff;padding:9px 14px;font-size:9px;font-weight:800}
  tfoot td.right{text-align:right}
  .bar-chart{display:flex;align-items:flex-end;height:160px;gap:8px;padding-bottom:20px;border-left:1px solid #e0e3e5;border-bottom:1px solid #e0e3e5;margin-bottom:8px;position:relative}
  .legend{display:flex;gap:16px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#43474f}
  .legend span{display:flex;align-items:center;gap:5px}
  .dot{width:8px;height:8px;border-radius:50%}
  footer{margin-top:32px;padding-top:12px;border-top:1px solid #e0e3e5;display:flex;justify-content:space-between;align-items:flex-end}
  .sign-line{width:200px;border-top:1px solid #181c1e;padding-top:6px;text-align:center}
  .btn-print{position:fixed;bottom:24px;right:24px;background:#002855;color:#fff;border:none;border-radius:8px;padding:12px 24px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,40,85,.3)}
</style>
</head>
<body>
<div class="a4">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid rgba(0,40,85,.12)">
    <div>
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#002855;margin-bottom:4px">Executive Intelligence Dossier</div>
      <h1>INFORME DE GESTIÓN DE HORAS HOMBRE</h1>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;font-weight:800;color:#002855">${year}</div>
      <div style="font-size:8px;color:#43474f;letter-spacing:.1em;text-transform:uppercase;margin-top:2px">ID: ${reportId}</div>
      <div style="font-size:8px;color:#43474f;margin-top:2px">${fechaLabel}</div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="margin-bottom:20px">
    <div class="section-title">Resumen Ejecutivo</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-lbl">Total horas hombre</div>
        <div class="kpi-val">${totalHh.toLocaleString('es-EC')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Promedio mensual</div>
        <div class="kpi-val">${this.kpiPromedioMensual.toLocaleString('es-EC')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Horas extras acumuladas</div>
        <div class="kpi-val" style="color:#59000d">${totalOtHoras.toLocaleString('es-EC')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">N° de colaboradores</div>
        <div class="kpi-val">${totalColab}</div>
      </div>
    </div>
    <div class="kpi-grid" style="margin-top:0">
      <div class="kpi">
        <div class="kpi-lbl">Días extras (EX)</div>
        <div class="kpi-val">${totalDiasEx}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Año anterior</div>
        <div class="kpi-val">${this.kpiTotalPrev.toLocaleString('es-EC')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Variación vs año ant.</div>
        <div class="kpi-val" style="color:${this.kpiTrendPct >= 0 ? '#047857' : '#ba1a1a'}">${this.kpiTrendPct >= 0 ? '+' : ''}${this.kpiTrendPct}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Extras / Total</div>
        <div class="kpi-val">${this.kpiExtrasDelTotalPct}%</div>
      </div>
    </div>
  </div>

  <!-- Charts -->
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:28px;margin-bottom:28px">
    <div>
      <div class="section-title">Tendencia mensual</div>
      <div class="legend" style="margin-bottom:8px">
        <span><div class="dot" style="background:#002855"></div>Ordinarias</span>
        <span><div class="dot" style="background:#59000d"></div>Extras</span>
      </div>
      <div class="bar-chart">${trendBars}</div>
    </div>
    <div>
      <div class="section-title">Distribución por área</div>
      ${distBars}
    </div>
  </div>

  <!-- Table -->
  <div style="margin-bottom:28px">
    <div class="section-title">Registro detallado</div>
    <div style="overflow:hidden;border-radius:6px">
      <table>
        <thead><tr>
          <th>Mes / Año</th>
          <th>Departamento</th>
          <th>Cargo</th>
          <th class="right">N° Colab.</th>
          <th class="right">H. Extras</th>
          <th class="right">Días EX</th>
          <th class="right">Total HH</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
        <tfoot><tr>
          <td colspan="3"><strong>TOTAL YTD ${year}</strong></td>
          <td class="right">${totalColab}</td>
          <td class="right">${totalOtHoras.toLocaleString('es-EC')}</td>
          <td class="right">${totalDiasEx}</td>
          <td class="right">${totalHh.toLocaleString('es-EC')}</td>
        </tr></tfoot>
      </table>
    </div>
  </div>

  <!-- Signature -->
  <footer>
    <div style="font-size:8px;color:#43474f;letter-spacing:.08em;text-transform:uppercase">Confidencial · Solo uso interno · © ${now.getFullYear()} HR Analytics Division</div>
    <div class="sign-line">
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:#001430">Director de Operaciones HR</div>
      <div style="font-size:8px;color:#43474f;margin-top:2px">Firma Autorizada</div>
    </div>
  </footer>
</div>
<button class="btn-print no-print" onclick="window.print()">&#128438; Descargar PDF</button>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }
}
