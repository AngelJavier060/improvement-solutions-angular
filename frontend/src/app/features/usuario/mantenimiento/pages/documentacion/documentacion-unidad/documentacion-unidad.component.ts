import { Component, OnDestroy, OnInit, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
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
  private docSub?: Subscription;
  private routeSub?: Subscription;

  private pdfBlobUrl: string | null = null;
  private pdfOverlayEl: HTMLElement | null = null;
  private pdfKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private bodyOverflowBackup: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService,
    private docService: FleetDocumentationService,
    private http: HttpClient,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.docSub = this.docService.changes$.subscribe(() => this.cdr.markForCheck());
    this.routeSub = this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('vehicleId') || '');
      this.vehicleId = id;
      this.businessRuc = activeBusinessRuc(this.route);
      if (!this.businessRuc || !Number.isFinite(id) || id <= 0) {
        this.error = 'Unidad no válida.';
        this.loading = false;
        return;
      }
      this.docService.initForRuc(this.businessRuc);
      this.loadVehicleAndDocs();
    });
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
      files: this.fleetService.listVehicleDocuments(ruc, vid).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ vehicle, files }) => {
        this.vehicle = vehicle;
        // PDFs subidos sin fila de compliance (p. ej. registros previos solo en localStorage de otro navegador)
        this.docService.importOrphanFiles(ruc, vid, files || []);
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

  filteredDocs(): FleetComplianceDoc[] {
    const all = this.docService.getDocuments(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      d =>
        (d.typeLabel || '').toLowerCase().includes(q) ||
        (d.referenceId || '').toLowerCase().includes(q) ||
        (d.typeCode || '').toLowerCase().includes(q) ||
        (d.entidadRemitenteName || '').toLowerCase().includes(q)
    );
  }

  sections(): DocSection[] {
    const docs = this.filteredDocs();
    return FLEET_DOC_CATEGORIES.map(c => ({
      code: c.code,
      label: c.label,
      docs: docs.filter(d => normalizeFleetDocCategory(d.docCategory) === c.code)
    }));
  }

  status(doc: FleetComplianceDoc) {
    return this.docService.complianceStatusForDoc(doc);
  }

  days(doc: FleetComplianceDoc): number | null {
    return this.docService.daysToExpiry(doc.expiryDate);
  }

  statusText(doc: FleetComplianceDoc): string {
    if (!doc.active) return 'Inactivo';
    const s = this.status(doc);
    const d = this.days(doc);
    if (s === 'VENCIDO') return 'Vencido';
    if (s === 'PROXIMO') return d != null ? `Por Vencer (${d} días)` : 'Por Vencer';
    if (s === 'NO_CADUCA') return 'No caduca';
    if (s === 'SIN_VIGENCIA') return 'Sin vigencia';
    return 'Vigente';
  }

  statusTone(doc: FleetComplianceDoc): 'ok' | 'warn' | 'err' | 'muted' {
    if (!doc.active) return 'muted';
    const s = this.status(doc);
    if (s === 'VENCIDO') return 'err';
    if (s === 'PROXIMO') return 'warn';
    if (s === 'VIGENTE' || s === 'NO_CADUCA') return 'ok';
    return 'muted';
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

  deleteDoc(doc: FleetComplianceDoc): void {
    if (!confirm(`¿Eliminar del listado activo "${doc.typeLabel}"? Quedará en el historial.`)) return;
    this.docService.deleteDocument$(this.businessRuc, this.vehicleId, doc.id).subscribe({
      next: ok => {
        if (!ok) {
          alert('No se pudo eliminar el documento.');
          return;
        }
        // Recargar desde servidor para asegurar UI consistente
        this.docService.syncVehicleFromServer(this.businessRuc, this.vehicleId).subscribe({
          next: () => this.cdr.markForCheck(),
          error: () => this.cdr.markForCheck()
        });
      },
      error: () => alert('No se pudo eliminar el documento.')
    });
  }

  irHistorial(): void {
    this.router.navigate([
      '/usuario',
      this.businessRuc,
      'mantenimiento',
      'documentacion',
      'unidad',
      this.vehicleId,
      'historial'
    ]);
  }

  irRegistro(doc?: FleetComplianceDoc, category?: FleetDocCategory): void {
    const base = [
      '/usuario',
      this.businessRuc,
      'mantenimiento',
      'documentacion',
      'unidad',
      this.vehicleId,
      'registro'
    ];
    if (doc) {
      this.router.navigate(base, { queryParams: { docId: doc.id } });
    } else if (category) {
      this.router.navigate(base, { queryParams: { category } });
    } else {
      this.router.navigate(base);
    }
  }

  hasPdf(doc: FleetComplianceDoc): boolean {
    return !!(doc.attachedFleetDocumentId || (doc.attachedDocumentUrl && doc.attachedDocumentUrl.trim()));
  }

  /** URL autenticada preferida para ver el PDF de flota. */
  private pdfFetchUrl(doc: FleetComplianceDoc): string | null {
    if (doc.attachedFleetDocumentId != null) {
      return `/api/fleet/${encodeURIComponent(this.businessRuc)}/vehicles/${this.vehicleId}/documents/${doc.attachedFleetDocumentId}/content`;
    }
    const raw = (doc.attachedDocumentUrl || '').trim();
    if (!raw) return null;
    return this.normalizeFileUrl(raw);
  }

  openPdf(doc: FleetComplianceDoc): void {
    const url = this.pdfFetchUrl(doc);
    if (!url) {
      alert('Este registro no tiene PDF adjunto.');
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
        // Si el backend devolvió JSON de error como blob, avisamos
        const headerType = (resp.headers.get('Content-Type') || '').toLowerCase();
        if (headerType.includes('json') || headerType.includes('text/html')) {
          alert('No se pudo abrir el PDF (respuesta inválida del servidor).');
          return;
        }
        const mime =
          headerType.includes('pdf') || title.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf')
            ? 'application/pdf'
            : headerType.startsWith('image/')
              ? headerType
              : 'application/pdf';
        const typed = new Blob([blob], { type: mime });
        this.pdfBlobUrl = window.URL.createObjectURL(typed);
        this.mountPdfViewerOverlay(title, this.pdfBlobUrl);
      },
      error: err => {
        console.error('Error abriendo PDF', err);
        this.closePdfPreview();
        const status = err?.status;
        if (status === 401 || status === 403) {
          alert('Sesión expirada. Vuelva a iniciar sesión para ver el PDF.');
        } else if (status === 404) {
          alert('No se encontró el archivo PDF en el servidor.');
        } else {
          alert('No se pudo abrir el PDF. Verifique su sesión e intente de nuevo.');
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
    if (this.bodyOverflowBackup !== null) {
      document.body.style.overflow = this.bodyOverflowBackup;
      this.bodyOverflowBackup = null;
    }
    document.documentElement.style.overflow = '';
  }

  private mountPdfViewerOverlay(title: string, blobUrl: string): void {
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
          <button type="button" class="du-pdf-close" title="Cerrar (Esc)"
            style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
            ✕ Cerrar
          </button>
        </div>
        <div class="du-pdf-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;

    const nameEl = root.querySelector('.du-pdf-name') as HTMLElement;
    nameEl.textContent = title;
    const closeBtn = root.querySelector('.du-pdf-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closePdfPreview());

    const body = root.querySelector('.du-pdf-body') as HTMLElement;
    const embed = this.renderer.createElement('embed') as HTMLEmbedElement;
    embed.type = 'application/pdf';
    embed.src = `${blobUrl}#zoom=page-width&toolbar=1&navpanes=0&scrollbar=1`;
    embed.setAttribute('title', title);
    Object.assign(embed.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      border: '0',
      display: 'block',
      background: '#525659'
    } as CSSStyleDeclaration);
    body.appendChild(embed);

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

  volverLista(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion']);
  }
}
