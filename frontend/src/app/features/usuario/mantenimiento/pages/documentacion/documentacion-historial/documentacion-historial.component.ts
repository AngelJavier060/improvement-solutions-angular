import { Component, OnDestroy, OnInit, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc, FleetDocHistoryEntry } from '../../../../../../models/fleet-documentation.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

@Component({
  selector: 'app-documentacion-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documentacion-historial.component.html',
  styleUrls: ['./documentacion-historial.component.scss']
})
export class DocumentacionHistorialComponent implements OnInit, OnDestroy {
  businessRuc = '';
  vehicleId = 0;
  vehicle: Vehicle | null = null;
  loading = true;
  error = '';
  search = '';
  private docSub?: Subscription;
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
    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('vehicleId') || '');
      this.vehicleId = id;
      this.businessRuc = activeBusinessRuc(this.route);
      if (!this.businessRuc || !Number.isFinite(id) || id <= 0) {
        this.error = 'Unidad no válida.';
        this.loading = false;
        return;
      }
      this.docService.initForRuc(this.businessRuc);
      this.loadVehicle();
    });
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
    this.closePdfPreview();
  }

  private loadVehicle(): void {
    this.loading = true;
    this.docService.initForRuc(this.businessRuc);
    this.fleetService.getVehicleById(this.businessRuc, this.vehicleId).subscribe({
      next: v => {
        this.vehicle = v;
        this.docService.syncVehicleFromServer(this.businessRuc, this.vehicleId).subscribe({
          next: () => {
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la unidad.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  entries(): FleetDocHistoryEntry[] {
    const all = this.docService.getHistoryTimeline(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(e => {
      const s = e.snapshot;
      return (
        (s.typeLabel || '').toLowerCase().includes(q) ||
        (s.entidadRemitenteName || '').toLowerCase().includes(q) ||
        (s.referenceId || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q) ||
        this.actionLabel(e).toLowerCase().includes(q)
      );
    });
  }

  actionLabel(e: FleetDocHistoryEntry): string {
    const note = (e.note || '').toLowerCase();
    if (note.includes('renov')) return 'Renovación';
    if (e.action === 'UPDATED') return 'Actualización';
    if (e.action === 'DELETED') return 'Eliminación';
    return e.action;
  }

  actionBadgeClass(e: FleetDocHistoryEntry): string {
    if (e.action === 'DELETED') return 'doc-badge doc-badge--vencido';
    if ((e.note || '').toLowerCase().includes('renov')) return 'doc-badge doc-badge--proximo';
    if (e.action === 'UPDATED') return 'doc-badge doc-badge--proximo';
    return 'doc-badge doc-badge--neutral';
  }

  actionIcon(e: FleetDocHistoryEntry): string {
    if (e.action === 'DELETED') return 'fa-trash-alt';
    if ((e.note || '').toLowerCase().includes('renov')) return 'fa-sync-alt';
    return 'fa-file-alt';
  }

  snapshotStatus(s: FleetComplianceDoc): string {
    if (s.historicMode || s.active === false) return 'Archivado';
    const st = this.docService.complianceStatusForDoc(s);
    if (st === 'VENCIDO') return 'Vencido';
    if (st === 'PROXIMO') return 'Próximo';
    if (st === 'NO_CADUCA') return 'No caduca';
    if (st === 'SIN_VIGENCIA') return 'Sin vigencia';
    return 'Vigente';
  }

  snapshotBadgeClass(s: FleetComplianceDoc): string {
    if (s.historicMode || s.active === false) return 'doc-badge doc-badge--neutral';
    const st = this.docService.complianceStatusForDoc(s);
    if (st === 'VENCIDO') return 'doc-badge doc-badge--vencido';
    if (st === 'PROXIMO') return 'doc-badge doc-badge--proximo';
    if (st === 'NO_CADUCA') return 'doc-badge doc-badge--neutral';
    return 'doc-badge doc-badge--vigente';
  }

  period(s: FleetComplianceDoc): string {
    const a = this.fmt(s.issueDate);
    const b = s.expiryDate ? this.fmt(s.expiryDate) : '—';
    return `${a} – ${b}`;
  }

  private fmt(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' });
  }

  changedAt(e: FleetDocHistoryEntry): string {
    const d = new Date(e.changedAt);
    return isNaN(d.getTime()) ? e.changedAt : d.toLocaleString('es-EC');
  }

  volverUnidad(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', this.vehicleId]);
  }

  hasPdf(doc: FleetComplianceDoc): boolean {
    return !!(doc.attachedFleetDocumentId || (doc.attachedDocumentUrl && doc.attachedDocumentUrl.trim()));
  }

  openPdf(doc: FleetComplianceDoc, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    const url = this.pdfFetchUrl(doc);
    if (!url) {
      alert('Esta versión no tiene PDF adjunto.');
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
          alert('No se pudo abrir el PDF. Compruebe que su sesión siga activa.');
          return;
        }
        const typed = new Blob([blob], { type: 'application/pdf' });
        this.pdfBlobUrl = window.URL.createObjectURL(typed);
        this.mountPdfViewerOverlay(title, this.pdfBlobUrl);
      },
      error: err => {
        console.error('Error abriendo PDF del historial', err);
        this.closePdfPreview();
        const status = err?.status;
        if (status === 401 || status === 403) {
          alert('Sesión expirada. Vuelva a iniciar sesión para ver el PDF.');
        } else if (status === 404) {
          alert('PDF no encontrado. El archivo de esa versión ya no está en el servidor.');
        } else {
          alert(`No se pudo abrir el PDF (error ${status || 'red'}).`);
        }
      }
    });
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
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : '/' + raw.replace(/^\/+/, '');
  }

  private closePdfPreview(): void {
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
      overflow: 'hidden'
    } as CSSStyleDeclaration);

    root.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#f9fafb;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;font:600 14px/1.3 system-ui,sans-serif;">
            <span style="background:#4648d4;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;">PDF</span>
            <span class="dh-pdf-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          </div>
          <button type="button" class="dh-pdf-close" title="Cerrar (Esc)"
            style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
            ✕ Cerrar
          </button>
        </div>
        <div class="dh-pdf-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;

    (root.querySelector('.dh-pdf-name') as HTMLElement).textContent = title;
    (root.querySelector('.dh-pdf-close') as HTMLButtonElement).addEventListener('click', () => this.closePdfPreview());

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
    (root.querySelector('.dh-pdf-body') as HTMLElement).appendChild(frame);

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
