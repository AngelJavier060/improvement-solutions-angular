import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DocumentService, EmployeeDocumentResponse, CreateEmployeeDocumentRequest } from '../services/document.service';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';

@Component({
  selector: 'app-employee-documents',
  templateUrl: './employee-documents.component.html',
  styleUrls: ['./employee-documents.component.scss']
})
export class EmployeeDocumentsComponent implements OnInit, OnChanges {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Output() changed = new EventEmitter<void>();

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
  // Mostrar histórico
  showHistory = false;
  // Formulario de renovación (modal independiente)
  showRenewForm = false;
  renewSaving = false;
  renewStartDate: string = '';
  renewEndDate: string = '';
  renewDescription: string = '';
  renewFiles: File[] = [];
  renewFileError: string | null = null;
  renewTypeName: string = '';

  constructor(
    private documentService: DocumentService,
    private tipoDocumentoService: TipoDocumentoService,
    private http: HttpClient
  ) {}

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
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading documents', err);
        this.loading = false;
      }
    });
  }

  // Lista visible según "Ver histórico":
  // - Histórico OFF: mostrar SOLO el último registro por tipo de documento (por id), y ocultar caducados (o usar active=true si viene del backend)
  // - Histórico ON: mostrar SOLO históricos (active=false) o, si no hay bandera, solo caducados
  filteredDocuments(): EmployeeDocumentResponse[] {
    const items = this.documents || [];
    if (this.showHistory) {
      const hasActive = items.some(d => (d as any).active !== undefined);
      if (hasActive) {
        return items.filter(d => (d as any).active === false);
      }
      return items.filter(d => this.getExpiryStatus(d.end_date) === 'Caducado');
    }

    // Si el backend envía la bandera 'active', usarla como fuente de verdad
    const hasActive = items.some(d => (d as any).active !== undefined);
    if (hasActive) {
      return items.filter(d => (d as any).active !== false);
    }

    // Fallback: elegir el último por tipo y ocultar caducados
    const score = (d: EmployeeDocumentResponse): number => {
      const toTs = (s?: string) => {
        if (!s) return Number.NEGATIVE_INFINITY;
        const t = new Date(s as string).getTime();
        return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
      };
      const exp = toTs(d.end_date);
      if (exp !== Number.NEGATIVE_INFINITY) return exp;
      return toTs(d.start_date);
    };

    const byType = new Map<number, EmployeeDocumentResponse>();
    for (const d of items) {
      const id = ((d as any)?.type_document?.id ?? -1) as number;
      const prev = byType.get(id);
      if (!prev || score(d) > score(prev)) {
        byType.set(id, d);
      }
    }

    const latest = Array.from(byType.values());
    const visible = latest.filter(d => this.getExpiryStatus(d.end_date) !== 'Caducado');
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

  // Abrir archivo con token (evitar 401 en enlaces directos)
  openFile(file: { file: string; file_name?: string }): void {
    const url = file.file;
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
        const blobWithType = new Blob([blob], { type: contentType });
        const fileName = file.file_name || this.extractFileNameFromUrl(url);
        const blobUrl = window.URL.createObjectURL(blobWithType);
        // Abrir en nueva pestaña si es visualizable
        const isViewable = contentType.startsWith('application/pdf') || contentType.startsWith('image/');
        if (isViewable) {
          window.open(blobUrl, '_blank');
        } else {
          // Forzar descarga
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName || 'documento';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        // Liberar URL después de un tiempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      },
      error: (err) => {
        console.error('Error abriendo archivo', err);
        alert('No se pudo abrir el archivo');
      }
    });
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
    if (status === 'Caducado') return 'bg-danger';
    if (status === 'Próximo a vencer') return 'bg-warning text-dark';
    if (status === 'Vigente') return 'bg-success';
    return 'bg-secondary';
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
  }

  closeRenewConfirm(): void {
    this.showRenewConfirm = false;
    this.renewTarget = null;
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
