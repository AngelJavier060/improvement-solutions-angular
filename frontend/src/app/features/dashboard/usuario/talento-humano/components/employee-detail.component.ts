import { Component, OnInit, OnDestroy, Renderer2, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { EmployeeResponse } from '../models/employee.model';
import { DocumentService, EmployeeDocumentResponse as ApiEmployeeDocumentResponse } from '../services/document.service';
import { EmployeeCourseService, EmployeeCourseResponse } from '../services/employee-course.service';
import { EmployeeCardService, EmployeeCardResponse } from '../services/employee-card.service';
import { Subscription, forkJoin, Subject, debounceTime, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../../core/services/auth.service';
import { ThFilePreviewService } from '../services/th-file-preview.service';
import { BusinessService } from '../../../../../services/business.service';

// Tipos auxiliares locales (para Employees tab unificada)
type EmployeeUnifiedItem = {
  type: 'document' | 'course' | 'card';
  name: string;
  category: string;
  issue_date: string;
  expiry_date: string;
  files: Array<{ id: number; file: string; file_name?: string; file_type?: string }>;
};

// (Tipos vienen del servicio de documentos; no duplicar interfaces locales)

interface NewDocumentForm {
  type_document_id: number | null;
  description: string;
  start_date: string;
  end_date: string;
}

@Component({
  selector: 'app-employee-detail',
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss']
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {

  employee: EmployeeResponse | null = null;
  employeeDocuments: ApiEmployeeDocumentResponse[] = [];
  documentTypes: Array<{ id: number; name: string; description?: string }> = [];
  newDocument: NewDocumentForm = {
    type_document_id: null,
    description: '',
    start_date: '',
    end_date: ''
  };
  selectedFiles: File[] = [];
  loading = false;
  loadingDocuments = false;
  cedula: string | null = null;
  businessRuc: string | null = null;
  businessId: number | null = null;
  activeTab: 'employees' | 'profile' | 'docs-certs' | 'courses' | 'documents' | 'cards' | 'history' = 'employees';
  showEditModal = false;
  private queryParamsSubscription: Subscription | null = null;
  private paramsSubscription: Subscription | null = null;
  private fallbackTimeoutId: any = null;

  // Selector de empleados (listado de trabajadores de la empresa)
  showEmployeePicker = false;
  pickerLoading = false;
  pickerSearch = '';
  pickerEmployees: EmployeeResponse[] = [];

  // Tab Empleados: listado y documentos activos por empleado
  listLoading = false;
  listEmployees: EmployeeResponse[] = [];
  // Paginación servidor
  pageIndex = 0;
  pageSize = 25;
  totalElements = 0;
  sortBy: string = 'apellidos';
  sortDir: 'asc' | 'desc' = 'asc';
  private filtersChange$ = new Subject<void>();
  private filtersSub?: Subscription;
  // Filtros de búsqueda
  filterCedula: string = '';
  filterNombre: string = '';
  filterApellido: string = '';
  filterCodigo: string = '';
  employeeDocsMap: { [beId: number]: ApiEmployeeDocumentResponse[] } = {};
  employeeDocsLoading: { [beId: number]: boolean } = {};
  showHistory = false;

  /** Salidas / reingresos desde employee_movements (auditoría). */
  laborMovements: Array<{
    id: number;
    movementType: string;
    effectiveDate: string;
    reason?: string | null;
    createdAt?: string | null;
  }> = [];
  loadingLaborMovements = false;

  // Expose Math to template (for Math.min / Math.max in HTML)
  Math = Math;

  kpiHiresThisMonth = 0;
  kpiHiresThisYear = 0;
  private hireKpisLoaded = false;

  // Vista unificada (Documentos + Cursos + Tarjetas) por empleado
  employeeItemsMap: { [beId: number]: EmployeeUnifiedItem[] | undefined } = {};
  employeeItemsLoading: { [beId: number]: boolean | undefined } = {};
  // Menú contextual por empleado (nombre clickeable)
  openMenuForId: number | null = null;
  /** Hoja de vida abierta sobre la pestaña Empleados (no navega). */
  cvEmployee: EmployeeResponse | null = null;
  /** Plantilla A4 del reporte de estado documental. */
  @ViewChild('estadoReport') estadoReport?: ElementRef<HTMLElement>;
  reportEmployee: EmployeeResponse | null = null;
  reportLogoUrl = '';
  reportPhotoUrl = '';
  reportCompanyName = '';
  exportingPdfBeId: number | null = null;
  zipMenuOpenFor: number | null = null;
  zippingBeId: number | null = null;
  zipPick: { document: boolean; course: boolean; card: boolean } = { document: false, course: false, card: false };
  private pdfDownloadName: string | null = null;
  private businessLogoPath = '';

  // ID del BusinessEmployee para usar en hijos (documentos, cursos, tarjetas)
  get businessEmployeeId(): number | null {
    if (this.businessId != null) return this.businessId; // almacenaremos el BusinessEmployee.id aquí
    const anyEmp = this.employee as any;
    if (anyEmp && typeof anyEmp.id === 'number') return anyEmp.id as number; // BusinessEmployeeResponseDto.id
    if (anyEmp && typeof anyEmp.businessId === 'number') return anyEmp.businessId as number; // fallback (company id, evitar usarlo)
    return null;
  }

  onFilterChanged(): void {
    this.filtersChange$.next();
  }

  get kpiExpiringCount(): number {
    let n = 0;
    Object.values(this.employeeItemsMap).forEach(items => {
      (items || []).forEach(it => {
        if (this.getExpiryStatus(it.expiry_date) === 'Próximo a vencer') n++;
      });
    });
    return n;
  }

  employeeHasExpiring(emp: EmployeeResponse | any): boolean {
    return this.itemsFor(emp).some(it => this.getExpiryStatus(it.expiry_date) === 'Próximo a vencer');
  }

  itemIcon(it: EmployeeUnifiedItem): string {
    if (it.type === 'course') return 'school';
    if (it.type === 'card') return 'credit_card';
    return 'person';
  }

  private parseHireDate(raw?: string | null): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  private loadHireKpis(): void {
    if (!this.businessRuc || this.hireKpisLoaded) return;
    this.hireKpisLoaded = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: (employees) => {
        const now = new Date();
        let month = 0;
        let year = 0;
        (employees || []).forEach(emp => {
          const d = this.parseHireDate((emp as any)?.fechaIngreso);
          if (!d) return;
          if (d.getFullYear() === now.getFullYear()) {
            year++;
            if (d.getMonth() === now.getMonth()) month++;
          }
        });
        this.kpiHiresThisMonth = month;
        this.kpiHiresThisYear = year;
      },
      error: () => {
        this.hireKpisLoaded = false;
      }
    });
  }

  getBusinessEmployeeIdFor(emp: EmployeeResponse | any): number {
    const anyEmp: any = emp as any;
    if (typeof anyEmp?.id === 'number') return anyEmp.id as number; // BusinessEmployee id
    if (typeof anyEmp?.businessId === 'number') return anyEmp.businessId as number; // fallback
    return -1;
  }

  movementLabel(type: string | undefined | null): string {
    if (type === 'DEACTIVATION') return 'Salida / desvinculación';
    if (type === 'REACTIVATION') return 'Reingreso';
    return type || '—';
  }

  loadLaborMovements(): void {
    const id = (this.employee as any)?.id as number | undefined;
    if (!id) {
      this.laborMovements = [];
      return;
    }
    this.loadingLaborMovements = true;
    this.employeeService.getEmployeeMovements(id).subscribe({
      next: (rows) => {
        this.laborMovements = rows || [];
        this.loadingLaborMovements = false;
      },
      error: () => {
        this.laborMovements = [];
        this.loadingLaborMovements = false;
      }
    });
  }

  onHistoryToggle(): void {
    // Limpiar cache para recargar con el nuevo criterio (activos vs histórico)
    this.employeeDocsMap = {};
    this.employeeDocsLoading = {} as any;
    // Limpiar también la vista unificada
    this.employeeItemsMap = {};
    this.employeeItemsLoading = {} as any;
    // Volver a cargar la lista para refrescar inmediatamente
    this.loadEmployeesList();
  }

  // Imagen para lista de empleados
  getImageUrlFor(emp: any): string {
    try {
      let rel = String(emp?.imagePath || '').replace(/\\/g, '/').replace(/^\.?\/?/, '').trim();
      if (!rel) return 'assets/img/default-avatar.svg';
      if (/^https?:\/\//i.test(rel)) return rel;
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      if (rel.startsWith('profiles/') || rel.includes('/profiles/')) return `/api/files/${rel}`;
      if (!rel.includes('/')) return `/api/files/profiles/${rel}`;
      return `/api/files/${rel}`;
    } catch { return 'assets/img/default-avatar.svg'; }
  }

  docsFor(emp: EmployeeResponse | any): ApiEmployeeDocumentResponse[] {
    const id = this.getBusinessEmployeeIdFor(emp);
    const docs = this.employeeDocsMap[id];
    return docs ? docs : [];
  }

  // === Unificación de ítems (Documentos + Cursos + Tarjetas) ===
  ensureEmployeeOverview(emp: EmployeeResponse): boolean {
    const beId = this.getBusinessEmployeeIdFor(emp);
    if (beId < 0) return true;
    if (this.employeeItemsMap[beId] || this.employeeItemsLoading[beId]) return true;
    this.employeeItemsLoading[beId] = true;

    forkJoin({
      // Siempre traer con histórico para poder decidir en UI qué mostrar
      docs: this.documentService.getByBusinessEmployeeId(beId, true),
      courses: this.employeeCourseService.getByBusinessEmployeeId(beId, true),
      cards: this.employeeCardService.getByBusinessEmployeeId(beId, true)
    }).subscribe({
      next: ({ docs, courses, cards }) => {
        const items: EmployeeUnifiedItem[] = [];
        // Documentos
        (docs || []).forEach(d => items.push({
          type: 'document',
          name: d.type_document?.name || 'Documento',
          category: 'Datos personales',
          issue_date: d.start_date || '',
          expiry_date: d.end_date || '',
          files: d.files || []
        }));
        // Cursos
        (courses || []).forEach(c => items.push({
          type: 'course',
          name: c.course?.name || 'Curso/Certificación',
          category: 'Entrenamientos Externo',
          issue_date: c.issue_date || '',
          expiry_date: c.expiry_date || '',
          files: (c as any).files || []
        }));
        // Tarjetas
        (cards || []).forEach(cd => items.push({
          type: 'card',
          name: cd.card?.name || 'Tarjeta',
          category: 'Tarjetas',
          issue_date: cd.issue_date || '',
          expiry_date: cd.expiry_date || '',
          files: (cd as any).files || []
        }));

        // Filtrado/agrupación para la vista de Empleados
        const normalize = (s: string): string => {
          try {
            return String(s || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, ' ')
              .trim()
              .replace(/\s+/g, ' ');
          } catch { return String(s || '').toLowerCase().trim(); }
        };
        const score = (it: EmployeeUnifiedItem): number => {
          const toTs = (s?: string) => {
            if (!s) return Number.NEGATIVE_INFINITY;
            const t = new Date(s as string).getTime();
            return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
          };
          const exp = toTs(it.expiry_date);
          if (exp !== Number.NEGATIVE_INFINITY) return exp;
          return toTs(it.issue_date);
        };

        let visible: EmployeeUnifiedItem[] = [];
        if (this.showHistory) {
          // Mostrar solo históricos (caducados)
          visible = (items || []).filter(it => this.getExpiryStatus(it.expiry_date) === 'Caducado');
        } else {
          // Mostrar solo vigente/más reciente por tipo+nombre
          const byKey = new Map<string, EmployeeUnifiedItem>();
          for (const it of (items || [])) {
            const key = `${it.type}:${normalize(it.name)}`;
            const prev = byKey.get(key);
            if (!prev || score(it) > score(prev)) {
              byKey.set(key, it);
            }
          }
          visible = Array.from(byKey.values()).filter(it => this.getExpiryStatus(it.expiry_date) !== 'Caducado');
        }

        // Orden por fecha de vencimiento ascendente (vacías al final)
        visible.sort((a, b) => {
          const ta = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.POSITIVE_INFINITY;
          const tb = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.POSITIVE_INFINITY;
          return ta - tb;
        });

        this.employeeItemsMap[beId] = visible;
        delete this.employeeItemsLoading[beId];
      },
      error: (err) => {
        console.error('Error unificando registros del empleado', err);
        this.employeeItemsMap[beId] = [];
        delete this.employeeItemsLoading[beId];
      }
    });
    return true;
  }

  itemsFor(emp: EmployeeResponse | any): EmployeeUnifiedItem[] {
    const id = this.getBusinessEmployeeIdFor(emp);
    return this.employeeItemsMap[id] || [];
  }

  itemsOfType(emp: EmployeeResponse | any, type: 'document' | 'course' | 'card'): EmployeeUnifiedItem[] {
    return this.itemsFor(emp).filter(it => it.type === type);
  }

  sectionHasAlert(emp: EmployeeResponse | any, type?: 'document' | 'course' | 'card'): boolean {
    const items = type ? this.itemsOfType(emp, type) : this.itemsFor(emp);
    return items.some(it => this.getExpiryStatus(it.expiry_date) === 'Próximo a vencer');
  }

  employeeExpiringCount(emp: EmployeeResponse | any): number {
    return this.itemsFor(emp).filter(it => this.getExpiryStatus(it.expiry_date) === 'Próximo a vencer').length;
  }

  get kpiVigentesCount(): number {
    let n = 0;
    Object.values(this.employeeItemsMap).forEach(items => {
      (items || []).forEach(it => {
        if (this.getExpiryStatus(it.expiry_date) === 'Vigente') n++;
      });
    });
    return n;
  }

  sectionHint(emp: EmployeeResponse | any, type: 'document' | 'course' | 'card'): string {
    const items = this.itemsOfType(emp, type);
    const warn = items.filter(it => this.getExpiryStatus(it.expiry_date) === 'Próximo a vencer').length;
    if (warn > 0) {
      return warn === 1 ? '1 Próximo a vencer' : `${warn} Próximos a vencer`;
    }
    const n = items.length;
    if (type === 'card') return n === 1 ? '1 Registrada' : `${n} Registradas`;
    return n === 1 ? '1 Registrado' : `${n} Registrados`;
  }

  statusChipLabel(dateStr?: string | null): string {
    const s = this.getExpiryStatus(dateStr);
    return s === '-' ? 'Sin vigencia' : s;
  }

  workplaceLabel(emp: EmployeeResponse | any): string {
    return emp?.departmentName || emp?.contractorBlockName || emp?.contractorCompanyName || '—';
  }

  printEmployeesView(): void {
    window.print();
  }

  // === Empleados (lista por empresa) — solo ACTIVOS; docs se conservan al desactivar ===
  loadEmployeesList(): void {
    if (!this.businessRuc) return;
    this.listLoading = true;
    // limpiar caches para forzar recarga de registros unificados
    this.employeeItemsMap = {};
    this.employeeItemsLoading = {} as any;
    this.employeeDocsMap = {};
    this.employeeDocsLoading = {} as any;
    this.employeeService.getEmployeesByBusinessRucPaginated(this.businessRuc, {
      page: this.pageIndex,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      cedula: (this.filterCedula || '').trim() || undefined,
      nombres: (this.filterNombre || '').trim() || undefined,
      apellidos: (this.filterApellido || '').trim() || undefined,
      codigo: (this.filterCodigo || '').trim() || undefined,
      // Solo vigentes: inactivos (p.ej. Elvia) no salen aquí; sus docs quedan en BD/histórico
      activeOnly: true,
    }).subscribe({
      next: (page) => {
        const content = page?.content || [];
        // Red de seguridad cliente: nunca mostrar inactivos en esta pestaña
        this.listEmployees = content.filter(emp => this.isEmployeeActive(emp));
        // total del servidor (ya filtrado por activeOnly); si el cliente quitó alguno, ajusta
        const serverTotal = page?.totalElements ?? 0;
        const removed = content.length - this.listEmployees.length;
        this.totalElements = Math.max(0, serverTotal - removed);
        this.listLoading = false;
      },
      error: (err) => {
        console.error('Error cargando listado de empleados', err);
        this.listEmployees = [];
        this.totalElements = 0;
        this.listLoading = false;
      }
    });
  }

  /**
   * Activo/vigente (misma prioridad que gestión-empleados).
   * active=false o status INACTIVO → no vigente.
   */
  isEmployeeActive(emp: any): boolean {
    if (!emp) return false;
    if (typeof emp.active === 'boolean') {
      return emp.active === true;
    }
    const s = emp?.status;
    if (typeof s === 'boolean') return s === true;
    if (typeof s === 'string') {
      const u = s.trim().toUpperCase();
      if (u === 'INACTIVO' || u === 'INACTIVE' || u === '0' || u === 'FALSE') return false;
      return u === 'ACTIVO' || u === 'ACTIVE' || u === '1' || u === 'TRUE';
    }
    return false;
  }

  nextPage(): void { if ((this.pageIndex + 1) * this.pageSize < this.totalElements) { this.pageIndex++; this.loadEmployeesList(); } }
  prevPage(): void { if (this.pageIndex > 0) { this.pageIndex--; this.loadEmployeesList(); } }
  changePageSize(size: number): void {
    this.pageSize = Number(size) || 25;
    this.pageIndex = 0;
    this.loadEmployeesList();
  }

  ensureEmployeeDocs(emp: EmployeeResponse): void {
    const beId: number | null = this.getBusinessEmployeeIdFor(emp);
    if (!beId) return;
    if (this.employeeDocsMap[beId] || this.employeeDocsLoading[beId]) return;
    this.employeeDocsLoading[beId] = true;
    this.documentService.getByBusinessEmployeeId(beId, this.showHistory).subscribe({
      next: (docs) => {
        this.employeeDocsMap[beId] = docs || [];
        delete this.employeeDocsLoading[beId];
      },
      error: (err) => {
        console.error('Error cargando documentos del empleado', err);
        this.employeeDocsMap[beId] = [];
        delete this.employeeDocsLoading[beId];
      }
    });
  }

  // Helpers de vigencia y archivo para el listado
  getDaysLeft(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const end = new Date(dateStr as string);
      if (isNaN(end.getTime())) return '-';
      const today = new Date();
      end.setHours(0,0,0,0); today.setHours(0,0,0,0);
      const diffMs = end.getTime() - today.getTime();
      return String(Math.round(diffMs / (1000*60*60*24)));
    } catch { return '-'; }
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
    const s = this.getExpiryStatus(dateStr);
    if (s === 'Caducado') return 'bg-danger';
    if (s === 'Próximo a vencer') return 'bg-warning text-dark';
    if (s === 'Vigente') return 'bg-success';
    return 'bg-secondary';
  }

  expiryTone(dateStr?: string | null): 'warn' | 'ok' | 'expired' | 'muted' {
    const s = this.getExpiryStatus(dateStr);
    if (s === 'Próximo a vencer') return 'warn';
    if (s === 'Vigente') return 'ok';
    if (s === 'Caducado') return 'expired';
    return 'muted';
  }

  // Solo mostrar botones PDF si el archivo es PDF
  isPdf(file: { file_type?: string; file_name?: string } | null | undefined): boolean {
    if (!file) return false;
    const type = (file.file_type || '').toLowerCase();
    const name = (file.file_name || '').toLowerCase();
    return type.includes('pdf') || name.endsWith('.pdf');
  }

  private pdfOverlayEl: HTMLElement | null = null;
  private pdfBlobUrl: string | null = null;
  private pdfKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private bodyOverflowBackup: string | null = null;

  openDocFile(file: { file: string; file_name?: string; file_type?: string }): void {
    this.closePdfPreview();
    this.filePreview.open(file);
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
    this.pdfDownloadName = null;
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
      overflow: 'hidden'
    } as CSSStyleDeclaration);

    root.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#f9fafb;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;font:600 14px/1.3 Inter,system-ui,sans-serif;">
            <span style="background:#0058be;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;">PDF</span>
            <span class="ed-pdf-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <button type="button" class="ed-pdf-download" title="Descargar PDF"
              style="display:none;border:0;border-radius:6px;background:#0058be;color:#fff;font:600 13px/1 Inter,system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
              Descargar
            </button>
            <button type="button" class="ed-pdf-close" title="Cerrar (Esc)"
              style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 Inter,system-ui,sans-serif;padding:8px 14px;cursor:pointer;">
              ✕ Cerrar
            </button>
          </div>
        </div>
        <div class="ed-pdf-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;

    const nameEl = root.querySelector('.ed-pdf-name') as HTMLElement;
    nameEl.textContent = title;
    const closeBtn = root.querySelector('.ed-pdf-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closePdfPreview());
    const downloadBtn = root.querySelector('.ed-pdf-download') as HTMLButtonElement;
    if (this.pdfDownloadName) {
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.addEventListener('click', () => this.downloadCurrentPdf());
    }

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
    this.pdfKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePdfPreview();
      }
    };
    document.addEventListener('keydown', this.pdfKeyHandler);
  }

  downloadDocFile(file: { file: string; file_name?: string }): void {
    const url = this.normalizeFileUrl(file?.file || '');
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
        const blobWithType = new Blob([blob], { type: contentType });
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blobWithType);
        a.href = objectUrl;
        a.download = (file.file_name && String(file.file_name)) || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: () => alert('No se pudo descargar el archivo')
    });
  }

  @HostListener('document:click')
  closeZipMenuOnOutsideClick(): void {
    if (this.zipMenuOpenFor !== null) this.zipMenuOpenFor = null;
  }

  isZipMenuOpen(emp: EmployeeResponse): boolean {
    return this.zipMenuOpenFor !== null && this.zipMenuOpenFor === this.getBusinessEmployeeIdFor(emp);
  }

  isZipping(emp: EmployeeResponse): boolean {
    return this.zippingBeId !== null && this.zippingBeId === this.getBusinessEmployeeIdFor(emp);
  }

  toggleZipMenu(emp: EmployeeResponse, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (this.isZipping(emp)) return;
    const beId = this.getBusinessEmployeeIdFor(emp);
    if (this.zipMenuOpenFor === beId) {
      this.zipMenuOpenFor = null;
      return;
    }
    this.zipPick = { document: false, course: false, card: false };
    this.zipMenuOpenFor = beId;
  }

  toggleZipPick(type: 'document' | 'course' | 'card', ev?: Event): void {
    ev?.stopPropagation();
    this.zipPick = { ...this.zipPick, [type]: !this.zipPick[type] };
  }

  selectAllZipSections(emp: EmployeeResponse, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.zipPick = {
      document: this.sectionHasFiles(emp, 'document'),
      course: this.sectionHasFiles(emp, 'course'),
      card: this.sectionHasFiles(emp, 'card')
    };
  }

  hasZipSelection(emp: EmployeeResponse | any): boolean {
    return (this.zipPick.document && this.sectionHasFiles(emp, 'document'))
      || (this.zipPick.course && this.sectionHasFiles(emp, 'course'))
      || (this.zipPick.card && this.sectionHasFiles(emp, 'card'));
  }

  sectionHasFiles(emp: EmployeeResponse | any, type?: 'document' | 'course' | 'card'): boolean {
    const items = type ? this.itemsOfType(emp, type) : this.itemsFor(emp);
    return items.some(it => (it.files || []).some(f => !!f?.file));
  }

  async downloadEmployeeZip(emp: EmployeeResponse, ev?: Event): Promise<void> {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!emp || this.zippingBeId !== null) return;
    const types: Array<'document' | 'course' | 'card'> = [];
    if (this.zipPick.document) types.push('document');
    if (this.zipPick.course) types.push('course');
    if (this.zipPick.card) types.push('card');
    this.zipMenuOpenFor = null;
    const beId = this.getBusinessEmployeeIdFor(emp);
    this.ensureEmployeeOverview(emp);
    const started = Date.now();
    while (this.employeeItemsLoading[beId] && Date.now() - started < 8000) {
      await new Promise(r => setTimeout(r, 80));
    }
    const items = types.length
      ? this.itemsFor(emp).filter(it => types.includes(it.type))
      : [];
    const entries: Array<{ folder: string; name: string; url: string }> = [];
    items.forEach(it => {
      const folder = it.type === 'course' ? 'Cursos' : it.type === 'card' ? 'Tarjetas' : 'Documentos';
      (it.files || []).forEach((f, idx) => {
        if (!f?.file) return;
        const rawName = f.file_name || `${it.name || 'archivo'}-${idx + 1}`;
        entries.push({ folder, name: this.safeZipName(rawName), url: this.normalizeFileUrl(f.file) });
      });
    });
    if (!entries.length) {
      alert('No hay archivos adjuntos para esa selección.');
      return;
    }
    this.zippingBeId = beId;
    this.cdr.detectChanges();
    try {
      const mod: any = await import('jszip');
      const JSZip = mod.default || mod;
      const zip = new JSZip();
      const used = new Set<string>();
      let added = 0;
      for (const entry of entries) {
        try {
          const blob = await firstValueFrom(this.http.get(entry.url, { responseType: 'blob' }));
          if (!blob || blob.size === 0) continue;
          let path = `${entry.folder}/${entry.name}`;
          let n = 1;
          const dot = entry.name.lastIndexOf('.');
          const base = dot > 0 ? entry.name.slice(0, dot) : entry.name;
          const ext = dot > 0 ? entry.name.slice(dot) : '';
          while (used.has(path.toLowerCase())) {
            path = `${entry.folder}/${base}-${++n}${ext}`;
          }
          used.add(path.toLowerCase());
          zip.file(path, blob);
          added++;
        } catch (err) {
          console.warn('No se pudo incluir en el ZIP', entry.url, err);
        }
      }
      if (!added) {
        alert('No se pudieron descargar los archivos seleccionados.');
        return;
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const labels: string[] = [];
      if (types.includes('document')) labels.push('documentos');
      if (types.includes('course')) labels.push('cursos');
      if (types.includes('card')) labels.push('tarjetas');
      const scopeLabel = labels.length === 3 ? 'expediente' : (labels.join('-') || 'expediente');
      const safeName = (this.statusReportName(emp) || emp.cedula || 'trabajador').replace(/[^\w-]+/g, '_');
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(content);
      a.href = objectUrl;
      a.download = `${scopeLabel}-${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el ZIP. Intente de nuevo.');
    } finally {
      this.zippingBeId = null;
      this.cdr.detectChanges();
    }
  }

  private safeZipName(raw: string): string {
    const cleaned = String(raw || 'archivo').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
    return cleaned || 'archivo';
  }

  // Normalizar URL de archivos (PDFs, imágenes, etc.) servidos por el backend
  private normalizeFileUrl(raw: string): string {
    try {
      let rel = String(raw || '').replace(/\\/g, '/').trim();
      if (!rel) return '/api/files/unknown.pdf';
      // Absolutas
      if (/^https?:\/\//i.test(rel)) return rel;
      // Si ya viene con /api/... o api/..., devolver directo (asegurando el slash inicial)
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('api/')) return `/${rel}`;
      // Limpiar prefijos locales
      rel = rel.replace(/^\.\/+/, '');
      if (rel.startsWith('/')) rel = rel.substring(1);
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      // Caso general: servir desde /api/files/
      return `/api/files/${rel}`;
    } catch { return '/api/files/unknown.pdf'; }
  }

  toggleEmployeeMenu(beId: number): void {
    this.openMenuForId = this.openMenuForId === beId ? null : beId;
  }

  goToEmployeeTab(emp: EmployeeResponse, tab: 'profile' | 'documents' | 'courses' | 'cards' | 'history' | 'docs-certs'): void {
    this.openMenuForId = null;
    this.zipMenuOpenFor = null;
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'employee', emp.cedula], {
        queryParams: { tab }
      });
    }
  }

  openEmployeeCv(emp: EmployeeResponse, ev?: Event): void {
    ev?.preventDefault();
    ev?.stopPropagation();
    this.cvEmployee = emp;
  }

  closeEmployeeCv(): void {
    this.cvEmployee = null;
  }

  isExportingStatusPdf(emp: EmployeeResponse): boolean {
    return this.exportingPdfBeId !== null && this.exportingPdfBeId === this.getBusinessEmployeeIdFor(emp);
  }

  statusReportName(emp: EmployeeResponse | any): string {
    return `${emp?.nombres || emp?.name || ''} ${emp?.apellidos || ''}`.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  statusReportDownloadDate(): string {
    return new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  statusReportCode(emp: EmployeeResponse | any): string {
    const year = new Date().getFullYear();
    const code = String(emp?.codigoTrabajador || emp?.cedula || '000').replace(/\s+/g, '');
    const tail = code.slice(-3).padStart(3, '0');
    return `REP-${year}-${tail}`;
  }

  statusReportVerifyId(emp: EmployeeResponse | any): string {
    const year = new Date().getFullYear();
    const code = String(emp?.codigoTrabajador || emp?.cedula || '000').replace(/\s+/g, '');
    return `#HSEQ-${code}-${year}`;
  }

  reportBrandLine(part: 'top' | 'bottom'): string {
    const name = (this.reportCompanyName || 'Improvement Solutions').trim();
    const bits = name.split(/\s+/);
    if (part === 'top') return (bits[0] || 'IMPROVEMENT').toUpperCase();
    return (bits.slice(1).join(' ') || 'SOLUTIONS').toUpperCase();
  }

  formatReportDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  vigenciaText(dateStr?: string | null): string {
    const raw = this.getDaysLeft(dateStr);
    if (raw === '-') return '—';
    return `${raw} días`;
  }

  statusDataTone(dateStr?: string | null): 'ok' | 'warn' | 'err' | 'muted' {
    const t = this.expiryTone(dateStr);
    if (t === 'expired') return 'err';
    return t;
  }

  statusReportSections(emp: EmployeeResponse | any): Array<{ code: string; label: string; icon: string; items: EmployeeUnifiedItem[] }> {
    const items = this.itemsFor(emp);
    return [
      { code: 'document', label: 'Documentos personales', icon: 'badge', items: items.filter(i => i.type === 'document') },
      { code: 'course', label: 'Cursos', icon: 'school', items: items.filter(i => i.type === 'course') },
      { code: 'card', label: 'Tarjetas', icon: 'credit_card', items: items.filter(i => i.type === 'card') }
    ];
  }

  async exportEmployeeStatusPdf(emp: EmployeeResponse, ev?: Event): Promise<void> {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (!emp || this.exportingPdfBeId !== null) return;
    const beId = this.getBusinessEmployeeIdFor(emp);
    this.exportingPdfBeId = beId;
    this.ensureEmployeeOverview(emp);
    const started = Date.now();
    while (this.employeeItemsLoading[beId] && Date.now() - started < 8000) {
      await new Promise(r => setTimeout(r, 80));
    }
    const photoUrl = this.getImageUrlFor(emp);
    const [logoData, photoData] = await Promise.all([
      this.businessLogoPath ? this.toDataUrl(this.businessLogoPath) : Promise.resolve(null),
      photoUrl ? this.toDataUrl(photoUrl) : Promise.resolve(null)
    ]);
    this.reportPhotoUrl = photoData || photoUrl;
    this.reportLogoUrl = logoData || this.businessLogoPath;
    this.reportEmployee = emp;
    this.cdr.detectChanges();
    await new Promise(r => setTimeout(r, 0));
    this.cdr.detectChanges();
    await new Promise(r => setTimeout(r, 120));
    const el = this.estadoReport?.nativeElement;
    if (!el) {
      this.exportingPdfBeId = null;
      this.reportEmployee = null;
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
        const src = canvas.getContext('2d');
        let srcY = 0;
        let pageIndex = 0;
        while (srcY < canvas.height) {
          const remaining = canvas.height - srcY;
          if (remaining < 16) break;
          const idealEnd = Math.min(srcY + pageHeightPx, canvas.height);
          const cutY = idealEnd >= canvas.height
            ? canvas.height
            : this.findPdfRowBreak(src, canvas.width, srcY, idealEnd);
          const sliceH = cutY - srcY;
          if (sliceH < 16) break;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext('2d');
          if (!ctx) break;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sliceH / pxPerMm);
          srcY = this.skipPdfBlankRows(src, canvas.width, canvas.height, cutY);
          pageIndex++;
        }
      }
      const safeName = (this.statusReportName(emp) || emp.cedula || 'trabajador').replace(/[^\w-]+/g, '_');
      const fileName = `estado-documentacion-${safeName}.pdf`;
      const blob = pdf.output('blob');
      this.closePdfPreview();
      this.pdfDownloadName = fileName;
      this.pdfBlobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      this.mountPdfViewerOverlay(`Estado de documentación — ${this.statusReportName(emp)}`, this.pdfBlobUrl);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el PDF. Intente de nuevo.');
    } finally {
      this.exportingPdfBeId = null;
      this.reportEmployee = null;
      this.cdr.detectChanges();
    }
  }

  private downloadCurrentPdf(): void {
    if (!this.pdfBlobUrl || !this.pdfDownloadName) return;
    const a = document.createElement('a');
    a.href = this.pdfBlobUrl;
    a.download = this.pdfDownloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private loadBusinessForReport(): void {
    if (!this.businessRuc) return;
    this.businessService.getByRuc(this.businessRuc).subscribe({
      next: (b: any) => {
        this.reportCompanyName = (b?.nameShort || b?.name || '').toString();
        const logo = b?.logo || '';
        if (!logo) return;
        this.businessLogoPath = logo.startsWith('http') ? logo
          : logo.startsWith('logos/') ? `/api/files/${logo}`
          : `/api/files/logos/${logo}`;
        this.reportLogoUrl = this.businessLogoPath;
      },
      error: () => { /* sin logo */ }
    });
  }

  private async toDataUrl(url: string): Promise<string | null> {
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private findPdfRowBreak(
    ctx: CanvasRenderingContext2D | null,
    width: number,
    startY: number,
    idealEnd: number
  ): number {
    if (!ctx) return idealEnd;
    const minY = startY + Math.floor((idealEnd - startY) * 0.55);
    let best = idealEnd;
    let bestRun = 0;
    let run = 0;
    let runStart = idealEnd;
    for (let y = idealEnd - 1; y >= minY; y--) {
      if (this.isPdfMostlyWhiteRow(ctx, width, y)) {
        run++;
        runStart = y;
        if (run >= 3 && run >= bestRun) {
          bestRun = run;
          best = runStart + Math.floor(run / 2);
        }
      } else {
        run = 0;
      }
    }
    return best;
  }

  private skipPdfBlankRows(
    ctx: CanvasRenderingContext2D | null,
    width: number,
    height: number,
    y: number
  ): number {
    if (!ctx) return y;
    let next = y;
    while (next < height && this.isPdfMostlyWhiteRow(ctx, width, next)) next++;
    return next;
  }

  private isPdfMostlyWhiteRow(ctx: CanvasRenderingContext2D, width: number, y: number): boolean {
    try {
      const data = ctx.getImageData(0, y, width, 1).data;
      let dark = 0;
      const step = 12;
      for (let i = 0; i < data.length; i += 4 * step) {
        if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) {
          dark++;
          if (dark > 3) return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  private tryNavigateToFirstEmployee(): void {
    if (!this.businessRuc) return;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: (list) => {
        const first = (list || [])[0];
        if (first && first.cedula) {
          this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'employee', first.cedula], {
            queryParams: { tab: this.activeTab }
          });
        } else {
          this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'gestion-empleados']);
        }
      },
      error: () => {
        this.router.navigate(['/usuario', this.businessRuc!, 'talento-humano', 'gestion-empleados']);
      }
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private http: HttpClient,
    private documentService: DocumentService,
    private employeeCourseService: EmployeeCourseService,
    private employeeCardService: EmployeeCardService,
    private renderer: Renderer2,
    private authService: AuthService,
    private filePreview: ThFilePreviewService,
    private businessService: BusinessService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Fase C */
  canWrite = false;

  ngOnInit(): void {
    this.canWrite = this.authService.canWrite();
    this.cedula = this.route.snapshot.params['cedula'];
    // Intentar extraer businessRuc desde rutas padre
    this.businessRuc = this.findParamUp('businessRuc') || this.findParamUp('ruc');
    const initTab = this.route.snapshot.queryParams['tab'];
    if (initTab && ['employees','courses', 'documents', 'profile', 'cards', 'history', 'docs-certs'].includes(initTab)) {
      this.activeTab = initTab as any;
    }
    if (this.cedula) {
      this.loadEmployee();
      this.loadDocumentTypes();
    }
    this.loadHireKpis();
    this.loadBusinessForReport();

    this.fallbackTimeoutId = setTimeout(() => {
      if (!this.loading && !this.employee) {
        this.tryNavigateToFirstEmployee();
      }
    }, 2500);

    // Suscribirse a cambios en query params para cambiar el tab
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['employees','courses', 'documents', 'profile', 'cards', 'history', 'docs-certs'].includes(tab)) {
        this.activeTab = tab as 'employees' | 'courses' | 'documents' | 'profile' | 'cards' | 'history' | 'docs-certs';
        // Si se navega directamente a documentos vía URL, asegurarnos de cargar
        if (this.activeTab === 'documents') {
          this.loadEmployeeDocuments();
        } else if (this.activeTab === 'employees') {
          this.loadEmployeesList();
        }
      }
    });

    // Suscribirse a cambios en parámetros (cedula) para re-cargar el empleado seleccionado
    this.paramsSubscription = this.route.params.subscribe(p => {
      const newCed = p['cedula'];
      if (newCed && newCed !== this.cedula) {
        this.cedula = newCed;
        this.loadEmployee();
        if (this.activeTab === 'documents') {
          this.loadEmployeeDocuments();
        }
      }
    });

    // Debounce para filtros del listado de empleados (server-side)
    this.filtersSub = this.filtersChange$.pipe(debounceTime(300)).subscribe(() => {
      this.pageIndex = 0; // Reiniciar a primera página al cambiar filtros
      this.loadEmployeesList();
    });
  }

  ngOnDestroy(): void {
    this.closeEmployeeCv();
    this.closePdfPreview();
    this.filePreview.close();
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
    this.filtersSub?.unsubscribe();
    if (this.paramsSubscription) {
      this.paramsSubscription.unsubscribe();
    }
    if (this.fallbackTimeoutId) {
      clearTimeout(this.fallbackTimeoutId);
      this.fallbackTimeoutId = null;
    }
  }

  // Fallback cuando falla la carga de la imagen
  onImgError(event: Event): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) {
      img.src = 'assets/img/default-avatar.svg';
    }
  }

  // Llamado por componentes hijos (Documentos/Cursos/Tarjetas) cuando hay cambios
  onChildChanged(): void {
    const beId = this.businessEmployeeId;
    if (!beId) return;
    // Invalidar cache para este empleado
    delete this.employeeItemsMap[beId];
    delete this.employeeItemsLoading[beId];
    // Si estamos en la pestaña de Empleados, refrescar de inmediato
    if (this.activeTab === 'employees') {
      this.ensureEmployeeOverview({ id: beId } as any);
    }
  }

  loadEmployee(): void {
    if (!this.cedula) return;
    this.loading = true;
    if (this.businessRuc) {
      this.employeeService.getEmployeeByCedulaScopedByRuc(this.businessRuc, this.cedula).subscribe({
        next: (emp) => {
          this.employee = emp || null;
          if (this.employee && (this.employee as any).id) {
            this.businessId = (this.employee as any).id as number;
          } else if (this.employee && (this.employee as any).businessId) {
            this.businessId = (this.employee as any).businessId as number;
          }
          this.loading = false;
          this.loadLaborMovements();
          if (!this.employee) {
            this.tryNavigateToFirstEmployee();
          }
        },
        error: (error) => {
          console.error('Error cargando empleado por cédula y RUC:', error);
          this.employee = null;
          this.laborMovements = [];
          this.loading = false;
          this.tryNavigateToFirstEmployee();
        }
      });
    } else {
      // Fallback: cualquier empresa por cédula
      this.employeeService.getEmployeeByCedula(this.cedula).subscribe({
        next: (emp) => {
          this.employee = emp;
          if (this.employee && (this.employee as any).id) {
            this.businessId = (this.employee as any).id as number; // BusinessEmployee id
          } else if (this.employee && (this.employee as any).businessId) {
            this.businessId = (this.employee as any).businessId as number; // fallback
          }
          this.loading = false;
          this.loadLaborMovements();
        },
        error: (error) => {
          console.error('Error cargando empleado por cédula:', error);
          this.employee = null;
          this.laborMovements = [];
          this.loading = false;
        }
      });
    }
  }

  private findParamUp(key: string): string | null {
    let r: any = this.route;
    while (r) {
      const val = r.snapshot?.params?.[key];
      if (val !== undefined) {
        return val;
      }
      r = r.parent;
    }
    return null;
  }

  loadDocumentTypes(): void {
    // Cargar tipos de documento disponibles
    // Por ahora, datos de ejemplo
    this.documentTypes = [
      { id: 1, name: 'Cédula', description: 'Documento de identidad' },
      { id: 2, name: 'Título Profesional', description: 'Título universitario' },
      { id: 3, name: 'Certificado Médico', description: 'Certificado de salud' },
      { id: 4, name: 'Referencias Laborales', description: 'Cartas de recomendación' },
      { id: 5, name: 'Certificado de Trabajo', description: 'Certificado laboral' }
    ];
  }

  loadEmployeeDocuments(): void {
    if (!this.cedula) return;

    this.loadingDocuments = true;
    this.http.get<ApiEmployeeDocumentResponse[]>(`/api/document/${this.cedula}/cedula`).subscribe({
      next: (documents) => {
        this.employeeDocuments = documents;
        this.loadingDocuments = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.employeeDocuments = [];
        this.loadingDocuments = false;
      }
    });
  }

  viewDocumentFiles(document: ApiEmployeeDocumentResponse): void {
    if (document.files && document.files.length > 0) {
      // Mostrar modal con lista de archivos
      const fileList = document.files.map((f: any) => `${f.file_name} (${f.file_type})`).join('\n');
      alert(`Archivos del documento "${document.type_document?.name}":\n\n${fileList}`);
    }
  }

  deleteDocument(documentId: number): void {
    if (confirm('¿Está seguro de que desea eliminar este documento?')) {
      this.http.delete(`/api/employee_document/${documentId}`).subscribe({
        next: () => {
          // Recargar documentos después de eliminar
          this.loadEmployeeDocuments();
          alert('Documento eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          alert('Error al eliminar el documento');
        }
      });
    }
  }

  onFileSelected(event: any): void {
    this.selectedFiles = Array.from(event.target.files);
  }

  submitDocumentForm(): void {
    if (!this.employee || !this.newDocument.type_document_id) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    this.loadingDocuments = true;

    const formData = new FormData();
    formData.append('business_employee_id', this.employee.id.toString());
    formData.append('type_document_id', this.newDocument.type_document_id.toString());

    if (this.newDocument.description) {
      formData.append('description', this.newDocument.description);
    }
    if (this.newDocument.start_date) {
      formData.append('start_date', this.newDocument.start_date);
    }
    if (this.newDocument.end_date) {
      formData.append('end_date', this.newDocument.end_date);
    }

    // Agregar archivos
    this.selectedFiles.forEach((file, index) => {
      formData.append('files[]', file);
    });

    this.http.post('/api/employee_document', formData).subscribe({
      next: (response) => {
        console.log('Documento creado:', response);
        this.loadingDocuments = false;
        // Limpiar formulario
        this.newDocument = {
          type_document_id: null,
          description: '',
          start_date: '',
          end_date: ''
        };
        this.selectedFiles = [];
        // Recargar documentos
        this.loadEmployeeDocuments();
        alert('Documento guardado exitosamente');
      },
      error: (error) => {
        console.error('Error creating document:', error);
        this.loadingDocuments = false;
        alert('Error al guardar el documento');
      }
    });
  }

  setActiveTab(tab: 'employees' | 'profile' | 'docs-certs' | 'courses' | 'documents' | 'cards' | 'history'): void {
    // Actualizar estado local
    this.activeTab = tab as any;
    if (tab === 'documents') this.loadEmployeeDocuments();
    if (tab === 'employees') this.loadEmployeesList();

    // Sincronizar con la URL como ?tab=...
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // === Employee Picker ===
  openEmployeePicker(): void {
    if (!this.businessRuc) {
      alert('No se encontró el RUC de la empresa en la ruta.');
      return;
    }
    this.showEmployeePicker = true;
    this.loadEmployeesForPicker();
  }

  closeEmployeePicker(): void {
    this.showEmployeePicker = false;
    this.pickerSearch = '';
  }

  loadEmployeesForPicker(): void {
    if (!this.businessRuc) return;
    this.pickerLoading = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: (list) => {
        // Selector de esta vista: solo activos (misma regla que la pestaña employees)
        this.pickerEmployees = (list || []).filter(emp => this.isEmployeeActive(emp));
        this.pickerLoading = false;
      },
      error: (err) => {
        console.error('Error cargando empleados para el selector:', err);
        this.pickerEmployees = [];
        this.pickerLoading = false;
      }
    });
  }

  filteredPickerEmployees(): EmployeeResponse[] {
    const term = (this.pickerSearch || '').trim().toLowerCase();
    if (!term) return this.pickerEmployees;
    return (this.pickerEmployees || []).filter(e => {
      const full = `${e.nombres || ''} ${e.apellidos || ''} ${e.name || ''}`.trim().toLowerCase();
      return full.includes(term) || (e.cedula || '').toLowerCase().includes(term);
    });
  }

  // Filtro principal para la tabla de empleados
  filteredEmployees(): EmployeeResponse[] {
    const ced = (this.filterCedula || '').trim().toLowerCase();
    const nom = (this.filterNombre || '').trim().toLowerCase();
    const ape = (this.filterApellido || '').trim().toLowerCase();
    const cod = (this.filterCodigo || '').trim().toLowerCase();

    return (this.listEmployees || []).filter(e => {
      const c = (e.cedula || '').toLowerCase();
      const n = ((e.nombres || e.name || '') as string).toLowerCase();
      const a = (e.apellidos || '').toLowerCase();
      const k = ((e as any).codigoTrabajador || (e as any).codigoEmpresa || '').toString().toLowerCase();

      if (ced && !c.includes(ced)) return false;
      if (nom && !n.includes(nom)) return false;
      if (ape && !a.includes(ape)) return false;
      if (cod && !k.includes(cod)) return false;
      return true;
    });
  }

  goToEmployeeDocuments(emp: EmployeeResponse): void {
    this.closeEmployeePicker();
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'employee', emp.cedula], {
        queryParams: { tab: 'documents' }
      });
    }
  }

  goBack(): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
    } else {
      // Fallback: comportamiento anterior
      this.router.navigate(['../gestion-empleados'], { relativeTo: this.route.parent });
    }
  }

  // UI helpers para Perfil
  getEmployeeImageUrl(): string {
    const raw = (this.employee as any)?.imagePath as string | undefined;
    if (!raw) return 'assets/img/default-avatar.svg';

    try {
      // Normalizar separadores y limpiar prefijos
      let rel = String(raw).replace(/\\/g, '/').replace(/^\.\/?/, '').trim();

      // Si ya es URL absoluta, devolver tal cual
      if (/^https?:\/\//i.test(rel)) {
        return rel;
      }

      // Si ya viene con /api/ asumir que es servida por el backend
      if (rel.startsWith('/api/')) {
        return rel;
      }

      // Remover prefijo 'uploads/' si viene desde el sistema de archivos físico
      if (rel.startsWith('uploads/')) {
        rel = rel.substring('uploads/'.length);
      }

      // Si viene con prefijo profiles/ o contiene /profiles/, servir desde /api/files/
      if (rel.startsWith('profiles/') || rel.includes('/profiles/')) {
        return `/api/files/${rel}`;
      }

      // Si solo es un nombre de archivo, intentar en el directorio de perfiles
      if (!rel.includes('/')) {
        return `/api/files/profiles/${rel}`;
      }

      // Caso general: servir desde /api/files/<ruta>
      return `/api/files/${rel}`;
    } catch {
      return 'assets/img/default-avatar.svg';
    }
  }

  openEdit(): void { this.showEditModal = true; }
  closeEdit(): void { this.showEditModal = false; }
  onUpdated(): void { this.closeEdit(); this.loadEmployee(); }
}