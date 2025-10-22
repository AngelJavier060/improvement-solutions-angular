import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { BusinessObligationMatrixService } from '../../../../../services/business-obligation-matrix.service';
import { ApprovalService } from '../../../../../services/approval.service';
import { NotificationService } from '../../../../../services/notification.service';

@Component({
  selector: 'app-matriz-legal-usuario',
  styleUrls: ['./matriz-legal-usuario.component.scss'],
  template: `
    <div class="ml-container d-flex">
      <!-- Botón toggle -->
      <button class="ml-toggle btn btn-light shadow-sm" [class.collapsed]="isCollapsed" type="button" (click)="toggleSidebar()">
        <i class="fas" [ngClass]="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>

      <!-- Sidebar izquierdo -->
      <aside class="ml-sidebar shadow-lg" [class.collapsed]="isCollapsed">
        <div class="ml-sidebar-header pt-4 pb-2">
          <div class="ml-sidebar-icon mb-2"><i class="fas fa-balance-scale"></i></div>
          <h4 class="ml-sidebar-title">Matriz Legal</h4>
        </div>
        <nav class="ml-sidebar-nav mt-3">
          <ul>
            <li>
              <a [routerLink]="inicioLink" class="nav-link">
                <i class="fas fa-home"></i><span>Inicio</span>
              </a>
            </li>
            <li>
              <a href="#" class="nav-link active">
                <i class="fas fa-gavel"></i><span>Matriz Legal</span>
              </a>
            </li>
            <li>
              <a href="#" class="nav-link disabled">
                <i class="fas fa-file-upload"></i><span>Documentos (Próximamente)</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Contenido -->
      <div class="ml-content flex-grow-1" [class.full]="isCollapsed">
        <!-- Barra superior con botón de Inicio y mensaje de bienvenida -->
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div class="d-flex align-items-center gap-2">
            <a class="btn btn-outline-secondary btn-sm" [routerLink]="['/usuario', ruc, 'welcome']">
              <i class="fas fa-arrow-left me-1"></i> Volver
            </a>
            <a class="btn btn-outline-success btn-sm" [routerLink]="inicioLink">
              <i class="fas fa-home me-1"></i> Inicio
            </a>
          </div>
          <div></div>
        </div>

        <!-- Título principal de la página -->
        <h4 class="ml-impact-title">Matriz Legal</h4>

        <!-- Resumen visual del módulo (solo gauge) reutilizando el dashboard de inicio -->
        <div class="mb-3">
          <app-dashboard-cumplimiento
            [showHeader]="false"
            [showCompanyInfo]="false"
            [showEmployeeStats]="true"
            [showGauge]="true"
            [showAgeBar]="true"
            [showLegalSection]="false">
          </app-dashboard-cumplimiento>
        </div>

        <!-- Contenido: listado real de obligaciones de la empresa -->
        <div class="card shadow-sm border-0">
          <div class="card-header d-flex align-items-center justify-content-between" style="background: linear-gradient(90deg, #e0e7ff 0%, #f0fdfa 100%); border-bottom: 1px solid #c7d2fe;">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle" style="background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%); color: #fff; width:36px;height:36px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 8px #6366f133;">
                <i class="fas fa-balance-scale"></i>
              </div>
              <div>
                <h5 class="mb-0" style="font-weight: 500; color: #111827; letter-spacing: 0.2px;">Listado de requisitos legales</h5>
                <small style="color: #6366f1; font-weight: 500;">Seguridad Industrial</small>
              </div>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="text-center py-4" *ngIf="loading">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <div class="mt-2 text-muted">Cargando matriz legal...</div>
            </div>
            <div class="alert alert-danger mx-3" *ngIf="error && !loading">
              <i class="fas fa-exclamation-triangle me-2"></i>{{ error }}
            </div>
            <div class="alert alert-info mx-3" *ngIf="!loading && !error && obligaciones.length === 0">
              <i class="fas fa-info-circle me-2"></i>No hay requisitos legales registrados para esta empresa.
            </div>

            <div class="table-responsive" *ngIf="!loading && !error && obligaciones.length > 0">
              <table class="table table-hover mb-0 shadow-sm">
                <thead class="table-primary">
                  <tr class="text-slate-700 font-medium text-base">
                    <th class="px-3">#</th>
                    <th><i class="fas fa-gavel me-1 text-blue-500"></i>Cumplimiento Legal</th>
                    <th class="d-none d-lg-table-cell"><i class="fas fa-book me-1 text-green-500"></i>Regulación Legal</th>
                    <th><i class="fas fa-calendar-plus me-1 text-amber-500"></i>Fecha ingreso</th>
                    <th><i class="fas fa-calendar-times me-1 text-rose-500"></i>Fecha vencimiento</th>
                    <th class="d-none d-md-table-cell"><i class="fas fa-clock me-1 text-indigo-500"></i>Días vigencia</th>
                    <th class="d-none d-md-table-cell"><i class="fas fa-info-circle me-1 text-sky-500"></i>Estado</th>
                    <th class="d-none d-lg-table-cell"><i class="fas fa-exclamation-triangle me-1 text-orange-500"></i>Prioridad</th>
                    <th class="text-center"><i class="fas fa-paperclip me-1 text-slate-500"></i>Archivos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of obligaciones; let i = index">
                    <td class="px-3">{{ i + 1 }}</td>
                    <td>
                      <span class="me-2">{{ resolveName(item) }}</span>
                      <span class="badge rounded-pill"
                            [ngClass]="(fileCountMap[item?.id] || 0) > 0 ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'"
                            title="Archivos adjuntos">
                        <i class="fas fa-paperclip me-1"></i>{{ fileCountMap[item?.id] || 0 }}
                      </span>
                    </td>
                    <td class="d-none d-lg-table-cell">{{ resolveDescription(item) }}</td>
                    <td>
                      {{ item?.startDate ? formatDate(item?.startDate) : formatDateTime(item?.createdAt) }}
                    </td>
                    <td>
                      {{ formatDate(item?.dueDate) }}
                    </td>
                    <td class="d-none d-md-table-cell">
                      <span class="soft-badge" [ngClass]="{
                        'status-vencida': calculateDaysRemaining(item) < 0,
                        'status-pendiente': calculateDaysRemaining(item) >= 0 && calculateDaysRemaining(item) <= 5,
                        'status-enproceso': calculateDaysRemaining(item) > 5 && calculateDaysRemaining(item) <= 30,
                        'status-cumplido': calculateDaysRemaining(item) > 30
                      }">
                        <i class="fas me-1"
                          [ngClass]="{
                            'fa-exclamation-triangle text-rose-500': calculateDaysRemaining(item) < 0,
                            'fa-clock text-amber-500': calculateDaysRemaining(item) >= 0
                          }">
                        </i>
                        {{ displayDaysLabel(calculateDaysRemaining(item)) }}
                      </span>
                    </td>
                    <td class="d-none d-md-table-cell">
                      <span class="soft-badge"
                        [ngClass]="{
                          'status-pendiente': (displayStatus(item) || '').toUpperCase() === 'PENDIENTE',
                          'status-cumplido': ['CUMPLIDO','CUMPLIDA'].includes((displayStatus(item) || '').toUpperCase()),
                          'status-vencida': (displayStatus(item) || '').toUpperCase() === 'VENCIDA',
                          'status-enproceso': (displayStatus(item) || '').toUpperCase() === 'EN PROCESO'
                        }">
                        <i class="fas me-1"
                          [ngClass]="{
                            'fa-pause-circle text-sky-500': (displayStatus(item) || '').toUpperCase() === 'PENDIENTE',
                            'fa-check-circle text-green-500': ['CUMPLIDO','CUMPLIDA'].includes((displayStatus(item) || '').toUpperCase()),
                            'fa-exclamation-triangle text-rose-500': (displayStatus(item) || '').toUpperCase() === 'VENCIDA',
                            'fa-clock text-amber-500': (displayStatus(item) || '').toUpperCase() === 'EN PROCESO'
                          }">
                        </i>
                        {{ displayStatus(item) }}
                      </span>
                    </td>
                    <td class="d-none d-lg-table-cell">
                      <span class="soft-badge"
                        [ngClass]="{
                          'priority-alta': (item?.priority || 'MEDIA').toUpperCase() === 'ALTA',
                          'priority-media': (item?.priority || 'MEDIA').toUpperCase() === 'MEDIA',
                          'priority-baja': (item?.priority || 'MEDIA').toUpperCase() === 'BAJA'
                        }">
                        <i class="fas me-1"
                          [ngClass]="{
                            'fa-exclamation-triangle text-rose-500': (item?.priority || 'MEDIA').toUpperCase() === 'ALTA',
                            'fa-minus text-amber-500': (item?.priority || 'MEDIA').toUpperCase() === 'MEDIA',
                            'fa-arrow-down text-green-500': (item?.priority || 'MEDIA').toUpperCase() === 'BAJA'
                          }">
                        </i>
                        {{ item?.priority || 'MEDIA' }}
                      </span>
                    </td>
                    <td class="text-center">
                      <ng-container *ngIf="getTopPdfFiles(item?.id).length > 0; else noPdf">
                        <button class="btn btn-link btn-sm" *ngFor="let f of getTopPdfFiles(item?.id); let idx = index" (click)="previewFile(f)" [title]="'Ver PDF ' + (idx+1)">
                          <i class="fas fa-file-pdf"></i>
                        </button>
                      </ng-container>
                      <ng-template #noPdf>
                        <span class="text-muted">—</span>
                      </ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal de confirmación -->
        <div *ngIf="confirmVisible" class="modal-backdrop fade show" style="display:block;"></div>
        <div *ngIf="confirmVisible" class="modal d-block" tabindex="-1" role="dialog">
          <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
              <div class="modal-header py-2">
                <h6 class="modal-title mb-0">Confirmar envío</h6>
                <button type="button" class="btn-close" aria-label="Close" (click)="closeConfirm()"></button>
              </div>
              <div class="modal-body">
                <p class="mb-0">Se enviará una solicitud de autorización al administrador para aplicar estos cambios. ¿Deseas continuar?</p>
              </div>
              <div class="modal-footer py-2">
                <button class="btn btn-secondary btn-sm" (click)="closeConfirm()">Cancelar</button>
                <button class="btn btn-primary btn-sm" (click)="performSaveEditConfirm()">Enviar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MatrizLegalUsuarioComponent implements OnInit {
  ruc: string | null = null;
  inicioLink: any[] = ['/'];
  obligaciones: any[] = [];
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
            this.obligaciones = Array.isArray(relaciones) ? relaciones : [];
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
}
