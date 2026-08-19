import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter,
  Renderer2, HostListener, ViewChild, TemplateRef, ViewContainerRef
} from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DocumentService, EmployeeDocumentResponse, CreateEmployeeDocumentRequest } from '../services/document.service';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';

@Component({
  selector: 'app-employee-documents',
  templateUrl: './employee-documents.component.html',
  styleUrls: ['./employee-documents.component.scss']
})
export class EmployeeDocumentsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Output() changed = new EventEmitter<void>();

  @ViewChild('renewConfirmTpl') renewConfirmTpl!: TemplateRef<unknown>;
  @ViewChild('renewFormTpl') renewFormTpl!: TemplateRef<unknown>;

  documents: EmployeeDocumentResponse[] = [];
  docTypes: Array<{ id: number; name: string }> = [];

  loading = false;
  saving = false;
  error: string | null = null;

  // Form inputs
  selectedDocTypeId: string = '';
  description: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedFiles: File[] = [];
  fileError: string | null = null;

  // Confirmación de renovación
  showRenewConfirm = false;
  renewTarget: EmployeeDocumentResponse | null = null;
  // Formulario de renovación (modal independiente)
  showRenewForm = false;
  renewSaving = false;
  renewStartDate: string = '';
  renewEndDate: string = '';
  renewDescription: string = '';
  renewFiles: File[] = [];
  renewFileError: string | null = null;
  renewTypeName: string = '';

  /** Overlay montado en document.body (evita titileo del iframe dentro del layout) */
  private pdfOverlayEl: HTMLElement | null = null;
  private pdfBlobUrl: string | null = null;
  private pdfKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private bodyOverflowBackup: string | null = null;
  /** Modales Renovar fuera del overflow:hidden del layout */
  private renewOverlayRef: OverlayRef | null = null;

  constructor(
    private documentService: DocumentService,
    private tipoDocumentoService: TipoDocumentoService,
    private http: HttpClient,
    private renderer: Renderer2,
    private overlay: Overlay,
    private vcr: ViewContainerRef
  ) {}

  @HostListener('document:keydown.escape')
  onEscapeModals(): void {
    if (this.showPdfOverlayOpen()) {
      this.closePdfPreview();
      return;
    }
    if (this.showRenewForm) {
      this.cancelRenewForm();
      return;
    }
    if (this.showRenewConfirm) {
      this.closeRenewConfirm();
    }
  }

  private showPdfOverlayOpen(): boolean {
    return !!this.pdfOverlayEl;
  }

  ngOnInit(): void {
    this.loadDocTypes();
    this.loadDocuments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] || changes['employeeCedula']) {
      this.loadDocuments();
    }
  }

  loadDocTypes(): void {
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (types) => {
        this.docTypes = (types || []).map((t: any) => ({ id: t.id, name: t.name }));
      },
      error: (err) => {
        console.error('Error loading doc types', err);
      }
    });
  }

  loadDocuments(): void {
    // Preferir consulta por ID de empleado de negocio si está disponible (preciso multi-empresa)
    this.loading = true;
    // Siempre pedir con histórico para garantizar que el backend devuelva caducados; el filtrado visible lo maneja filteredDocuments()
    const obs = this.employeeId
      ? this.documentService.getByBusinessEmployeeId(this.employeeId, true)
      : (this.employeeCedula ? this.documentService.getByEmployeeCedula(this.employeeCedula, true) : null);
    if (!obs) { this.loading = false; return; }
    obs.subscribe({
      next: (docs) => {
        this.documents = docs || [];
        this.syncSelectedDocType();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading documents', err);
        this.loading = false;
      }
    });
  }

  /** Tipos que aún no tienen un documento vigente (no histórico) para este empleado. */
  availableDocTypes(): Array<{ id: number; name: string }> {
    const used = new Set<number>();
    for (const d of this.currentActiveDocuments()) {
      const id = Number(d?.type_document?.id);
      if (!Number.isNaN(id) && id > 0) used.add(id);
    }
    return (this.docTypes || []).filter(t => !used.has(Number(t.id)));
  }

  private currentActiveDocuments(): EmployeeDocumentResponse[] {
    const items = this.documents || [];
    const hasActive = items.some(d => (d as any).active !== undefined);
    if (hasActive) {
      return items.filter(d => (d as any).active !== false);
    }
    const latestByType = new Map<number, EmployeeDocumentResponse>();
    for (const d of items) {
      const id = Number((d as any)?.type_document?.id ?? -1);
      const prev = latestByType.get(id);
      if (!prev || this.documentScore(d) > this.documentScore(prev)) {
        latestByType.set(id, d);
      }
    }
    return Array.from(latestByType.values())
      .filter(d => this.getExpiryStatus(d.end_date) !== 'Caducado');
  }

  private syncSelectedDocType(): void {
    if (!this.selectedDocTypeId) return;
    const stillAvailable = this.availableDocTypes()
      .some(t => String(t.id) === String(this.selectedDocTypeId));
    if (!stillAvailable) this.selectedDocTypeId = '';
  }

  private documentScore(d: EmployeeDocumentResponse): number {
    const toTs = (s?: string) => {
      if (!s) return Number.NEGATIVE_INFINITY;
      const t = new Date(s as string).getTime();
      return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
    };
    const exp = toTs(d.end_date);
    if (exp !== Number.NEGATIVE_INFINITY) return exp;
    return toTs(d.start_date);
  }

  // Lista vigente: último registro activo por tipo. El histórico vive en la pestaña Histórico.
  filteredDocuments(): EmployeeDocumentResponse[] {
    const visible = [...this.currentActiveDocuments()];
    visible.sort((a, b) => ((a as any)?.type_document?.name || '').localeCompare(((b as any)?.type_document?.name || '')));
    return visible;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const files = Array.from(input.files);
      const pdfs = files.filter(f => (f.type || '').toLowerCase() === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      const rejected = files.length - pdfs.length;
      this.selectedFiles = pdfs;
      this.fileError = rejected > 0 ? `Se rechazaron ${rejected} archivo(s) no PDF.` : null;
    }
  }

  clearForm(): void {
    this.selectedDocTypeId = '';
    this.description = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedFiles = [];
  }

  createDocument(): void {
    // Validaciones UI
    if (!this.employeeId) {
      this.error = 'No se pudo determinar el empleado. Recargue la página.';
      return;
    }
    if (!this.selectedDocTypeId) {
      this.error = 'Seleccione un tipo de documento.';
      return;
    }
    const typeStillAvailable = this.availableDocTypes()
      .some(t => String(t.id) === String(this.selectedDocTypeId));
    if (!typeStillAvailable) {
      this.error = 'Este tipo de documento ya está registrado para el empleado. Elimínelo o renuévelo.';
      this.syncSelectedDocType();
      return;
    }
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      this.error = 'Adjunte al menos un archivo PDF.';
      return;
    }
    // Validación fechas (opcional: start <= end)
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.error = 'La fecha de emisión no puede ser posterior a la fecha de expiración.';
      return;
    }
    this.saving = true;
    this.error = null;

    const payload: CreateEmployeeDocumentRequest = {
      business_employee_id: this.employeeId,
      type_document_id: Number(this.selectedDocTypeId),
      start_date: this.startDate || undefined,
      end_date: this.endDate || undefined,
      description: this.description || undefined,
      files: this.selectedFiles && this.selectedFiles.length ? this.selectedFiles : undefined
    };

    this.documentService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.clearForm();
        this.loadDocuments();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creating document', err);
        const serverMsg = (err?.error && (err.error.message || err.error.error || (typeof err.error === 'string' ? err.error : null))) || err?.message;
        this.error = serverMsg ? `Error al crear documento: ${serverMsg}` : 'No se pudo crear el documento';
        this.saving = false;
      }
    });
  }

  deleteDocument(doc: EmployeeDocumentResponse): void {
    if (!confirm('¿Eliminar este documento?')) return;
    this.documentService.delete(doc.id).subscribe({
      next: () => { this.loadDocuments(); this.changed.emit(); },
      error: (err) => console.error('Error deleting document', err)
    });
  }

  /**
   * Ver PDF sin descargar: UNA sola vista a pantalla completa con ✕ Cerrar.
   * No abre pestaña nueva. Los datos del trabajador se mantienen detrás.
   */
  openFile(file: { file: string; file_name?: string; file_type?: string }): void {
    const rawUrl = file?.file || '';
    const url = this.normalizeFileUrlForView(rawUrl);
    const fileName = file.file_name || this.extractFileNameFromUrl(url);
    const looksPdf =
      (file.file_type || '').toLowerCase().includes('pdf') ||
      fileName.toLowerCase().endsWith('.pdf') ||
      url.toLowerCase().includes('.pdf');

    this.closePdfPreview();

    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        const headerType = (resp.headers.get('Content-Type') || '').toLowerCase();
        const mime = looksPdf || headerType.includes('pdf')
          ? 'application/pdf'
          : (headerType.startsWith('image/') ? headerType : 'application/pdf');
        const typed = new Blob([blob], { type: mime });
        this.pdfBlobUrl = window.URL.createObjectURL(typed);
        this.mountPdfViewerOverlay(fileName || 'Documento PDF', this.pdfBlobUrl);
      },
      error: (err) => {
        console.error('Error abriendo archivo', err);
        this.closePdfPreview();
        alert('No se pudo abrir el archivo');
      }
    });
  }

  closePdfPreview(): void {
    if (this.pdfKeyHandler) {
      document.removeEventListener('keydown', this.pdfKeyHandler);
      this.pdfKeyHandler = null;
    }
    if (this.pdfOverlayEl) {
      try { this.renderer.removeChild(document.body, this.pdfOverlayEl); } catch { /* ignore */ }
      this.pdfOverlayEl = null;
    }
    if (this.pdfBlobUrl) {
      try { URL.revokeObjectURL(this.pdfBlobUrl); } catch { /* ignore */ }
      this.pdfBlobUrl = null;
    }
    this.unlockBodyScroll();
  }

  private mountPdfViewerOverlay(title: string, blobUrl: string): void {
    this.lockBodyScroll();
    const root = this.createPdfShell(title);
    const body = root.querySelector('.ed-pdf-body') as HTMLElement;

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
      margin: '0',
      padding: '0',
      display: 'block',
      background: '#525659'
    } as CSSStyleDeclaration);
    body.appendChild(embed);

    this.pdfOverlayEl = root;
    this.renderer.appendChild(document.body, root);
    this.bindPdfEscape();
  }

  private createPdfShell(title: string): HTMLElement {
    // Estilos inline: el overlay vive en document.body (fuera del encapsulado Angular)
    const root = this.renderer.createElement('div') as HTMLElement;
    root.className = 'ed-pdf-overlay';
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
      overflow: 'hidden',
      overscrollBehavior: 'none'
    } as CSSStyleDeclaration);

    root.innerHTML = `
      <div class="ed-pdf-shell" style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div class="ed-pdf-bar" style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#f9fafb;border-bottom:1px solid rgba(255,255,255,.08);">
          <div class="ed-pdf-title" style="display:flex;align-items:center;gap:10px;min-width:0;font:600 14px/1.3 system-ui,sans-serif;">
            <span class="ed-pdf-icon" style="background:#4648d4;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;">PDF</span>
            <span class="ed-pdf-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          </div>
          <button type="button" class="ed-pdf-close" title="Cerrar (Esc)"
            style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
            ✕ Cerrar
          </button>
        </div>
        <div class="ed-pdf-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;

    const nameEl = root.querySelector('.ed-pdf-name') as HTMLElement;
    nameEl.textContent = title;
    const closeBtn = root.querySelector('.ed-pdf-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closePdfPreview());
    return root;
  }

  private bindPdfEscape(): void {
    if (this.pdfKeyHandler) {
      document.removeEventListener('keydown', this.pdfKeyHandler);
    }
    this.pdfKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePdfPreview();
      }
    };
    document.addEventListener('keydown', this.pdfKeyHandler);
  }

  private lockBodyScroll(): void {
    if (this.bodyOverflowBackup === null) {
      this.bodyOverflowBackup = document.body.style.overflow || '';
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.bodyOverflowBackup !== null) {
      document.body.style.overflow = this.bodyOverflowBackup;
      this.bodyOverflowBackup = null;
    }
    document.documentElement.style.overflow = '';
  }

  ngOnDestroy(): void {
    this.closePdfPreview();
    this.closeRenewOverlay();
  }

  /** Evita endpoints de descarga forzada; sirve el archivo en modo inline. */
  private normalizeFileUrlForView(raw: string): string {
    try {
      let rel = String(raw || '').replace(/\\/g, '/').trim();
      if (!rel) return '/api/files/unknown.pdf';
      if (/^https?:\/\//i.test(rel)) {
        return rel.replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('/api/files/download/')) {
        return rel.replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('api/files/download/')) {
        return ('/' + rel).replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('api/')) return `/${rel}`;
      rel = rel.replace(/^\.\/+/, '');
      if (rel.startsWith('/')) rel = rel.substring(1);
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      return `/api/files/${rel}`;
    } catch {
      return '/api/files/unknown.pdf';
    }
  }

  private extractFileNameFromUrl(url: string): string {
    try {
      const lastSlash = url.lastIndexOf('/')
      if (lastSlash >= 0) {
        return url.substring(lastSlash + 1);
      }
      return url;
    } catch {
      return 'documento';
    }
  }

  // === Helpers de vigencia ===
  getDaysLeft(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const end = new Date(dateStr as string);
      if (isNaN(end.getTime())) return '-';
      const today = new Date();
      // normalizar a medianoche para evitar off-by-one por hora
      end.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffMs = end.getTime() - today.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return String(days);
    } catch {
      return '-';
    }
  }

  getExpiryStatus(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const v = Number(this.getDaysLeft(dateStr));
    if (isNaN(v)) return '-';
    if (v < 0) return 'Caducado';
    if (v <= 30) return 'Próximo a vencer';
    return 'Vigente';
  }

  getExpiryBadgeClass(dateStr?: string | null): string {
    const status = this.getExpiryStatus(dateStr);
    if (status === 'Caducado') return 'is-expired';
    if (status === 'Próximo a vencer') return 'is-soon';
    if (status === 'Vigente') return 'is-ok';
    return 'is-muted';
  }

  // === Renovación ===
  renewDocument(doc: EmployeeDocumentResponse): void {
    try {
      // Preconfigurar el formulario para renovar el mismo tipo de documento
      this.selectedDocTypeId = String(doc?.type_document?.id ?? '');
      // Sugerir descripción
      const typeName = doc?.type_document?.name || 'Documento';
      this.description = `Renovación de ${typeName}`;
      // Sugerir fecha de emisión = hoy; dejar expiración a elección del usuario
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.startDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.endDate = '';
      this.selectedFiles = [];
      this.error = null;
      // Llevar el foco al botón/área de subida
      setTimeout(() => {
        const btn = document.querySelector('button.btn.btn-primary');
        (btn as HTMLButtonElement | null)?.focus();
      }, 0);
    } catch (e) {
      console.error('Error preparando renovación', e);
    }
  }

  openRenewConfirm(doc: EmployeeDocumentResponse): void {
    this.renewTarget = doc;
    this.showRenewConfirm = true;
    this.showRenewForm = false;
    // Esperar un tick para que ViewChild del template esté listo
    setTimeout(() => this.openRenewOverlay(this.renewConfirmTpl, () => this.closeRenewConfirm()), 0);
  }

  closeRenewConfirm(): void {
    this.showRenewConfirm = false;
    if (!this.showRenewForm) {
      this.renewTarget = null;
      this.closeRenewOverlay();
    }
  }

  confirmRenew(): void {
    // Abrir modal de formulario de renovación sin tocar el formulario principal
    if (this.renewTarget) {
      this.renewTypeName = this.renewTarget.type_document?.name || 'Documento';
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.renewStartDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.renewEndDate = '';
      this.renewDescription = `Renovación de ${this.renewTypeName}`;
      this.renewFiles = [];
      this.renewFileError = null;
    }
    this.showRenewConfirm = false;
    this.showRenewForm = true;
    setTimeout(() => this.openRenewOverlay(this.renewFormTpl, () => this.cancelRenewForm()), 0);
  }

  onRenewFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const files = Array.from(input.files);
      const pdfs = files.filter(f => (f.type || '').toLowerCase() === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      const rejected = files.length - pdfs.length;
      this.renewFiles = pdfs;
      this.renewFileError = rejected > 0 ? `Se rechazaron ${rejected} archivo(s) no PDF.` : null;
    }
  }

  cancelRenewForm(): void {
    this.showRenewForm = false;
    this.renewSaving = false;
    this.renewStartDate = '';
    this.renewEndDate = '';
    this.renewDescription = '';
    this.renewFiles = [];
    this.renewFileError = null;
    this.renewTypeName = '';
    this.renewTarget = null;
    this.closeRenewOverlay();
  }

  /** Abre el modal en document.body (fuera del recuadro con overflow:hidden). */
  private openRenewOverlay(tpl: TemplateRef<unknown> | undefined, onBackdrop: () => void): void {
    if (!tpl) return;
    this.closeRenewOverlay();
    this.renewOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'ed-renew-backdrop',
      panelClass: 'ed-renew-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh'
    });
    this.renewOverlayRef.attach(new TemplatePortal(tpl, this.vcr));
    this.renewOverlayRef.backdropClick().subscribe(() => onBackdrop());
  }

  private closeRenewOverlay(): void {
    if (this.renewOverlayRef) {
      try { this.renewOverlayRef.dispose(); } catch { /* ignore */ }
      this.renewOverlayRef = null;
    }
  }

  submitRenewal(): void {
    if (!this.employeeId || !this.renewTarget) return;
    if (!this.renewFiles || this.renewFiles.length === 0) {
      this.renewFileError = 'Adjunte al menos un archivo PDF.';
      return;
    }
    if (this.renewStartDate && this.renewEndDate && this.renewStartDate > this.renewEndDate) {
      this.renewFileError = 'La fecha de emisión no puede ser posterior a la fecha de expiración.';
      return;
    }
    this.renewSaving = true;
    const payload: CreateEmployeeDocumentRequest = {
      business_employee_id: this.employeeId,
      type_document_id: Number(this.renewTarget.type_document?.id),
      start_date: this.renewStartDate || undefined,
      end_date: this.renewEndDate || undefined,
      description: this.renewDescription || undefined,
      files: this.renewFiles
    };
    this.documentService.create(payload).subscribe({
      next: () => {
        this.renewSaving = false;
        this.cancelRenewForm();
        this.loadDocuments();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creando renovación', err);
        this.renewSaving = false;
        this.renewFileError = 'No se pudo completar la renovación.';
      }
    });
  }
}
