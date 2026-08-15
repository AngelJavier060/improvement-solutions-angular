import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc, FleetDocComplianceStatus } from '../../../../../../models/fleet-documentation.model';
import { fleetDocCategoryLabel, normalizeFleetDocCategory } from '../../../../../../models/tipo-documento-vehiculo.model';

type SortKey = 'daysAsc' | 'daysDesc' | 'placa';

@Component({
  selector: 'app-documentacion-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documentacion-lista.component.html',
  styleUrls: ['./documentacion-lista.component.scss']
})
export class DocumentacionListaComponent implements OnInit, OnDestroy {
  businessRuc = '';
  vehicles: Vehicle[] = [];
  loading = true;
  error = '';

  search = '';
  sortKey: SortKey = 'daysAsc';
  exportingExcel = false;

  /** Forzar repintado cuando cambia localStorage de documentación */
  private sub?: Subscription;
  private docSub?: Subscription;

  readonly Math = Math;

  totalCount = 0;
  currentPage = 1;
  pageSize = 8;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService,
    private docService: FleetDocumentationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const parent = this.route.parent;
    if (!parent) {
      this.error = 'Ruta inválida.';
      this.loading = false;
      return;
    }
    this.sub = parent.paramMap
      .pipe(
        switchMap(pm => {
          const ruc = (pm.get('ruc') || '').trim();
          this.businessRuc = ruc;
          if (!ruc) {
            this.loading = false;
            this.vehicles = [];
            this.error = 'RUC no encontrado.';
            return of(null);
          }
          this.docService.initForRuc(ruc);
          this.error = '';
          this.loading = true;
          return this.docService.syncFromServer(ruc).pipe(
            switchMap(() => this.fleetService.getVehicles(ruc, 1, 500))
          );
        })
      )
      .subscribe({
        next: res => {
          if (!res) return;
          this.vehicles = res.vehicles || [];
          this.totalCount = this.vehicles.length;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          console.error(err);
          this.error = 'No se pudo cargar la flota.';
          this.loading = false;
          this.vehicles = [];
          this.cdr.markForCheck();
        }
      });

