import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetDocComplianceStatus } from '../../../../../../models/fleet-documentation.model';

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
