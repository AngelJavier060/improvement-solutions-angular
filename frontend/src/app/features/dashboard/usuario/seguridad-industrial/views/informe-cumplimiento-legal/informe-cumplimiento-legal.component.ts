import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { EmployeeService } from '../../../talento-humano/services/employee.service';

interface AgeRanges {
  under18: number;
  from19To30: number;
  from31To50: number;
  over50: number;
}

@Component({
  selector: 'app-informe-cumplimiento-legal',
  templateUrl: './informe-cumplimiento-legal.component.html',
  styleUrls: ['./informe-cumplimiento-legal.component.scss']
})
export class InformeCumplimientoLegalComponent implements OnChanges {
  @Input() empresa: any = null;
  @Input() ruc: string | null = null;
  @Input() obligaciones: any[] = [];
  @Input() catalogo: any[] = [];
  @Input() filesMap: Record<number, any[]> = {};
  @ViewChild('sheet') sheet?: ElementRef<HTMLElement>;

  previewOpen = false;
  downloading = false;
  logoFailed = false;
  stats = { total: 0, hombres: 0, mujeres: 0, discapacidad: 0, adolescentes: 0 };
  age: AgeRanges = { under18: 0, from19To30: 0, from31To50: 0, over50: 0 };
  ageTotal = 0;

  readonly semiLen = Math.PI * 80;
  private readonly publicTag = '[PUBLIC]';

  constructor(
    private employeeService: EmployeeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    this.logoFailed = false;
    if (this.ruc) {
      this.loadPeople(this.ruc);
    }
  }

  openPreview(): void {
    this.previewOpen = true;
    this.cdr.detectChanges();
  }

  closePreview(): void {
    if (this.downloading) return;
    this.previewOpen = false;
  }

  get companyName(): string {
    return (this.empresa?.name || this.empresa?.nameShort || 'Empresa').toString();
  }

  private reportFileName(): string {
    const name = this.companyName.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Empresa';
    return `Informe-Cumplimiento-Legal-${name}.pdf`;
  }

  get companyLogoUrl(): string {
    const logoPath = this.empresa?.logo;
    if (!logoPath) return '';
    const raw = String(logoPath).trim();
    if (!raw) return '';
    let filename = raw;
    if (/^https?:\/\//i.test(raw)) {
      try {
        filename = new URL(raw).pathname.split('/').pop() || '';
      } catch {
        filename = raw.split('/').pop() || '';
      }
    } else {
      const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
      let decoded = normalized;
      try { decoded = decodeURIComponent(normalized); } catch { /* ruta ya decodificada */ }
      filename = decoded.split('/').pop() || '';
    }
    return filename ? `/api/files/logos/${filename}` : '';
  }

