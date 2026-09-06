import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import {
  CalidadDocumentoDto,
  CalidadDocumentosService
} from '../../../../../services/calidad-documentos.service';

interface ProcessBar {
  name: string;
  code: string;
  docs: number;
  vigentes: number;
  enRevision: number;
  fillPct: number;
  revPct: number;
}

interface CriticalUpdate {
  tag: string;
  tagClass: string;
  dot: string;
  text: string;
  meta: string;
}

interface DocRow {
  id: string;
  process: string;
  status: string;
  date: string;
  resp: string;
  statusClass: string;
}

@Component({
  selector: 'app-calidad-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calidad-dashboard.component.html',
  styleUrls: ['./calidad-dashboard.component.scss']
})
export class CalidadDashboardComponent implements OnInit {
  ruc: string | null = null;
  companyName = '';
  loading = true;
  loadError: string | null = null;
  auditMode = false;
  chartMode: 'docs' | 'compliance' = 'docs';

  documents: CalidadDocumentoDto[] = [];
  catalogProcesses: Array<{ id: number; name: string; code: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private docsApi: CalidadDocumentosService,
    private businessService: BusinessService,
  ) {}

  ngOnInit(): void {
    this.ruc = this.resolveRuc();
    if (!this.ruc) {
      this.loading = false;
      this.loadError = 'No se encontró el RUC de la empresa.';
      return;
    }
    this.loadAll();
  }

  get rootDocuments(): CalidadDocumentoDto[] {
    return this.documents.filter(d => d.parentId == null);
  }

  get totalDocs(): number {
    return this.documents.length;
  }

  get vigentesCount(): number {
    return this.documents.filter(d => this.isVigente(d)).length;
  }

  get enRevisionCount(): number {
    return this.documents.filter(d => this.isInReview(d)).length;
  }

  get expiredCount(): number {
    return this.documents.filter(d => this.isExpired(d)).length;
  }

  get expiringSoonCount(): number {
    return this.documents.filter(d => this.isExpiringSoon(d)).length;
  }

  get compliancePct(): number {
    if (!this.totalDocs) {
      return 0;
    }
    return Math.round((this.vigentesCount / this.totalDocs) * 1000) / 10;
  }

  get complianceLabel(): string {
    return this.totalDocs ? `${this.formatPct(this.compliancePct)}%` : '—';
  }

  get complianceTrend(): string {
    if (!this.totalDocs) {
      return 'Sin documentos registrados';
    }
    return `${this.vigentesCount} de ${this.totalDocs} vigentes`;
  }

  get auditReadiness(): string {
    if (!this.totalDocs) {
      return 'Sin datos';
    }
    if (this.expiredCount > 0) {
      return 'Atención';
    }
    if (this.compliancePct >= 90) {
      return 'Óptimo';
    }
    if (this.compliancePct >= 70) {
      return 'Aceptable';
    }
    return 'Crítico';
  }

  get auditReadinessOk(): boolean {
    return this.auditReadiness === 'Óptimo';
  }

  get nextRevisionLabel(): string {
    const dates = this.documents
      .map(d => d.fechaProxRevision)
      .filter((x): x is string => !!x)
      .sort();
    if (!dates.length) {
      return 'Sin fecha programada';
    }
    return `Próx. revisión: ${this.formatDate(dates[0])}`;
  }

  get gaugeScore(): number {
    if (!this.totalDocs) {
      return 0;
    }
    return Math.round(this.compliancePct);
  }

  get gaugeStatus(): string {
    if (!this.totalDocs) {
      return 'Sin matriz documental';
    }
    if (this.expiredCount > 0) {
      return 'Hay documentos vencidos o obsoletos';
    }
    if (this.gaugeScore >= 90) {
      return 'Estado óptimo del sistema';
    }
    if (this.gaugeScore >= 70) {
      return 'Estado aceptable · mejorar vigencia';
    }
    return 'Requiere acción de control documental';
  }

