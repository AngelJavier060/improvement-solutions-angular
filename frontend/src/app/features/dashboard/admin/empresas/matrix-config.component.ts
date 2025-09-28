import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessObligationMatrixService } from '../../../../services/business-obligation-matrix.service';
import { ApprovalService } from '../../../../services/approval.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-matrix-config',
  templateUrl: './matrix-config.component.html'
})
export class MatrixConfigComponent implements OnInit {
  @Input() businessId?: number;
  items: any[] = [];
  loading = false;
  error: string | null = null;

  // Edición
  editModel: Record<number, any> = {};
  savingRow: Record<number, boolean> = {};

  // Archivos
  filesMap: Record<number, any[]> = {};
  fileCountMap: Record<number, number> = {};
  filesLoading: Record<number, boolean> = {};
  openRows: Record<number, boolean> = {};

  // Historial de versiones
  historyOpen: Record<number, boolean> = {};
  versionsMap: Record<number, any[]> = {};
  versionsLoading: Record<number, boolean> = {};
  versionFilesMap: Record<number, Record<number, any[]>> = {};
  versionFilesLoading: Record<string, boolean> = {};

  // Renovación
  renewVisible = false;
  renewItemId: number | null = null;
  renewModel: any = {};

  // Opciones
  statusOptions = ['PENDIENTE','EN PROCESO','VENCIDA','CUMPLIDA'];
  priorityOptions = ['ALTA','MEDIA','BAJA'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bomService: BusinessObligationMatrixService,
    private approvalService: ApprovalService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.businessId) {
      this.load();
      return;
    }
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (!id) {
        this.error = 'ID de empresa inválido';
        return;
      }
      this.businessId = id;
      this.load();
    });
  }

  // === Historial ===
  toggleHistory(matrixId: number): void {
    this.historyOpen[matrixId] = !this.historyOpen[matrixId];
    if (this.historyOpen[matrixId] && !this.versionsMap[matrixId]) {
      this.versionsLoading[matrixId] = true;
      this.bomService.listVersions(matrixId).subscribe({
        next: (vers) => {
          this.versionsMap[matrixId] = Array.isArray(vers) ? vers : [];
          this.versionsLoading[matrixId] = false;
        },
        error: () => {
          this.versionsMap[matrixId] = [];
          this.versionsLoading[matrixId] = false;
        }
      });
    }
  }

  loadVersionFiles(matrixId: number, version: number): void {
    const key = `${matrixId}:${version}`;
    this.versionFilesLoading[key] = true;
    if (!this.versionFilesMap[matrixId]) this.versionFilesMap[matrixId] = {};
    this.bomService.listFiles(matrixId, { version }).subscribe({
      next: (files) => {
        this.versionFilesMap[matrixId][version] = Array.isArray(files) ? files : [];
        this.versionFilesLoading[key] = false;
      },
      error: () => {
        this.versionFilesMap[matrixId][version] = [];
        this.versionFilesLoading[key] = false;
      }
    });
  }

  // === Renovación ===
  openRenew(item: any): void {
    if (!item?.id) return;
    this.renewItemId = Number(item.id);
    this.renewModel = {
      startDate: this.toDateInputValue(item?.createdAt),
      dueDate: this.toDateInputValue(item?.dueDate),
      name: item?.name || item?.obligationMatrix?.legalCompliance || '',
      legalRegulation: item?.description || item?.obligationMatrix?.legalRegulation || '',
      priority: item?.priority || 'MEDIA',
      observations: item?.observations || ''
    };
    this.renewVisible = true;
  }

  closeRenew(): void {
    this.renewVisible = false;
    this.renewItemId = null;
    this.renewModel = {};
  }

  confirmRenew(): void {
    if (this.renewItemId == null) {
      this.closeRenew();
      return;
    }
    const id = this.renewItemId;
    const m = this.renewModel || {};
    const payload: any = {};
    if (m.name) payload.name = String(m.name).trim();
    if (m.legalRegulation) payload.description = String(m.legalRegulation).trim();
    const start = this.normalizeDateInput(m.startDate);
    if (start) payload.createdAt = `${start}T00:00:00`;
    const due = this.normalizeDateInput(m.dueDate);
    if (due) payload.dueDate = due;
    if (m.priority) payload.priority = String(m.priority).trim();
    if (m.observations) payload.observations = String(m.observations).trim();

    this.savingRow[id] = true;
    this.bomService.renew(id, payload).subscribe({
      next: () => {
        this.savingRow[id] = false;
        this.closeRenew();
        this.load();
      },
      error: (err) => {
        console.error('Error al renovar matriz:', err);
        this.savingRow[id] = false;
        alert('No se pudo renovar la matriz legal.');
      }
    });
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.bomService.getByBusiness(this.businessId as number).subscribe({
      next: (list) => {
        this.items = Array.isArray(list) ? list : [];
        // Precargar conteo de archivos
        this.items.forEach(it => this.preloadFileCount(Number(it?.id)));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar matriz legal de empresa:', err);
        this.error = 'No se pudo cargar la configuración de matriz legal.';
        this.items = [];
        this.loading = false;
      }
    });
  }

  // Presentación
  formatDate(date: any): string {
    if (!date) return '—';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString();
    } catch { return String(date); }
  }

  formatDateTime(date: any): string {
    if (!date) return '—';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    } catch { return String(date); }
  }

  toDateInputValue(val: any): string {
    try {
      if (!val) return '';
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch { return ''; }
  }

  // Convert yyyy-MM-dd -> yyyy-MM-ddTHH:mm:ss (00:00:00)
  private dateOnlyToIsoDateTime(value: any): string | null {
    if (!value) return null;
    const s = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return `${s}T00:00:00`;
  }

  normalizeDateInput(value: any): string | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch { return null; }
  }

  calculateDaysRemaining(item: any): number {
    try {
      const dueRaw = item?.dueDate;
      if (!dueRaw) return NaN;
      const due = new Date(dueRaw);
      const today = new Date();
      due.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffMs = due.getTime() - today.getTime();
      return Math.floor(diffMs / 86400000);
    } catch { return NaN; }
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

  // Métodos para badges de estado
  getStatusBadgeClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'CUMPLIDA':
      case 'CUMPLIDO':
        return 'bg-success-subtle text-success';
      case 'VENCIDA':
        return 'bg-danger-subtle text-danger';
      case 'EN PROCESO':
        return 'bg-warning-subtle text-warning';
      case 'PENDIENTE':
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  // Estado visual derivado para estadísticas
  // Regla:
  // - CUMPLIDA: si completed = true
  // - NO CUMPLIDO: si no completed y dueDate vencido
  // - EN PROCESO: si no completed y faltan <= 5 días para vencer
  // - PENDIENTE: si no completed y faltan > 5 días o no hay dueDate válido
  displayStatus(item: any): string {
    if (item?.completed) return 'CUMPLIDA';
    const days = this.calculateDaysRemaining(item);
    if (isNaN(days)) return 'PENDIENTE';
    if (days < 0) return 'NO CUMPLIDO';
    if (days <= 5) return 'EN PROCESO';
    return 'PENDIENTE';
  }

  statusBadgeClass(item: any): string {
    if (item?.completed) return 'bg-success-subtle text-success';
    const days = this.calculateDaysRemaining(item);
    if (isNaN(days)) return 'bg-secondary-subtle text-secondary'; // PENDIENTE sin dueDate
    if (days < 0) return 'bg-danger-subtle text-danger'; // NO CUMPLIDO
    if (days <= 5) return 'bg-warning-subtle text-warning'; // EN PROCESO
    return 'bg-secondary-subtle text-secondary'; // PENDIENTE
  }

  getStatusIcon(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'CUMPLIDA':
      case 'CUMPLIDO':
        return 'fa-check-circle';
      case 'NO CUMPLIDO':
        return 'fa-exclamation-triangle';
      case 'EN PROCESO':
        return 'fa-clock';
      case 'PENDIENTE':
      default:
        return 'fa-pause-circle';
    }
  }

  // Métodos para badges de prioridad
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

  resolveName(it: any): string {
    const direct = (it?.name ?? '').toString().trim();
    if (direct) return direct;
    const nested = (it?.obligationMatrix?.legalCompliance ?? '').toString().trim();
    return nested || '—';
  }

  resolveRegulation(it: any): string {
    return (it?.obligationMatrix?.legalRegulation ?? '').toString().trim();
  }

  // Edición por fila
  startEdit(item: any): void {
    if (!item?.id) return;
    this.editModel[item.id] = {
      name: item?.name || item?.obligationMatrix?.legalCompliance || '',
      legalRegulation: item?.description || item?.obligationMatrix?.legalRegulation || '',
      startDate: this.toDateInputValue(item?.createdAt),
      dueDate: this.toDateInputValue(item?.dueDate),
      days: this.calculateDaysRemaining(item),
      completed: !!item?.completed,
      priority: item?.priority || 'MEDIA',
      observations: item?.observations || '',
      action: item?.obligationType || ''
    };
  }

  cancelEdit(item: any): void {
    if (!item?.id) return;
    delete this.editModel[item.id];
  }

  isEditing(item: any): boolean {
    return !!this.editModel[item?.id];
  }

  saveRow(item: any): void {
    if (!item?.id) return;
    const id = Number(item.id);
    const model = this.editModel[id] || {};

    const payload: any = {};
    if (typeof model.name === 'string') payload.name = model.name.trim();
    if (typeof model.legalRegulation === 'string') payload.description = model.legalRegulation.trim();
    const createdAtIso = this.dateOnlyToIsoDateTime(model.startDate);
    if (createdAtIso) (payload as any).createdAt = createdAtIso;
    let due = this.normalizeDateInput(model.dueDate);
    // Si el admin editó "días" y no especificó dueDate, recalcular dueDate desde hoy
    if ((!due || due.length === 0) && model.days != null && model.days !== '' && !isNaN(Number(model.days))) {
      const d0 = new Date();
      const n = Number(model.days);
      d0.setHours(0,0,0,0);
      d0.setDate(d0.getDate() + n);
      const yyyy = d0.getFullYear();
      const mm = String(d0.getMonth() + 1).padStart(2, '0');
      const dd = String(d0.getDate()).padStart(2, '0');
      due = `${yyyy}-${mm}-${dd}`;
    }
    if (due) payload.dueDate = due;
    if (typeof model.priority === 'string') payload.priority = model.priority.trim();
    if (typeof model.observations === 'string') payload.observations = model.observations.trim();
    // No enviar obligationType/"Acción" en este flujo

    const completedNew: boolean = !!model.completed;
    const completedOld: boolean = !!item.completed;
    const completedChanged = completedNew !== completedOld;

    this.savingRow[id] = true;
    const doFinalize = () => {
      this.savingRow[id] = false;
      this.cancelEdit(item);
      this.load();
    };

    const handleCompletion = () => {
      if (!completedChanged) {
        doFinalize();
      } else {
        this.bomService.markCompletion(id, completedNew).subscribe({
          next: () => doFinalize(),
          error: (err) => {
            console.error('Error al actualizar estado de cumplimiento:', err);
            this.savingRow[id] = false;
            alert('Los cambios se guardaron parcialmente, pero no se pudo actualizar el estado de cumplimiento.');
          }
        });
      }
    };

    if (Object.keys(payload).length > 0) {
      this.bomService.update(id, payload).subscribe({
        next: () => handleCompletion(),
        error: (err) => {
          console.error('Error al guardar fila:', err);
          this.savingRow[id] = false;
          alert('No se pudo guardar los cambios.');
        }
      });
    } else if (completedChanged) {
      // Solo cambiar completion sin otros cambios
      this.bomService.markCompletion(id, completedNew).subscribe({
        next: () => doFinalize(),
        error: (err) => {
          console.error('Error al actualizar estado de cumplimiento:', err);
          this.savingRow[id] = false;
          alert('No se pudo actualizar el estado de cumplimiento.');
        }
      });
    } else {
      // Nada que guardar
      doFinalize();
    }
  }

  // Archivos
  toggleFiles(matrixId: number): void {
    this.openRows[matrixId] = !this.openRows[matrixId];
    if (this.openRows[matrixId]) {
      this.loadFiles(matrixId);
    }
  }

  private preloadFileCount(matrixId: number): void {
    this.bomService.listFiles(matrixId, { currentOnly: true }).subscribe({
      next: (files) => {
        const arr = Array.isArray(files) ? files : [];
        this.fileCountMap[matrixId] = arr.length;
        this.filesMap[matrixId] = arr;
      },
      error: () => {
        this.fileCountMap[matrixId] = 0;
      }
    });
  }

  private loadFiles(matrixId: number): void {
    this.filesLoading[matrixId] = true;
    this.bomService.listFiles(matrixId, { currentOnly: true }).subscribe({
      next: (files) => {
        this.filesMap[matrixId] = Array.isArray(files) ? files : [];
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

  onFileSelected(item: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!item?.id || !file) return;
    const id = Number(item.id);

    // Validaciones previas (20MB y tipos permitidos)
    const MAX = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX) {
      this.notify.error('Archivo demasiado grande. Máximo permitido: 20 MB');
      input.value = '';
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
      this.notify.warning('Solo se permiten archivos PDF y Word (.doc, .docx)');
      input.value = '';
      return;
    }

    // Flujo ADMIN directo: guardar en BD inmediatamente
    this.filesLoading[id] = true;
    this.bomService.uploadFile(id, file).subscribe({
      next: () => {
        input.value = '';
        // Refrescar lista y conteo
        this.loadFiles(id);
        this.preloadFileCount(id);
        this.filesLoading[id] = false;
        this.notify.success('Archivo subido correctamente.');
      },
      error: (err) => {
        console.error('Error al subir archivo directamente:', err);
        input.value = '';
        this.filesLoading[id] = false;
        if (err?.status === 403) {
          this.notify.warning('No tienes permiso para subir archivos.');
        } else if (err?.status === 413) {
          this.notify.error('El archivo excede el límite permitido (20 MB).');
        } else if (err?.status === 400) {
          const msg = (err?.error?.message as string) || 'Archivo no válido.';
          this.notify.warning(msg);
        } else {
          const msg = (err?.error?.message as string) || 'No se pudo subir el archivo.';
          this.notify.error(msg);
        }
      }
    });
  }

  downloadFile(file: any): void {
    if (!file?.id) return;
    this.bomService.downloadFile(Number(file.id)).subscribe({
      next: (blob) => {
        const filename = this.displayFileName(file);
        const mimeType = this.getFileMimeType(filename);
        const typed = (blob && (blob as any).type) ? blob : new Blob([blob], { type: mimeType });
        const url = window.URL.createObjectURL(typed);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al descargar archivo:', err)
    });
  }

  previewFile(file: any): void {
    if (!file?.id) return;
    const fileName = this.displayFileName(file);
    const ext = fileName.toLowerCase().split('.').pop();

    if (ext === 'doc' || ext === 'docx') {
      // Usar Google Docs Viewer para archivos Word
      const downloadUrl = `${window.location.origin}/api/obligation-matrices/files/${file.id}/download`;
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
      window.open(viewerUrl, '_blank');
    } else {
      // Mantener comportamiento actual para PDFs y otros archivos
      this.bomService.downloadFile(Number(file.id)).subscribe({
        next: (blob) => {
          const mimeType = this.getFileMimeType(fileName);
          const typed = (blob && (blob as any).type) ? blob : new Blob([blob], { type: mimeType });
          const url = window.URL.createObjectURL(typed);
          window.open(url, '_blank');
        },
        error: (err) => {
          console.error('Error al previsualizar archivo:', err);
          alert('No se pudo abrir la vista previa.');
        }
      });
    }
  }

  canPreview(matrixId: number): boolean {
    return (this.fileCountMap[matrixId] || 0) > 0;
  }

  // Mostrar un nombre amigable del archivo
  displayFileName(file: any): string {
    const n = (file?.name ?? '').toString().trim();
    if (n) return n;
    const p = (file?.path ?? '').toString().trim();
    if (!p) return 'archivo';
    const last = p.split('/').pop() || p;
    return (last && last.length > 0) ? last : 'archivo';
  }

  // Obtener icono según tipo de archivo
  getFileIcon(fileName: string): string {
    if (!fileName) return 'fa-file';
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'fa-file-pdf';
      case 'doc':
      case 'docx':
        return 'fa-file-word';
      default:
        return 'fa-file';
    }
  }

  // Obtener tipo MIME apropiado para vista previa
  getFileMimeType(fileName: string): string {
    if (!fileName) return 'application/pdf';
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/pdf';
    }
  }
}
