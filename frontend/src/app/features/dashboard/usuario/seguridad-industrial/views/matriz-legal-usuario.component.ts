import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { BusinessObligationMatrixService } from '../../../../../services/business-obligation-matrix.service';
import { ApprovalService } from '../../../../../services/approval.service';
import { NotificationService } from '../../../../../services/notification.service';

@Component({
  selector: 'app-matriz-legal-usuario',
  templateUrl: './matriz-legal-usuario.component.html',
  styleUrls: ['./matriz-legal-usuario.component.scss']
})
export class MatrizLegalUsuarioComponent implements OnInit {
  ruc: string | null = null;
  inicioLink: any[] = ['/'];
  obligaciones: any[] = [];
  qrMode = false;
  qrEmployeeId: string | null = null;
  private qrOpening = false;
  loading = false;
  error: string | null = null;
  catalogoMatrices: any[] = [];
  businessId: number | null = null;
  filesMap: Record<number, any[]> = {};
  filesLoading: Record<number, boolean> = {};
  uploading: Record<number, boolean> = {};
  openRows: Record<number, boolean> = {};
  fileCountMap: Record<number, number> = {};
  // URL local para vista previa cuando el backend no permite subir (403)
  localPreviewUrl: Record<number, string | null> = {};
  statusToggleLoading: Record<number, boolean> = {};
  editRow: Record<number, boolean> = {};
  editModel: Record<number, any> = {};
  savingRow: Record<number, boolean> = {};
  priorityOptions: string[] = ['ALTA', 'MEDIA', 'BAJA'];
  // Modal de confirmación
  confirmVisible = false;
  confirmItemId: number | null = null;
  // Sidebar state
  isCollapsed = false;
  // Dropdown de PDFs
  pdfDropdownOpen: Record<number, boolean> = {};
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 15;
  Math = Math; // Exponer Math al template
  // Tag definido por admin en descripción del archivo para mostrar al usuario
  private PUBLIC_TAG = '[PUBLIC]';

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private obligationCatalogService: ObligationMatrixService,
    private bomService: BusinessObligationMatrixService,
    private approvalService: ApprovalService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    const qrRaw = this.route.snapshot.queryParamMap.get('qr');
    this.qrMode = qrRaw === '1' || qrRaw === 'true';
    this.qrEmployeeId = this.route.snapshot.queryParamMap.get('emp');