  get departments(): ProcessBar[] {
    const map = new Map<string, ProcessBar>();

    for (const p of this.catalogProcesses) {
      const key = p.code || p.name;
      map.set(key, {
        name: p.name || p.code,
        code: p.code,
        docs: 0,
        vigentes: 0,
        enRevision: 0,
        fillPct: 0,
        revPct: 0
      });
    }

    for (const d of this.documents) {
      const key = d.procesoCode || d.procesoName || 'SIN';
      const existing = map.get(key);
      if (existing) {
        existing.docs += 1;
        if (this.isVigente(d)) {
          existing.vigentes += 1;
        }
        if (this.isInReview(d)) {
          existing.enRevision += 1;
        }
      } else {
        map.set(key, {
          name: d.procesoName || d.procesoCode || 'Sin proceso',
          code: d.procesoCode || '',
          docs: 1,
          vigentes: this.isVigente(d) ? 1 : 0,
          enRevision: this.isInReview(d) ? 1 : 0,
          fillPct: 0,
          revPct: 0
        });
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.docs - a.docs || a.name.localeCompare(b.name));
    const maxDocs = Math.max(1, ...rows.map(r => r.docs));

    for (const row of rows) {
      if (this.chartMode === 'compliance') {
        const base = Math.max(1, row.docs);
        row.fillPct = Math.round((row.vigentes / base) * 100);
        row.revPct = Math.round((row.enRevision / base) * 100);
      } else {
        const activos = Math.max(0, row.docs - row.enRevision);
        row.fillPct = Math.round((activos / maxDocs) * 100);
        row.revPct = Math.round((row.enRevision / maxDocs) * 100);
      }
    }
    return rows;
  }

  get criticalUpdates(): CriticalUpdate[] {
    const items: CriticalUpdate[] = [];

    for (const d of this.documents.filter(x => this.isExpired(x))) {
      items.push({
        tag: 'Acción inmediata',
        tagClass: 'tag--danger',
        dot: 'dot--danger',
        text: `${d.codigo} · ${d.nombre} está ${this.statusLabel(d.estado)}.`,
        meta: `${this.relativeFrom(d.updatedAt || d.createdAt)} • ${d.procesoName || d.procesoCode || 'Calidad'}`
      });
    }

    for (const d of this.documents.filter(x => this.isExpiringSoon(x) && !this.isExpired(x))) {
      items.push({
        tag: 'Vigencia próxima',
        tagClass: 'tag--danger',
        dot: 'dot--danger',
        text: `${d.codigo} vence el ${this.formatDate(d.fechaProxRevision)}.`,
        meta: `${d.responsable || 'Sin responsable'} • ${d.diasVigencia != null ? d.diasVigencia + ' días' : 'Revisión'}`
      });
    }

    for (const d of this.documents.filter(x => this.isInReview(x))) {
      items.push({
        tag: 'En revisión',
        tagClass: 'tag--muted',
        dot: 'dot--muted',
        text: `${d.codigo} · ${d.nombre} está en flujo de revisión.`,
        meta: `${this.relativeFrom(d.updatedAt || d.createdAt)} • ${d.responsable || 'SGI'}`
      });
    }

    const recent = [...this.documents]
      .filter(d => d.createdAt || d.updatedAt)
      .sort((a, b) => this.toTime(b.updatedAt || b.createdAt) - this.toTime(a.updatedAt || a.createdAt))
      .slice(0, 3);

    for (const d of recent) {
      if (items.some(i => i.text.includes(d.codigo))) {
        continue;
      }
      items.push({
        tag: 'Lista maestra',
        tagClass: 'tag--muted',
        dot: 'dot--muted',
        text: `${d.codigo} · ${d.nombre} actualizado en el control documental.`,
        meta: `${this.relativeFrom(d.updatedAt || d.createdAt)} • ${d.procesoName || 'Calidad'}`
      });
    }

    if (!this.documents.length) {
      items.push({
        tag: 'Sistema',
        tagClass: 'tag--muted',
        dot: 'dot--muted',
        text: 'Aún no hay documentos en la lista maestra de esta empresa.',
        meta: 'Registre el primer procedimiento en Documentos'
      });
    } else if (!this.expiredCount && this.vigentesCount === this.totalDocs) {
      items.unshift({
        tag: 'Éxito',
        tagClass: 'tag--success',
        dot: 'dot--success',
        text: `Matriz documental vigente: ${this.totalDocs} registro(s) controlado(s).`,
        meta: 'Integridad de datos • ISO 7.5'
      });
    }

    return items.slice(0, 5);
  }

  get docTable(): DocRow[] {
    const source = this.auditMode
      ? this.documents.filter(d => this.isExpired(d) || this.isInReview(d) || this.isExpiringSoon(d))
      : [...this.documents];

    return source
      .sort((a, b) => this.urgency(a) - this.urgency(b) || (a.codigo || '').localeCompare(b.codigo || ''))
      .slice(0, 8)
      .map(d => ({
        id: d.codigo,
        process: d.nombre,
        status: this.statusLabel(d.estado),
        date: this.formatDate(d.fechaRevision || d.fechaElaboracion),
        resp: d.responsable || '—',
        statusClass: this.badgeClass(d.estado)
      }));
  }

  loadAll(): void {
    if (!this.ruc) {
      return;
    }
    this.loading = true;
    this.loadError = null;

    this.docsApi.list(this.ruc).subscribe({
      next: rows => {
        this.documents = rows || [];
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
        this.loadError = err?.error?.message || 'No se pudo cargar el panel de calidad.';
      }
    });

    this.businessService.getByRuc(this.ruc).subscribe({
      next: (biz: any) => {
        this.companyName = String(biz?.name || biz?.nameShort || '').trim();
        this.applyIsoProcesses(biz?.iso9001CatalogItems);
        const id = Number(biz?.id);
        if (id) {
          this.businessService.getDetails(id).subscribe({
            next: (details: any) => this.applyIsoProcesses(details?.iso9001CatalogItems),
            error: () => undefined
          });
        }
      },
      error: () => undefined
    });
  }

  goToDocumentos(): void {
    if (!this.ruc) {
      return;
    }
    this.router.navigate(['/usuario', this.ruc, 'calidad', 'documentos']);
  }

  toggleAuditMode(): void {
    this.auditMode = !this.auditMode;
  }

  exportReport(): void {
    if (!this.documents.length) {
      return;
    }
    const headers = ['Código', 'Nombre', 'Proceso', 'Tipo', 'Estado', 'Versión', 'Revisión', 'Próx. revisión', 'Responsable'];
    const lines = this.documents.map(d => [
      d.codigo, d.nombre, d.procesoName || d.procesoCode, d.tipoCode,
      this.statusLabel(d.estado), d.version || '', d.fechaRevision || '',
      d.fechaProxRevision || '', d.responsable || ''
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-maestra-${this.ruc || 'calidad'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  badgeClass(estado: string | undefined): string {
    if (this.isExpired({ estado } as CalidadDocumentoDto)) {
      return 'badge--err';
    }
    if (this.isInReview({ estado } as CalidadDocumentoDto)) {
      return 'badge--warn';
    }
    return 'badge--ok';
  }

  private applyIsoProcesses(items: any): void {
    if (!Array.isArray(items) || !items.length) {
      return;
    }
    const seen = new Set<number>();
    this.catalogProcesses = items
      .filter((x: any) => String(x?.catalogCode) === 'proceso')
      .map((x: any) => ({
        id: Number(x.id),
        name: String(x?.name ?? '').trim(),
        code: String(x?.code ?? '').trim().toUpperCase()
      }))
      .filter((x: { id: number; name: string }) => {
        if (!x.id || !x.name || seen.has(x.id)) {
          return false;
        }
        seen.add(x.id);
        return true;
      });
  }

  private resolveRuc(): string | null {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        return found;
      }
      parent = parent.parent as ActivatedRoute | null;
    }
    return null;
  }

  private isVigente(d: CalidadDocumentoDto): boolean {
    const e = (d.estado || '').toUpperCase();
    return !e || e.includes('VIGENT');
  }

  private isInReview(d: CalidadDocumentoDto): boolean {
    return (d.estado || '').toUpperCase().includes('REVIS');
  }

  private isExpired(d: CalidadDocumentoDto): boolean {
    const e = (d.estado || '').toUpperCase();
    return e.includes('EXPIR') || e.includes('OBSOLE');
  }

  private isExpiringSoon(d: CalidadDocumentoDto): boolean {
    if (!d.fechaProxRevision || this.isExpired(d)) {
      return false;
    }
    const t = Date.parse(d.fechaProxRevision);
    if (Number.isNaN(t)) {
      return false;
    }
    const days = (t - Date.now()) / 86400000;
    return days >= 0 && days <= 30;
  }

  private urgency(d: CalidadDocumentoDto): number {
    if (this.isExpired(d)) {
      return 0;
    }
    if (this.isExpiringSoon(d)) {
      return 1;
    }
    if (this.isInReview(d)) {
      return 2;
    }
    return 3;
  }

  private statusLabel(estado: string | undefined): string {
    const e = (estado || 'VIGENTE').trim();
    return e.charAt(0).toUpperCase() + e.slice(1).toLowerCase();
  }

  private formatPct(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      return value;
    }
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private toTime(value?: string | null): number {
    if (!value) {
      return 0;
    }
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }

  private relativeFrom(value?: string | null): string {
    const t = this.toTime(value);
    if (!t) {
      return 'Registro SGI';
    }
    const diff = Date.now() - t;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) {
      return 'Hace un momento';
    }
    if (mins < 60) {
      return `Hace ${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return `Hace ${hours} h`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'Ayer';
    }
    return `Hace ${days} días`;
  }
}