  get companyMark(): string {
    const short = (this.empresa?.nameShort || this.companyName).toString().trim();
    const letters = short.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 4).toUpperCase();
    return letters || 'SST';
  }

  get docCode(): string {
    const year = new Date().getFullYear();
    const id = String(this.empresa?.id || 0).padStart(3, '0');
    return `INF-LEGAL-${year}-${id}`;
  }

  get issuedAt(): string {
    return new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  get fiscalPeriod(): string {
    return `Ejercicio Fiscal ${new Date().getFullYear()}`;
  }

  get adultos(): number {
    return Math.max(0, (this.stats.total || 0) - (this.stats.adolescentes || 0));
  }

  get completedCount(): number {
    return (this.obligaciones || []).filter(item => this.isCompleted(item)).length;
  }

  get pendingCount(): number {
    return Math.max(0, (this.obligaciones || []).length - this.completedCount);
  }

  get compliancePct(): number {
    const total = (this.obligaciones || []).length;
    if (!total) return 0;
    return Math.round((this.completedCount / total) * 1000) / 10;
  }

  get complianceLabel(): string {
    const n = this.compliancePct;
    return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
  }

  get gaugeOffset(): number {
    const p = Math.min(100, Math.max(0, this.compliancePct));
    return this.semiLen * (1 - p / 100);
  }

  get gaugeColor(): string {
    if (this.compliancePct >= 70) return '#16a34a';
    if (this.compliancePct >= 40) return '#eab308';
    return '#e11d48';
  }

  get needle(): { x: number; y: number } {
    const p = Math.min(100, Math.max(0, this.compliancePct)) / 100;
    const theta = Math.PI * (1 - p);
    return {
      x: 100 + Math.cos(theta) * 52,
      y: 100 - Math.sin(theta) * 52
    };
  }

  get averageAge(): number {
    const t = this.ageTotal;
    if (!t) return 0;
    const w =
      this.age.under18 * 16.5 +
      this.age.from19To30 * 24.5 +
      this.age.from31To50 * 40.5 +
      this.age.over50 * 58;
    return Math.round((w / t) * 10) / 10;
  }

  get atRiskCount(): number {
    return (this.obligaciones || []).filter(item => {
      const days = this.daysRemaining(item);
      return !isNaN(days) && days >= 1 && days <= 5;
    }).length;
  }

  get upcomingCount(): number {
    return (this.obligaciones || []).filter(item => {
      const days = this.daysRemaining(item);
      return !isNaN(days) && days > 5 && days <= 30;
    }).length;
  }

  get nextDueHint(): string {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let best: number | null = null;
    for (const item of this.obligaciones || []) {
      if (!item?.dueDate) continue;
      const t = new Date(item.dueDate).getTime();
      if (!Number.isFinite(t) || t < start.getTime()) continue;
      if (best === null || t < best) best = t;
    }
    const level = `Nivel global consolidado: ${this.complianceLabel}.`;
    if (best === null) {
      return `No hay fechas de vencimiento futuras registradas en la matriz. ${level}`;
    }
    const when = new Date(best).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Próximo vencimiento relevante: ${when}. ${level}`;
  }

  agePct(count: number): string {
    if (!this.ageTotal) return '0%';
    return `${Math.round((count / this.ageTotal) * 100)}%`;
  }

  barHeight(count: number): number {
    const max = Math.max(this.age.under18, this.age.from19To30, this.age.from31To50, this.age.over50, 1);
    if (!count) return 2;
    return Math.max(10, Math.round((count / max) * 56));
  }

  resolveName(item: any): string {
    const direct = (item?.name ?? item?.nombre ?? item?.title ?? item?.description ?? '').toString().trim();
    if (direct) return direct;
    const matrix = item?.obligationMatrix ?? item?.obligation_matrix;
    const nested = (matrix?.name ?? matrix?.nombre ?? matrix?.title ?? matrix?.description ?? '').toString().trim();
    if (nested) return nested;
    const catalogId = Number(item?.obligation_matrix_id ?? item?.obligationMatrixId ?? matrix?.id);
    if (!isNaN(catalogId)) {
      const found = (this.catalogo || []).find((x: any) => Number(x?.id) === catalogId);
      if (found) {
        return (found.name ?? found.nombre ?? found.title ?? found.description ?? `#${catalogId}`).toString();
      }
    }
    return 'Requisito legal';
  }

  resolveRegulation(item: any): string {
    const direct = (item?.legalRegulation ?? item?.legal_regulation ?? '').toString().trim();
    if (direct) return direct;
    const matrix = item?.obligationMatrix ?? item?.obligation_matrix;
    const nested = (matrix?.legalRegulation ?? matrix?.legal_regulation ?? '').toString().trim();
    return nested || '—';
  }

  conditionLabel(item: any): string {
    const status = this.statusOf(item);
    if (status === 'CUMPLIDO') {
      const days = this.daysRemaining(item);
      if (!isNaN(days) && days >= 1 && days <= 5) {
        return `Condición: Verificado. Alarma: caduca en ${days} día${days === 1 ? '' : 's'}`;
      }
      return 'Condición: Verificado y Aprobado (OK)';
    }
    if (status === 'VENCIDA') return 'Condición: Vencido, requiere renovación';
    if (status === 'URGENTE') return 'Condición: Vence en los próximos días';
    if (status === 'EN PROCESO') return 'Condición: En seguimiento';
    return 'Condición: Pendiente de evidencia';
  }

  statusOf(item: any): string {
    const days = this.daysRemaining(item);
    if (!isNaN(days) && days <= 0) return 'PENDIENTE';
    if (this.isCompleted(item)) return 'CUMPLIDO';
    const st = (item?.status || '').toString().toUpperCase().trim();
    if (!isNaN(days) && days <= 5) return 'URGENTE';
    if (st.includes('PROCESO')) return 'EN PROCESO';
    return st || 'PENDIENTE';
  }

  priorityOf(item: any): string {
    return (item?.priority || 'MEDIA').toString().toUpperCase();
  }

  daysLabel(item: any): string {
    const days = this.daysRemaining(item);
    if (isNaN(days)) return 'Sin fecha';
    if (days > 0) return `${days} día${days === 1 ? '' : 's'}`;
    if (days === 0) return 'Hoy';
    const overdue = Math.abs(days);
    return `Hace ${overdue} día${overdue === 1 ? '' : 's'}`;
  }

  dueLabel(item: any): string {
    if (!item?.dueDate) return 'Sin vencimiento';
    const d = new Date(item.dueDate);
    if (isNaN(d.getTime())) return 'Sin vencimiento';
    return `Vence: ${d.toLocaleDateString('es-EC')}`;
  }

  daysTone(item: any): string {
    const days = this.daysRemaining(item);
    if (isNaN(days) || days < 0) return 'tone-late';
    if (days <= 30) return 'tone-soon';
    return 'tone-ok';
  }

  fileLabel(item: any): string {
    const id = Number(item?.id);
    const list = Array.isArray(this.filesMap?.[id]) ? this.filesMap[id] : [];
    const publicPdfs = list.filter((f: any) => {
      const name = (f?.name ?? f?.path ?? '').toString().toLowerCase();
      const desc = (f?.description ?? '').toString();
      return name.endsWith('.pdf') && desc.includes(this.publicTag);
    });
    const count = publicPdfs.length || list.length;
    if (!count) return 'Sin documentos';
    return `${count} Archivo${count === 1 ? '' : 's'} Adjunto${count === 1 ? '' : 's'}`;
  }

  async downloadPdf(): Promise<void> {
    if (this.downloading) return;
    this.downloading = true;
    this.cdr.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 40));
    const el = this.sheet?.nativeElement;
    const stage = el?.closest('.pdf-stage') as HTMLElement | null;
    if (stage) stage.scrollTop = 0;
    if (el) await this.waitForImages(el);
    if (!el) {
      this.downloading = false;
      return;
    }
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      const pxPerMm = canvas.width / pageW;

      if (imgH <= pageH + 1) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, imgH);
      } else {
        const pageHeightPx = Math.floor(pageH * pxPerMm);
        let srcY = 0;
        let pageIndex = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min(pageHeightPx, canvas.height - srcY);
          if (sliceH < 8) break;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) break;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, sliceH / pxPerMm);
          srcY += sliceH;
          pageIndex++;
        }
      }

      pdf.save(this.reportFileName());
    } catch (err) {
      console.error('No se pudo generar el PDF del informe:', err);
    } finally {
      this.downloading = false;
      this.cdr.detectChanges();
    }
  }

  printReport(): void {
    const sheet = this.sheet?.nativeElement;
    if (!sheet || this.downloading) return;
    const attr = Array.from(sheet.attributes).map(a => a.name).find(name => name.startsWith('_ngcontent')) || '';
    const css = Array.from(document.querySelectorAll('style'))
      .map(style => style.textContent || '')
      .filter(text => !attr || text.includes(attr))
      .join('\n');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }
    const clone = sheet.cloneNode(true) as HTMLElement;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.escapeHtml(this.companyName)}</title><style>
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { width: 210mm !important; min-height: auto !important; margin: 0 auto !important; box-shadow: none !important; }
      tr, .panel, .kpis, .metrics, .doc-header { break-inside: avoid; page-break-inside: avoid; }
      ${css}
    </style></head><body></body></html>`);
    doc.close();
    doc.body.appendChild(clone);
    const finish = () => {
      win.focus();
      win.print();
      win.onafterprint = () => iframe.remove();
      setTimeout(() => iframe.remove(), 1500);
    };
    this.waitForImages(doc.body).then(finish);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
  }

  private waitForImages(el: HTMLElement): Promise<void> {
    const images = Array.from(el.querySelectorAll('img'));
    return Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })).then(() => undefined);
  }

  private loadPeople(ruc: string): void {
    this.employeeService.getEmployeeStatsByBusinessRuc(ruc).subscribe({
      next: (stats: any) => {
        this.stats = {
          total: Number(stats?.total) || 0,
          hombres: Number(stats?.hombres) || 0,
          mujeres: Number(stats?.mujeres) || 0,
          discapacidad: Number(stats?.discapacidad) || 0,
          adolescentes: Number(stats?.adolescentes) || 0
        };
      },
      error: () => {
        this.stats = { total: 0, hombres: 0, mujeres: 0, discapacidad: 0, adolescentes: 0 };
      }
    });
    this.employeeService.getEmployeeAgeRangesByBusinessRuc(ruc).subscribe({
      next: (ranges: any) => {
        this.age = {
          under18: Number(ranges?.under18) || 0,
          from19To30: Number(ranges?.from19To30) || 0,
          from31To50: Number(ranges?.from31To50) || 0,
          over50: Number(ranges?.over50) || 0
        };
        const sum = this.age.under18 + this.age.from19To30 + this.age.from31To50 + this.age.over50;
        this.ageTotal = Number(ranges?.total) > 0 ? Number(ranges.total) : sum;
      },
      error: () => {
        this.age = { under18: 0, from19To30: 0, from31To50: 0, over50: 0 };
        this.ageTotal = 0;
      }
    });
  }

  private isCompleted(item: any): boolean {
    const days = this.daysRemaining(item);
    if (!isNaN(days) && days <= 0) return false;
    if (item?.completed) return true;
    return (item?.status || '').toString().toUpperCase().includes('CUMPLID');
  }

  private daysRemaining(item: any): number {
    if (!item?.dueDate) return NaN;
    const due = new Date(item.dueDate);
    if (isNaN(due.getTime())) return NaN;
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((due.getTime() - today.getTime()) / 86400000);
  }
}