    this.docSub = this.docService.changes$.subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.docSub?.unsubscribe();
  }

  pageNumbers(): number[] {
    const n = this.totalPages();
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  private matchesSearch(v: Vehicle): boolean {
    const q = this.search.trim().toLowerCase();
    if (!q) return true;
    const placa = (v.placa || '').toLowerCase();
    const cod = (v.codigoEquipo || '').toLowerCase();
    const sm = (v.serieMotor || '').toLowerCase();
    const sc = (v.serieChasis || '').toLowerCase();
    return placa.includes(q) || cod.includes(q) || sm.includes(q) || sc.includes(q);
  }

  filteredVehicles(): Vehicle[] {
    let list = this.vehicles.filter(v => this.matchesSearch(v));
    const getDays = (v: Vehicle) => {
      const id = v.id;
      if (id == null) return null as number | null;
      return this.docService.worstDaysAmongActive(id);
    };
    list = [...list].sort((a, b) => {
      if (this.sortKey === 'placa') {
        return (a.placa || '').localeCompare(b.placa || '', 'es');
      }
      const da = getDays(a);
      const db = getDays(b);
      const na = da ?? 99999;
      const nb = db ?? 99999;
      return this.sortKey === 'daysAsc' ? na - nb : nb - na;
    });
    return list;
  }

  pagedVehicles(): Vehicle[] {
    const all = this.filteredVehicles();
    const start = (this.currentPage - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredVehicles().length / this.pageSize));
  }

  goPage(p: number): void {
    const tp = this.totalPages();
    if (p >= 1 && p <= tp) this.currentPage = p;
  }

  kpi(): { total: number; vigente: number; proximo: number; vencido: number; sinDocs: number; pct: number } {
    const ids = this.vehicles.map(v => v.id).filter((x): x is number => x != null);
    const c = this.docService.countByWorstStatus(ids);
    const withRisk = c.vigente + c.proximo + c.vencido;
    const pct = withRisk === 0 ? 100 : Math.round((c.vigente / withRisk) * 100);
    return { total: ids.length, ...c, pct };
  }

  statusFor(v: Vehicle): FleetDocComplianceStatus {
    if (v.id == null) return 'SIN_VIGENCIA';
    return this.docService.worstStatusForVehicle(v.id);
  }

  daysLabel(v: Vehicle): string {
    if (v.id == null) return '—';
    const d = this.docService.worstDaysAmongActive(v.id);
    if (d === null) {
      const st = this.statusFor(v);
      if (st === 'NO_CADUCA') return '∞';
      return '—';
    }
    return String(d);
  }

  /**
   * Solo documentos en alerta de vigencia (máx. 3, más urgentes primero):
   * - Caducado: ≤ 0 días → rojo
   * - Por caducar: 1–10 días → amarillo
   * - Próximo por caducar: 11–30 días → verde
   * Vigentes (> 30 días) y sin caducidad no se listan aquí.
   */
  topVigencias(v: Vehicle): {
    label: string;
    days: number;
    tone: 'err' | 'warn' | 'ok';
    stateLabel: string;
  }[] {
    if (v.id == null) return [];
    const docs = this.docService.getDocuments(v.id).filter(d => d.active && !d.historicMode);

    return docs
      .map(d => {
        if (d.expiryDate == null || d.expiryDate === '') return null;
        const days = this.docService.daysToExpiry(d.expiryDate);
        if (days === null || days > 30) return null;
        let tone: 'err' | 'warn' | 'ok';
        let stateLabel: string;
        if (days <= 0) {
          tone = 'err';
          stateLabel = 'Caducado';
        } else if (days <= 10) {
          tone = 'warn';
          stateLabel = 'Por caducar';
        } else {
          tone = 'ok';
          stateLabel = 'Próximo por caducar';
        }
        return {
          label: d.typeLabel || this.docService.labelForTypeCode(d.typeCode),
          days,
          tone,
          stateLabel
        };
      })
      .filter((x): x is { label: string; days: number; tone: 'err' | 'warn' | 'ok'; stateLabel: string } => x != null)
      .sort((a, b) => a.days - b.days || a.label.localeCompare(b.label, 'es'))
      .slice(0, 3);
  }

  statusBadgeClass(v: Vehicle): string {
    const s = this.statusFor(v);
    if (s === 'VENCIDO') return 'doc-badge doc-badge--vencido';
    if (s === 'PROXIMO') return 'doc-badge doc-badge--proximo';
    if (s === 'VIGENTE' || s === 'NO_CADUCA') return 'doc-badge doc-badge--vigente';
    return 'doc-badge doc-badge--neutral';
  }

  statusText(v: Vehicle): string {
    const s = this.statusFor(v);
    if (s === 'VENCIDO') return 'Vencido';
    if (s === 'PROXIMO') return 'Próximo a vencer';
    if (s === 'VIGENTE') return 'Vigente';
    if (s === 'NO_CADUCA') return 'Vigente';
    return 'Sin documentos';
  }

  vehicleSubtitle(v: Vehicle): string {
    const marca = v.marca || '—';
    const modelo = v.modelo || '';
    return modelo ? `${marca} · ${modelo}` : marca;
  }

  claseTipo(v: Vehicle): string {
    const c = v.clase || '—';
    const t = v.tipoVehiculo || '';
    return t ? `${c} · ${t}` : c;
  }

  exportExcelConsolidado(): void {
    if (this.exportingExcel) return;
    this.exportingExcel = true;
    try {
      const headers = [
        'Placa',
        'Código',
        'Marca',
        'Modelo',
        'Clase',
        'Tipo',
        'Serie motor',
        'Serie chasis',
        'Propietario',
        'Estado unidad',
        'Grupo documento',
        'Documento',
        'Entidad remitente',
        'Fecha emisión',
        'Vencimiento',
        'Días de vigencia',
        'Estado documento',
        'Activo'
      ];
      const rows: string[][] = [];
      const units = [...this.vehicles].sort((a, b) => (a.placa || '').localeCompare(b.placa || '', 'es'));
      for (const v of units) {
        const docs = v.id != null ? this.docService.getDocuments(v.id) : [];
        if (docs.length === 0) {
          rows.push(this.excelUnitDocRow(v, null));
          continue;
        }
        const ordered = [...docs].sort((a, b) => {
          const ga = fleetDocCategoryLabel(normalizeFleetDocCategory(a.docCategory));
          const gb = fleetDocCategoryLabel(normalizeFleetDocCategory(b.docCategory));
          return ga.localeCompare(gb, 'es') || (a.typeLabel || '').localeCompare(b.typeLabel || '', 'es');
        });
        for (const d of ordered) {
          rows.push(this.excelUnitDocRow(v, d));
        }
      }
      const xml = this.buildExcelXml('Consolidado flota', headers, rows);
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const a = document.createElement('a');
      const day = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `consolidado-documentacion-flota-${this.businessRuc}-${day}.xls`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      this.exportingExcel = false;
    }
  }

  private excelUnitDocRow(v: Vehicle, d: FleetComplianceDoc | null): string[] {
    return [
      v.placa || '',
      v.codigoEquipo || '',
      v.marca || '',
      v.modelo || '',
      v.clase || '',
      v.tipoVehiculo || '',
      v.serieMotor || '',
      v.serieChasis || '',
      v.propietario || '',
      this.estadoUnidadLabel(v),
      d ? fleetDocCategoryLabel(normalizeFleetDocCategory(d.docCategory)) : '',
      d ? (d.typeLabel || this.docService.labelForTypeCode(d.typeCode)) : '',
      d ? (d.entidadRemitenteName || '') : '',
      d ? this.formatExcelDate(d.issueDate) : '',
      d ? this.formatExcelDate(d.expiryDate) : '',
      d ? this.excelVigenciaText(d) : '',
      d ? this.excelDocStatus(d) : 'Sin documentos',
      d ? (d.active ? 'Sí' : 'No') : ''
    ];
  }

  private estadoUnidadLabel(v: Vehicle): string {
    switch (v.estadoActivo) {
      case 'ACTIVO':
        return 'Activo';
      case 'EN_TALLER':
        return 'En taller';
      case 'DADO_DE_BAJA':
        return 'Fuera de servicio';
      default:
        return v.estadoActivo || '';
    }
  }

  private formatExcelDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const dt = new Date(iso + 'T12:00:00');
    return isNaN(dt.getTime())
      ? iso
      : dt.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private excelVigenciaText(doc: FleetComplianceDoc): string {
    if (!doc.active) return '';
    const days = this.docService.daysToExpiry(doc.expiryDate);
    if (days == null) {
      return this.docService.complianceStatusForDoc(doc) === 'NO_CADUCA' ? 'No caduca' : '';
    }
    if (days < 0) {
      const n = Math.abs(days);
      return n === 1 ? 'Vencido hace 1 día' : `Vencido hace ${n} días`;
    }
    if (days === 0) return 'Vence hoy';
    if (days === 1) return '1 día';
    return `${days} días`;
  }

  private excelDocStatus(doc: FleetComplianceDoc): string {
    if (!doc.active) return 'Inactivo';
    const st = this.docService.complianceStatusForDoc(doc);
    if (st === 'NO_CADUCA') return 'No caduca';
    if (st === 'SIN_VIGENCIA') return 'Sin vigencia';
    const days = this.docService.daysToExpiry(doc.expiryDate);
    if (days == null) return 'Sin vigencia';
    if (days <= 0) return 'Caducado';
    if (days <= 10) return 'Por caducar';
    if (days <= 30) return 'Próximo por caducar';
    return 'Vigente';
  }

  private xmlEsc(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildExcelXml(sheetName: string, headers: string[], rows: string[][]): string {
    const cell = (text: string) =>
      `<Cell><Data ss:Type="String">${this.xmlEsc(text)}</Data></Cell>`;
    const headerRow = `<Row>${headers.map(h => cell(h)).join('')}</Row>`;
    const body = rows.map(r => `<Row>${r.map(c => cell(c)).join('')}</Row>`).join('');
    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<?mso-application progid="Excel.Sheet"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
      `<Worksheet ss:Name="${this.xmlEsc(sheetName)}"><Table>` +
      headerRow +
      body +
      `</Table></Worksheet></Workbook>`
    );
  }

  exportCsv(): void {
    const rows = [
      ['Placa', 'Código', 'Clase', 'Tipo', 'Estado_doc', 'Días', 'Marca', 'Modelo'].join(',')
    ];
    for (const v of this.filteredVehicles()) {
      rows.push(
        [
          v.placa || '',
          v.codigoEquipo || '',
          v.clase || '',
          v.tipoVehiculo || '',
          this.statusText(v),
          this.daysLabel(v),
          v.marca || '',
          v.modelo || ''
        ]
          .map(x => `"${String(x).replace(/"/g, '""')}"`)
          .join(',')
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `documentacion-flota-${this.businessRuc}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  irRegistro(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'registro']);
  }

  trackById(_: number, v: Vehicle): number | undefined {
    return v.id;
  }
}
