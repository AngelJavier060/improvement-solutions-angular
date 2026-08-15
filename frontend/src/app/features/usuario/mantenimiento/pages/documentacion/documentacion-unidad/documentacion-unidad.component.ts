import { Component, OnDestroy, OnInit, ChangeDetectorRef, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { BusinessService } from '../../../../../../services/business.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc } from '../../../../../../models/fleet-documentation.model';
import {
  FLEET_DOC_CATEGORIES,
  FleetDocCategory,
  normalizeFleetDocCategory
} from '../../../../../../models/tipo-documento-vehiculo.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

interface DocSection {
  code: FleetDocCategory;
  label: string;
  docs: FleetComplianceDoc[];
}

@Component({
  selector: 'app-documentacion-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documentacion-unidad.component.html',
  styleUrls: ['./documentacion-unidad.component.scss']
})
export class DocumentacionUnidadComponent implements OnInit, OnDestroy {
  businessRuc = '';
  vehicleId = 0;
  vehicle: Vehicle | null = null;
  loading = true;
  error = '';
  search = '';
  docSections: DocSection[] = [];
  /** description del catálogo (entidad remitente) por typeCode */
  private tipoDescByCode = new Map<string, string>();
  private docSub?: Subscription;
  private routeSub?: Subscription;

  private pdfBlobUrl: string | null = null;
  private pdfOverlayEl: HTMLElement | null = null;
  private pdfKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private bodyOverflowBackup: string | null = null;

  @ViewChild('estadoReport') estadoReport?: ElementRef<HTMLElement>;
  exportingPdf = false;
  companyLogoUrl = '';
  private pdfDownloadName: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService,
    private docService: FleetDocumentationService,
    private authService: AuthService,
    private businessService: BusinessService,
    private http: HttpClient,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.docSub = this.docService.changes$.subscribe(() => {
      this.rebuildSections();
      this.cdr.detectChanges();
    });
    this.routeSub = this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('vehicleId') || '');
      this.vehicleId = id;
      this.businessRuc = activeBusinessRuc(this.route);
      if (!this.businessRuc || !Number.isFinite(id) || id <= 0) {
        this.error = 'Unidad no válida.';
        this.loading = false;
        return;
      }
      if (!this.authService.isLoggedIn()) {
        this.router.navigate(['/auth/usuario-login'], {
          queryParams: { returnUrl: this.router.url }
        });
        return;
      }
      this.docService.initForRuc(this.businessRuc);
      this.loadVehicleAndDocs();
    });
  }

  /** Expuesto al template para queryParams de renovar. */
  normalizeCategory(code: string | null | undefined): FleetDocCategory {
    return normalizeFleetDocCategory(code);
  }

  private ensureSession(): boolean {
    if (this.authService.isLoggedIn()) return true;
    alert('Sesión expirada. Vuelva a iniciar sesión para continuar.');
    this.router.navigate(['/auth/usuario-login'], {
      queryParams: { returnUrl: this.router.url }
    });
    return false;
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.closePdfPreview();
  }

  private loadVehicleAndDocs(): void {
    this.loading = true;
    this.error = '';
    const ruc = this.businessRuc;
    const vid = this.vehicleId;

    forkJoin({
      vehicle: this.fleetService.getVehicleById(ruc, vid),
      docs: this.docService.syncVehicleFromServer(ruc, vid).pipe(catchError(() => of([]))),
      catalogs: this.fleetService.getFichaCatalogs(ruc).pipe(catchError(() => of(null))),
      business: this.businessService.getByRuc(ruc).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ vehicle, catalogs, business }) => {
        this.vehicle = vehicle;
        this.companyLogoUrl = this.logoUrlFromPath(business?.logo);
        this.tipoDescByCode.clear();
        const entidades = catalogs?.entidadRemitentes || [];
        for (const e of entidades) {
          if (e?.id == null) continue;
          const code = `er_${e.id}`;
          const desc = (e.description || '').trim();
          if (desc) this.tipoDescByCode.set(code, desc);
          if (desc && e.name) this.tipoDescByCode.set(`name:${(e.name || '').toLowerCase()}`, desc);
        }
        this.rebuildSections();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la unidad.';
        this.vehicle = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  totalDocsCount(): number {
    return this.docService.getDocuments(this.vehicleId).length;
  }

  /** Subtítulo: descripción de la entidad remitente o nombre. */
  docSubtitle(doc: FleetComplianceDoc): string {
    const byCode = this.tipoDescByCode.get(doc.typeCode || '');
    if (byCode) return byCode;
    const byName = this.tipoDescByCode.get(`name:${(doc.typeLabel || '').toLowerCase()}`);
    if (byName) return byName;
    if (doc.entidadRemitenteName?.trim()) return doc.entidadRemitenteName.trim();
    if (doc.fileName?.trim()) return doc.fileName.trim();
    return '—';
  }

  filteredDocs(): FleetComplianceDoc[] {
    const all = this.docService.getDocuments(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      d =>
        (d.typeLabel || '').toLowerCase().includes(q) ||
        (d.typeCode || '').toLowerCase().includes(q) ||
        (d.entidadRemitenteName || '').toLowerCase().includes(q) ||
        this.docSubtitle(d).toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q)
    );
  }

  registroCommands(): (string | number)[] {
    return ['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', this.vehicleId, 'registro'];
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.rebuildSections();
  }

  trackSection(_i: number, sec: DocSection): string {
    return sec.code;
  }

  trackDoc(_i: number, doc: FleetComplianceDoc): string {
    return doc.id;
  }

  private rebuildSections(): void {
    const docs = this.filteredDocs();
    this.docSections = FLEET_DOC_CATEGORIES.map(c => ({
      code: c.code,
      label: c.label,
      docs: docs.filter(d => normalizeFleetDocCategory(d.docCategory) === c.code)
    }));
  }

  sections(): DocSection[] {
    return this.docSections;
  }

  reportSections(): DocSection[] {
    const all = this.docService.getDocuments(this.vehicleId);
    return FLEET_DOC_CATEGORIES.map(c => ({
      code: c.code,
      label: c.label,
      docs: all.filter(d => normalizeFleetDocCategory(d.docCategory) === c.code)
    }));
  }

  reportDownloadDate(): string {
    return new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  reportBadge(): string {
    return this.vehicle?.estadoActivo === 'ACTIVO' ? 'FLOTA ACTIVA' : (this.estadoUnidadLabel() || 'FLOTA').toUpperCase();
  }

  reportVehicleLine(): string {
    return [this.vehicle?.marca, this.vehicle?.modelo, this.vehicle?.tipoVehiculo].filter(Boolean).join(' • ') || 'Unidad de flota';
  }

  private logoUrlFromPath(logoPath?: string | null): string {
    if (!logoPath) return '';
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    const filename = String(logoPath).replace(/\\/g, '/').split('/').pop() || '';
    return filename ? `/api/files/logos/${filename}` : '';
  }

  async exportEstadoPdf(): Promise<void> {
    if (!this.vehicle || this.exportingPdf) return;
    this.exportingPdf = true;
    this.cdr.detectChanges();
    await new Promise(r => setTimeout(r, 50));
    const el = this.estadoReport?.nativeElement;
    if (!el) {
      this.exportingPdf = false;
      alert('No se pudo preparar el reporte.');
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
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const imgW = usableW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const pxPerMm = canvas.width / imgW;

      if (imgH <= usableH + 2) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, imgH);
      } else {
        const pageHeightPx = Math.floor(usableH * pxPerMm);
        let srcY = 0;
        let pageIndex = 0;
        while (srcY < canvas.height) {
          const remaining = canvas.height - srcY;
          if (remaining < 12) {
            break;
          }
          const sliceH = Math.min(pageHeightPx, remaining);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) {
            break;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (pageIndex > 0) {
            pdf.addPage();
          }
          pdf.addImage(
            pageCanvas.toDataURL('image/jpeg', 0.92),
            'JPEG',
            margin,
            margin,
            imgW,
            sliceH / pxPerMm
          );
          srcY += sliceH;
          pageIndex++;
        }
      }
      const placa = (this.vehicle.placa || 'unidad').replace(/[^\w-]+/g, '_');
      const fileName = `reporte-estado-vehicular-${placa}.pdf`;
      const blob = pdf.output('blob');
      this.closePdfPreview();
      this.pdfBlobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      this.mountPdfViewerOverlay(`Reporte de Estado — ${this.vehicle.placa}`, this.pdfBlobUrl, fileName);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el PDF. Intente de nuevo.');
    } finally {
      this.exportingPdf = false;
      this.cdr.detectChanges();
    }
  }

  status(doc: FleetComplianceDoc) {
    return this.docService.complianceStatusForDoc(doc);
  }

  days(doc: FleetComplianceDoc): number | null {
    return this.docService.daysToExpiry(doc.expiryDate);
  }

  statusText(doc: FleetComplianceDoc): string {
    if (!doc.active) return 'Inactivo';
    if (this.status(doc) === 'NO_CADUCA') return 'No caduca';
    if (this.status(doc) === 'SIN_VIGENCIA') return 'Sin vigencia';
    const d = this.days(doc);
    if (d == null) return 'Sin vigencia';
    if (d <= 0) return 'Caducado';
    if (d <= 10) return 'Por caducar';
    if (d <= 30) return 'Próximo por caducar';
    return 'Vigente';
  }

  /** Días restantes calculados hoy (se actualizan solos al abrir la pantalla). */
  vigenciaText(doc: FleetComplianceDoc): string {
    if (!doc.active) return '—';
    const d = this.days(doc);
    if (d == null) {
      return this.status(doc) === 'NO_CADUCA' ? 'No caduca' : '—';
    }
    if (d < 0) {
      const n = Math.abs(d);
      return n === 1 ? 'Vencido hace 1 día' : `Vencido hace ${n} días`;
    }
    if (d === 0) return 'Vence hoy';
    if (d === 1) return '1 día';
    return `${d} días`;
  }

  /**
   * Rojo: ≤ 0 (caducado). Amarillo: 1–10 (por caducar). Verde: ≥ 11 (próximo / vigente).
   */
  statusTone(doc: FleetComplianceDoc): 'ok' | 'warn' | 'err' | 'muted' {
    if (!doc.active) return 'muted';
    const s = this.status(doc);
    if (s === 'NO_CADUCA') return 'ok';
    if (s === 'SIN_VIGENCIA') return 'muted';
    const d = this.days(doc);
    if (d == null) return 'muted';
    if (d <= 0) return 'err';
    if (d <= 10) return 'warn';
    return 'ok';
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  estadoUnidadLabel(): string {
    switch (this.vehicle?.estadoActivo) {
      case 'ACTIVO':
        return 'Activo';
      case 'EN_TALLER':
        return 'En taller';
      case 'DADO_DE_BAJA':
        return 'Fuera de servicio';
      default:
        return this.vehicle?.estadoActivo || '—';
    }
  }

  vehicleTitle(): string {
    const parts = [this.vehicle?.marca, this.vehicle?.modelo, this.vehicle?.tipoVehiculo].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Unidad de flota';
  }

  sectionIcon(code: FleetDocCategory): string {
    if (code === 'CERTIFICACIONES') return 'fa-certificate';
    if (code === 'LIBERACIONES') return 'fa-clipboard-check';
    return 'fa-file-contract';
  }

  deleteDoc(doc: FleetComplianceDoc, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!this.ensureSession()) return;
    if (!confirm(`¿Eliminar "${doc.typeLabel}"? Se quitará del listado y el PDF asociado.`)) return;

    const fileId = doc.attachedFleetDocumentId;
    this.docService.deleteDocument$(this.businessRuc, this.vehicleId, doc.id).subscribe({
      next: ok => {
        if (!ok) {
          alert('No se pudo eliminar el documento.');
          this.cdr.detectChanges();
          return;
        }
        // Borrar archivo suelto para que no reaparezca al recuperar huérfanos
        if (fileId != null) {
          this.fleetService
            .deleteVehicleDocument(this.businessRuc, this.vehicleId, fileId)
            .pipe(catchError(() => of(void 0)))
            .subscribe();
        }
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        alert('No se pudo eliminar el documento.');
        this.cdr.detectChanges();
      }
    });
  }

  hasPdf(doc: FleetComplianceDoc): boolean {
    return !!(doc.attachedFleetDocumentId || (doc.attachedDocumentUrl && doc.attachedDocumentUrl.trim()));
  }

  private pdfFetchUrl(doc: FleetComplianceDoc): string | null {
    if (doc.attachedFleetDocumentId != null) {
      return this.fleetService.vehicleDocumentContentUrl(
        this.businessRuc,
        this.vehicleId,
        doc.attachedFleetDocumentId
      );
    }
    const raw = (doc.attachedDocumentUrl || '').trim();
    if (!raw) return null;
    return this.normalizeFileUrl(raw);
  }

  openPdf(doc: FleetComplianceDoc, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!this.ensureSession()) return;
    const url = this.pdfFetchUrl(doc);
    if (!url) {
      alert('Este registro no tiene PDF adjunto. Edítelo y suba el archivo.');
      return;
    }
    const title = doc.fileName || doc.typeLabel || 'Documento PDF';
    this.closePdfPreview();

    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        if (!blob || blob.size === 0) {
          alert('El PDF está vacío o no se pudo descargar.');
          return;
        }
        const headerType = (resp.headers.get('Content-Type') || '').toLowerCase();
        if (headerType.includes('json') || headerType.includes('text/html')) {
          blob.text().then(t => {
            console.error('PDF respuesta no binaria', t);
            alert('No se pudo abrir el PDF. Reinicie el backend local (endpoint /content).');
          });
          return;
        }
        const typed = new Blob([blob], { type: 'application/pdf' });
        this.pdfBlobUrl = window.URL.createObjectURL(typed);
        this.mountPdfViewerOverlay(title, this.pdfBlobUrl);
      },
      error: err => {
        console.error('Error abriendo PDF', err);
        this.closePdfPreview();
        const status = err?.status;
        if (status === 401 || status === 403) {
          alert('Sesión expirada. Vuelva a iniciar sesión.');
        } else if (status === 404) {
          alert(
            'PDF no encontrado (404). Reinicie el backend local para cargar /documents/{id}/content.'
          );
        } else {
          alert(`No se pudo abrir el PDF (error ${status || 'red'}). ¿Está corriendo el backend?`);
        }
      }
    });
  }

  private normalizeFileUrl(raw: string): string {
    if (!raw) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return '/' + raw.replace(/^\/+/, '');
  }

  closePdfPreview(): void {
    if (this.pdfKeyHandler) {
      document.removeEventListener('keydown', this.pdfKeyHandler);
      this.pdfKeyHandler = null;
    }
    if (this.pdfOverlayEl) {
      try {
        this.renderer.removeChild(document.body, this.pdfOverlayEl);
      } catch {
        /* ignore */
      }
      this.pdfOverlayEl = null;
    }
    if (this.pdfBlobUrl) {
      try {
        URL.revokeObjectURL(this.pdfBlobUrl);
      } catch {
        /* ignore */
      }
      this.pdfBlobUrl = null;
    }
    this.pdfDownloadName = null;
    if (this.bodyOverflowBackup !== null) {
      document.body.style.overflow = this.bodyOverflowBackup;
      this.bodyOverflowBackup = null;
    }
    document.documentElement.style.overflow = '';
  }

  private downloadCurrentPdf(): void {
    if (!this.pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = this.pdfBlobUrl;
    a.download = this.pdfDownloadName || 'documento.pdf';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private mountPdfViewerOverlay(title: string, blobUrl: string, downloadName?: string): void {
    if (this.bodyOverflowBackup === null) {
      this.bodyOverflowBackup = document.body.style.overflow || '';
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const root = this.renderer.createElement('div') as HTMLElement;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      margin: '0',
      padding: '0',
      overflow: 'hidden'
    } as CSSStyleDeclaration);

    root.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#f9fafb;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;font:600 14px/1.3 system-ui,sans-serif;">
            <span style="background:#4648d4;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;">PDF</span>
            <span class="du-pdf-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <button type="button" class="du-pdf-download" title="Descargar PDF"
              style="display:none;border:0;border-radius:6px;background:#4648d4;color:#fff;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
              Descargar
            </button>
            <button type="button" class="du-pdf-close" title="Cerrar (Esc)"
              style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
              ✕ Cerrar
            </button>
          </div>
        </div>
        <div class="du-pdf-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;

    const nameEl = root.querySelector('.du-pdf-name') as HTMLElement;
    nameEl.textContent = title;
    const closeBtn = root.querySelector('.du-pdf-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closePdfPreview());
    const downloadBtn = root.querySelector('.du-pdf-download') as HTMLButtonElement;
    if (downloadName) {
      this.pdfDownloadName = downloadName;
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.addEventListener('click', () => this.downloadCurrentPdf());
    }

    const body = root.querySelector('.du-pdf-body') as HTMLElement;
    // iframe es más compatible que embed en varios navegadores
    const frame = this.renderer.createElement('iframe') as HTMLIFrameElement;
    frame.src = `${blobUrl}#zoom=page-width&toolbar=1&navpanes=0&scrollbar=1`;
    frame.setAttribute('title', title);
    Object.assign(frame.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      border: '0',
      display: 'block',
      background: '#525659'
    } as CSSStyleDeclaration);
    body.appendChild(frame);

    this.pdfOverlayEl = root;
    this.renderer.appendChild(document.body, root);

    this.pdfKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePdfPreview();
      }
    };
    document.addEventListener('keydown', this.pdfKeyHandler);
  }

}