    // Buscar el parámetro :ruc en la jerarquía de rutas
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }

    // Construir el enlace de Inicio local al módulo Seguridad Industrial (redirige a dashboard-cumplimiento)
    if (this.ruc) {
      this.inicioLink = ['/usuario', this.ruc, 'seguridad-industrial'];
    }

    // Cargar catálogo y obligaciones de la empresa
    this.loadData();
  }

  private normText(v: any): string {
    try {
      return (v ?? '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return (v ?? '').toString().toLowerCase().trim();
    }
  }

  private matchQrDoc(kind: 'REGLAMENTO' | 'RIESGOS' | 'POLITICA_SST', item: any): boolean {
    const name = this.normText(this.resolveName(item));
    const desc = this.normText(this.resolveDescription(item));
    const hay = `${name} ${desc}`;

    if (kind === 'REGLAMENTO') {
      return hay.includes('reglamento');
    }
    if (kind === 'RIESGOS') {
      return hay.includes('matriz') && hay.includes('riesg');
    }
    // POLITICA_SST
    return hay.includes('politic') && (hay.includes('sst') || hay.includes('seguridad') || hay.includes('salud'));
  }

  openQrDoc(kind: 'REGLAMENTO' | 'RIESGOS' | 'POLITICA_SST'): void {
    if (this.loading) return;
    if (this.qrOpening) return;
    this.qrOpening = true;

    try {
      const list = Array.isArray(this.obligaciones) ? this.obligaciones : [];
      const target = list.find(it => this.matchQrDoc(kind, it));
      if (!target?.id) {
        this.notify.warning('No se encontró el requisito para este documento en la matriz legal.');
        this.qrOpening = false;
        return;
      }

      const matrixId = Number(target.id);
      // Siempre cargar archivos desde servidor para asegurar estado actual
      this.filesLoading[matrixId] = true;
      this.bomService.listFiles(matrixId).subscribe({
        next: (files) => {
          const arr = this.sortFiles(files);
          this.filesMap[matrixId] = arr;
          this.fileCountMap[matrixId] = arr.length;
          this.filesLoading[matrixId] = false;

          const publicPdfs = arr.filter((f: any) => {
            const nameLower = (f?.name ?? f?.path ?? '').toString().toLowerCase();
            const fdesc = (f?.description ?? '').toString();
            return nameLower.endsWith('.pdf') && fdesc.includes(this.PUBLIC_TAG);
          });

          if (publicPdfs.length === 0) {
            this.notify.warning('No hay un PDF público cargado para este documento.');
            this.qrOpening = false;
            return;
          }

          const pick = publicPdfs[publicPdfs.length - 1];
          this.previewFile(pick);
          this.qrOpening = false;
        },
        error: (err) => {
          console.error('Error al listar archivos en modo QR:', err);
          this.filesLoading[matrixId] = false;
          this.notify.error('No se pudo cargar el documento. Intente nuevamente.');
          this.qrOpening = false;
        }
      });
    } catch (e) {
      console.error('Error en openQrDoc:', e);
      this.notify.error('No se pudo abrir el documento.');
      this.qrOpening = false;
    }
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  private loadData(): void {
    if (!this.ruc) return;
    this.loading = true;
    this.error = null;

    // 1) Cargar catálogo global (para resolver nombres si vienen IDs)
    this.obligationCatalogService.getObligationMatrices().subscribe({
      next: (data) => {
        this.catalogoMatrices = Array.isArray(data) ? data : [];
      },
      error: () => {
        this.catalogoMatrices = [];
      }
    });

    // 2) Resolver empresa por RUC y cargar sus obligaciones (relaciones) sin endpoint admin
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) {
          this.error = 'No se encontró la empresa por el RUC proporcionado.';
          this.obligaciones = [];
          this.loading = false;
          return;
        }
        this.businessId = Number(id);

        // Cargar relaciones empresa-matriz desde servicio específico (no admin)
        this.bomService.getByBusiness(Number(id)).subscribe({
          next: (relaciones: any[]) => {
            const all = Array.isArray(relaciones) ? relaciones : [];
            this.obligaciones = all;
            // Precargar conteo de archivos para mostrar badge por fila
            this.preloadFileCounts();
            this.loading = false;
          },
          error: (err) => {
            console.error('Error al cargar relaciones de matriz legal por empresa:', err);
            this.error = 'Error al cargar los requisitos legales de la empresa.';
            this.obligaciones = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al buscar empresa por RUC:', err);
        this.error = 'No se pudo obtener la información de la empresa por RUC.';
        this.obligaciones = [];
        this.loading = false;
      }
    });
  }

  // Helpers de presentación seguros
  resolveName(item: any): string {
    if (!item) return '—';
    // 1) Si viene con nombre directo (o descripción como nombre), usarlo
    const direct = (item.name ?? item.nombre ?? item.title ?? item.description ?? '').toString().trim();
    if (direct.length > 0) return direct;

    // 2) Si es una relación, intentar leer el catálogo anidado
    const matrix = (item.obligationMatrix ?? item.obligation_matrix) as any;
    const nestedName = (matrix?.name ?? matrix?.nombre ?? matrix?.title ?? matrix?.description ?? '').toString().trim();
    if (nestedName.length > 0) return nestedName;

    // 3) Resolver por ID de catálogo (no usar item.id porque suele ser ID de relación)
    const catalogId = Number(item.obligation_matrix_id ?? item.obligationMatrixId ?? matrix?.id);
    if (!isNaN(catalogId)) {
      const found = this.catalogoMatrices.find((x: any) => Number(x?.id) === catalogId);
      if (found) {
        return (
          found.name ?? found.nombre ?? found.title ?? found.description ?? `#${catalogId}`
        ).toString();
      }
      return `#${catalogId}`;
    }
    return '—';
  }

  resolveDescription(item: any): string {
    if (!item) return '';
    // 1) Descripción directa de la relación o del item
    const desc = (item.description ?? item.detalle ?? item.detail ?? '').toString().trim();
    if (desc.length > 0) return desc;
    // 2) Si hay catálogo anidado, tomar su descripción
    const matrix = (item.obligationMatrix ?? item.obligation_matrix) as any;
    const nestedDesc = (matrix?.description ?? matrix?.detalle ?? matrix?.detail ?? '').toString().trim();
    return nestedDesc;
  }

  resolveLegalRegulation(item: any): string {
    if (!item) return '';
    // 1) Regulación legal directa del item
    const direct = (item.legalRegulation ?? item.legal_regulation ?? '').toString().trim();
    if (direct.length > 0) return direct;
    // 2) Si hay catálogo anidado, tomar su legalRegulation
    const matrix = (item.obligationMatrix ?? item.obligation_matrix) as any;
    const nested = (matrix?.legalRegulation ?? matrix?.legal_regulation ?? '').toString().trim();
    return nested;
  }

  // Formateadores
  formatDate(date: any): string {
    if (!date) return '—';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString();
    } catch {
      return String(date);
    }
  }

  formatDateTime(dateTime: any): string {
    if (!dateTime) return '—';
    try {
      const d = new Date(dateTime);
      if (isNaN(d.getTime())) return String(dateTime);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    } catch {
      return String(dateTime);
    }
  }

  // Días de vigencia
  calculateDaysRemaining(item: any): number {
    try {
      const dueRaw = item?.dueDate;
      if (!dueRaw) return NaN;
      const due = new Date(dueRaw);
      const today = new Date();
      // normalizar a medianoche para cálculo en días
      due.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffMs = due.getTime() - today.getTime();
      const days = Math.floor(diffMs / 86400000);
      return days;
    } catch {
      return NaN;
    }
  }

  daysBadgeClass(days: number): string {
    if (isNaN(days)) return 'bg-secondary-subtle text-secondary';
    if (days >= 30) return 'bg-success-subtle text-success';
    if (days >= 15) return 'bg-warning-subtle text-warning';
    if (days <= 5) return 'bg-danger-subtle text-danger';
    return 'bg-warning-subtle text-warning';
  }

  displayDaysLabel(days: number): string {
    if (isNaN(days)) return '—';
    if (days > 0) return `${days} día${days === 1 ? '' : 's'}`;
    if (days === 0) return 'Hoy';
    const overdue = Math.abs(days);
    return `Hace ${overdue} día${overdue === 1 ? '' : 's'}`;
  }

  // Estado automático visual
  displayStatus(item: any): string {
    if (item?.completed) return 'CUMPLIDO';
    const days = this.calculateDaysRemaining(item);
    if (isNaN(days)) return (item?.status || 'PENDIENTE');
    if (days < 0) return 'VENCIDA';
    if (days <= 5) return 'URGENTE';
    return 'EN PROCESO';
  }

  statusBadgeClass(item: any): string {
    if (item?.completed) return 'bg-success-subtle text-success';
    const days = this.calculateDaysRemaining(item);
    if (isNaN(days)) return 'bg-secondary-subtle text-secondary';
    if (days < 0) return 'bg-danger-subtle text-danger';
    if (days <= 5) return 'bg-danger-subtle text-danger';
    if (days >= 15) return 'bg-warning-subtle text-warning';
    return 'bg-secondary-subtle text-secondary';
  }

  // Métodos para iconos y badges
  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CUMPLIDO':
      case 'CUMPLIDA':
        return 'fa-check-circle';
      case 'VENCIDA':
        return 'fa-exclamation-triangle';
      case 'URGENTE':
        return 'fa-exclamation-triangle';
      case 'EN PROCESO':
        return 'fa-clock';
      case 'PENDIENTE':
      default:
        return 'fa-pause-circle';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'ALTA':
        return 'bg-danger-subtle text-danger';
      case 'MEDIA':
        return 'bg-warning-subtle text-warning';
      case 'BAJA':
        return 'bg-success-subtle text-success';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'ALTA':
        return 'fa-exclamation-triangle';
      case 'MEDIA':
        return 'fa-minus';
      case 'BAJA':
        return 'fa-arrow-down';
      default:
        return 'fa-question';
    }
  }

  // Ordenar archivos por fecha de creación (o por id) ascendente
  private sortFiles(files: any[]): any[] {
    const arr = Array.isArray(files) ? [...files] : [];
    try {
      arr.sort((a: any, b: any) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        const aId = Number(a?.id) || 0;
        const bId = Number(b?.id) || 0;
        return aId - bId;
      });
    } catch {}
    return arr;
  }

  // Departamento
  resolveDepartment(item: any): string {
    const dept = (item?.department?.name ?? item?.departmentName ?? item?.responsiblePerson ?? '').toString().trim();
    return dept.length > 0 ? dept : '—';
  }

  // Archivos helpers
  filesCount(id?: number): number {
    if (!id) return 0;
    const files = this.filesMap[id];
    return Array.isArray(files) ? files.length : 0;
  }

  // Devuelve hasta 3 PDFs más recientes para mostrar al usuario
  getTopPdfFiles(matrixId?: number): any[] {
    if (!matrixId) return [];
    const list = this.filesMap[matrixId];
    const arr = Array.isArray(list) ? list : [];
    const pdfs = arr.filter((f: any) => {
      const name = (f?.name ?? f?.path ?? '').toString().toLowerCase();
      const desc = (f?.description ?? '').toString();
      return name.endsWith('.pdf') && desc.includes(this.PUBLIC_TAG);
    });
    // La lista ya está ordenada ascendente por fecha/id; tomar los últimos 3
    return pdfs.slice(-3);
  }

  // Edición inline
  isEditing(item: any): boolean {
    return !!(item?.id && this.editRow[item.id]);
  }

  startEdit(item: any): void {
    if (!item?.id) return;
    this.editRow[item.id] = true;
    // Inicializar modelo con valores actuales
    this.editModel[item.id] = {
      startDate: this.toDateInputValue(item?.startDate || item?.createdAt),
      dueDate: this.toDateInputValue(item?.dueDate),
      priority: item?.priority
    };
  }

  cancelEdit(item: any): void {
    if (!item?.id) return;
    this.editRow[item.id] = false;
    delete this.editModel[item.id];
  }

  // Confirmación de guardado
  confirmSave(item: any): void {
    if (!item?.id) return;
    this.confirmItemId = Number(item.id);
    this.confirmVisible = true;
  }

  closeConfirm(): void {
    this.confirmVisible = false;
    this.confirmItemId = null;
  }

  performSaveEditConfirm(): void {
    if (this.confirmItemId == null) {
      this.closeConfirm();
      return;
    }
    const item = this.obligaciones.find(x => Number(x?.id) === Number(this.confirmItemId));
    if (item) {
      this.saveEdit(item);
    }
    this.closeConfirm();
  }

  saveEdit(item: any): void {
    if (!item?.id) return;
    const id = item.id as number;
    const model = this.editModel[id] || {};

    const payload: any = {};
    // startDate: enviar solo si válido
    const start = this.normalizeDateInput(model.startDate);
    if (start) payload.startDate = start;
    // dueDate: enviar solo si válido
    const due = this.normalizeDateInput(model.dueDate);
    if (due) payload.dueDate = due;
    // priority: enviar si no vacío
    if (model.priority && String(model.priority).trim().length > 0) {
      payload.priority = String(model.priority).trim();
    }

    if (Object.keys(payload).length === 0) {
      this.cancelEdit(item);
      return;
    }

    if (!this.businessId) {
      alert('No se pudo determinar la empresa para la aprobación');
      return;
    }
    this.savingRow[id] = true;
    this.approvalService.createApproval({
      businessId: this.businessId,
      type: 'MATRIX_UPDATE',
      targetType: 'BUSINESS_OBLIGATION_MATRIX',
      targetId: id,
      payload
    }).subscribe({
      next: () => {
        this.savingRow[id] = false;
        this.cancelEdit(item);
        alert('Solicitud enviada al administrador para aprobación.');
      },
      error: (err) => {
        console.error('Error al enviar solicitud de aprobación:', err);
        this.savingRow[id] = false;
        alert('No se pudo enviar la solicitud. Intente nuevamente.');
      }
    });
  }

  // Helpers de fecha para input type=date
  toDateInputValue(date: any): string {
    try {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  }

  normalizeDateInput(value: any): string | null {
    if (!value) return null;
    // Si ya viene en formato yyyy-MM-dd, devolver tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return null;
    }
  }

  // Archivos
  toggleFiles(matrixId?: number): void {
    if (!matrixId) return;
    this.openRows[matrixId] = !this.openRows[matrixId];
    if (this.openRows[matrixId] && !this.filesMap[matrixId]) {
      this.loadFiles(matrixId);
    }
  }

  private loadFiles(matrixId: number): void {
    this.filesLoading[matrixId] = true;
    this.bomService.listFiles(matrixId).subscribe({
      next: (files) => {
        this.filesMap[matrixId] = this.sortFiles(files);
        this.fileCountMap[matrixId] = this.filesMap[matrixId].length;
        this.filesLoading[matrixId] = false;
      },
      error: (err) => {
        console.error('Error al listar archivos:', err);
        this.filesMap[matrixId] = [];
        this.fileCountMap[matrixId] = 0;
        this.filesLoading[matrixId] = false;
      }
    });
  }

  private preloadFileCounts(): void {
    try {
      (this.obligaciones || []).forEach((it: any) => {
        const id = Number(it?.id);
        if (!id || this.fileCountMap[id] != null) return;
        this.bomService.listFiles(id).subscribe({
          next: (files) => {
            const list = this.sortFiles(files);
            this.fileCountMap[id] = list.length;
            if (!this.filesMap[id]) this.filesMap[id] = list;
          },
          error: () => {
            this.fileCountMap[id] = 0;
          }
        });
      });
    } catch {}
  }

  onFileSelected(item: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!item?.id || !file) return;
    this.uploading[item.id] = true;
    if (!this.businessId) {
      this.notify.error('No se pudo determinar la empresa para la aprobación');
      this.uploading[item.id] = false;
      input.value = '';
      return;
    }
    // Guardar URL local para vista previa inmediata, sin depender del backend
    try {
      const prev = this.localPreviewUrl[item.id];
      if (prev) URL.revokeObjectURL(prev);
      this.localPreviewUrl[item.id] = URL.createObjectURL(file);
    } catch {}
    // Validaciones previas (20MB y tipos permitidos)
    const MAX = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX) {
      this.uploading[item.id] = false;
      input.value = '';
      this.notify.error('Archivo demasiado grande. Máximo permitido: 20 MB');
      return;
    }
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const nameLower = (file.name || '').toLowerCase();
    const typeOk = allowedTypes.includes(file.type || '') || nameLower.endsWith('.pdf') || nameLower.endsWith('.doc') || nameLower.endsWith('.docx');
    if (!typeOk) {
      this.uploading[item.id] = false;
      input.value = '';
      this.notify.warning('Solo se permiten archivos PDF y Word (.doc, .docx)');
      return;
    }

    // Flujo staging-only
    this.approvalService.uploadStagingObligationFile(file).subscribe({
      next: (staging) => {
        const stagingPath = staging?.stagingPath;
        const originalName = staging?.originalName || file.name;
        if (!stagingPath) {
          console.error('Respuesta de staging inválida', staging);
          this.uploading[item.id] = false;
          input.value = '';
          this.notify.error('No se pudo preparar el archivo para aprobación.');
          return;
        }
        this.approvalService.createApproval({
          businessId: this.businessId!,
          type: 'FILE_UPLOAD',
          targetType: 'BUSINESS_OBLIGATION_MATRIX',
          targetId: Number(item.id),
          payload: { stagingPath, originalName }
        }).subscribe({
          next: () => {
            this.uploading[item.id] = false;
            input.value = '';
            this.notify.success('Solicitud de carga enviada al administrador.');
          },
          error: (err) => {
            console.error('Error al solicitar aprobación de carga:', err);
            this.uploading[item.id] = false;
            input.value = '';
            this.notify.error('No se pudo enviar la solicitud. Intente nuevamente.');
          }
        });
      },
      error: (err) => {
        console.error('Error al subir a staging:', err);
        // Si es 403, informar permisos insuficientes
        if (err?.status === 403) {
          this.uploading[item.id] = false;
          input.value = '';
          this.notify.warning('No tienes permiso para subir archivos. Contacta al administrador.');
          return;
        }
        this.uploading[item.id] = false;
        input.value = '';
        const backendMsg = (err?.error?.message as string) || '';
        if (err?.status === 413) {
          this.notify.error('El archivo excede el límite permitido (20 MB). Por favor, reduzca su tamaño e inténtelo nuevamente.');
        } else if (err?.status === 400) {
          this.notify.warning(backendMsg || 'El archivo no se pudo procesar. Asegúrese de seleccionar un PDF o Word válido.');
        } else if (err?.status === 500) {
          this.notify.error(backendMsg || 'No se pudo almacenar el archivo en el servidor. Intente más tarde o contacte al administrador.');
        } else {
          this.notify.error(backendMsg || 'No se pudo subir el archivo a staging. Intente nuevamente.');
        }
      }
    });
  }

  downloadFile(file: any): void {
    if (!file?.id) return;
    this.bomService.downloadFile(Number(file.id)).subscribe({
      next: (blob) => {
        const mimeType = (blob && (blob as any).type) ? (blob as any).type : 'application/octet-stream';
        const typed = new Blob([blob], { type: mimeType });
        const url = window.URL.createObjectURL(typed);
        const a = document.createElement('a');
        a.href = url;
        a.download = file?.name || 'archivo';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
      }
    });
  }

  // Vista previa en nueva pestaña
  previewFile(file: any): void {
    if (!file?.id) return;
    this.bomService.downloadFile(Number(file.id)).subscribe({
      next: (blob) => {
        const mimeType = (blob && (blob as any).type) ? (blob as any).type : 'application/octet-stream';
        const typed = new Blob([blob], { type: mimeType });
        const url = window.URL.createObjectURL(typed);
        window.open(url, '_blank');
        // No revocar inmediatamente para permitir la vista. Se puede limpiar al cerrar la pestaña, pero aquí lo dejamos.
      },
      error: (err) => {
        console.error('Error al previsualizar archivo:', err);
        this.notify.error('No se pudo abrir la vista previa.');
      }
    });
  }

  previewMostRecent(matrixId?: number): void {
    if (!matrixId) return;
    const list = this.filesMap[matrixId];
    if (Array.isArray(list) && list.length > 0) {
      // Tomar solo PDFs y elegir el más reciente; si no hay PDFs, avisar
      const pdfs = list.filter((f: any) => {
        const name = (f?.name ?? f?.path ?? '').toString().toLowerCase();
        return name.endsWith('.pdf');
      });
      if (pdfs.length > 0) {
        const pick = pdfs[pdfs.length - 1];
        this.previewFile(pick);
      } else {
        alert('No hay PDF vigente para esta obligación.');
      }
      return;
    }
    // Si aún no se ha cargado, la cargamos y luego previsualizamos el primero disponible
    this.filesLoading[matrixId] = true;
    this.bomService.listFiles(matrixId).subscribe({
      next: (files) => {
        const arr = this.sortFiles(files);
        this.filesMap[matrixId] = arr;
        this.fileCountMap[matrixId] = arr.length;
        this.filesLoading[matrixId] = false;
        if (arr.length > 0) {
          const pdfs = arr.filter((f: any) => {
            const name = (f?.name ?? f?.path ?? '').toString().toLowerCase();
            return name.endsWith('.pdf');
          });
          if (pdfs.length > 0) {
            const pick = pdfs[pdfs.length - 1];
            this.previewFile(pick);
          } else {
            alert('No hay PDF vigente para esta obligación.');
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar archivos para previsualizar:', err);
        this.filesLoading[matrixId] = false;
      }
    });
  }

  // Habilitar vista previa aunque no haya archivos en servidor (usa localPreviewUrl si existe)
  canPreview(matrixId?: number): boolean {
    if (!matrixId) return false;
    const serverHas = (this.fileCountMap[matrixId] || 0) > 0;
    const hasLocal = !!this.localPreviewUrl[matrixId];
    return serverHas || hasLocal;
  }

  previewMostRecentOrLocal(matrixId?: number): void {
    if (!matrixId) return;
    const serverHas = (this.fileCountMap[matrixId] || 0) > 0;
    if (serverHas) {
      this.previewMostRecent(matrixId);
      return;
    }
    const local = this.localPreviewUrl[matrixId];
    if (local) {
      window.open(local, '_blank');
    }
  }

  // toggle completado
  toggleCompleted(item: any): void {
    if (!item?.id) return;
    if (!this.businessId) {
      alert('No se pudo determinar la empresa para la aprobación');
      return;
    }
    const newVal = !item.completed;
    this.statusToggleLoading[item.id] = true;
    this.approvalService.createApproval({
      businessId: this.businessId,
      type: 'MATRIX_UPDATE',
      targetType: 'BUSINESS_OBLIGATION_MATRIX',
      targetId: Number(item.id),
      payload: { completed: newVal }
    }).subscribe({
      next: () => {
        this.statusToggleLoading[item.id] = false;
        alert('Solicitud enviada para cambiar el estado de cumplimiento.');
      },
      error: (err) => {
        console.error('Error al solicitar cambio de cumplimiento:', err);
        this.statusToggleLoading[item.id] = false;
      }
    });
  }

  // Métodos helper para estadísticas del dashboard
  calculateCompliancePercentage(): number {
    if (!this.obligaciones || this.obligaciones.length === 0) return 0;
    const completed = this.obligaciones.filter(item => item?.completed).length;
    return Math.round((completed / this.obligaciones.length) * 100);
  }

  countAtRisk(): number {
    if (!this.obligaciones) return 0;
    return this.obligaciones.filter(item => {
      const days = this.calculateDaysRemaining(item);
      return !isNaN(days) && days >= 0 && days <= 5;
    }).length;
  }

  countUpcoming(): number {
    if (!this.obligaciones) return 0;
    return this.obligaciones.filter(item => {
      const days = this.calculateDaysRemaining(item);
      return !isNaN(days) && days > 5 && days <= 30;
    }).length;
  }

  // Control del dropdown de PDFs
  togglePdfDropdown(matrixId: number): void {
    this.pdfDropdownOpen[matrixId] = !this.pdfDropdownOpen[matrixId];
  }

  closePdfDropdown(matrixId: number): void {
    this.pdfDropdownOpen[matrixId] = false;
  }

  // Paginación
  get paginatedObligaciones(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.obligaciones.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.obligaciones.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Cerrar todos los dropdowns al cambiar de página
      this.pdfDropdownOpen = {};
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }
}
