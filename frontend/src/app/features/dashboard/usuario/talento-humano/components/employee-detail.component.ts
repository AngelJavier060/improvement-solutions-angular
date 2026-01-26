import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { EmployeeResponse } from '../models/employee.model';
import { DocumentService, EmployeeDocumentResponse as ApiEmployeeDocumentResponse } from '../services/document.service';
import { EmployeeCourseService, EmployeeCourseResponse } from '../services/employee-course.service';
import { EmployeeCardService, EmployeeCardResponse } from '../services/employee-card.service';
import { Subscription, forkJoin, Subject, debounceTime } from 'rxjs';
import { HttpClient } from '@angular/common/http';

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
  activeTab: 'employees' | 'profile' | 'courses' | 'documents' | 'cards' = 'employees';
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

  // Expose Math to template (for Math.min / Math.max in HTML)
  Math = Math;

  // Vista unificada (Documentos + Cursos + Tarjetas) por empleado
  employeeItemsMap: { [beId: number]: EmployeeUnifiedItem[] | undefined } = {};
  employeeItemsLoading: { [beId: number]: boolean | undefined } = {};
  // Menú contextual por empleado (nombre clickeable)
  openMenuForId: number | null = null;

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

  getBusinessEmployeeIdFor(emp: EmployeeResponse | any): number {
    const anyEmp: any = emp as any;
    if (typeof anyEmp?.id === 'number') return anyEmp.id as number; // BusinessEmployee id
    if (typeof anyEmp?.businessId === 'number') return anyEmp.businessId as number; // fallback
    return -1;
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
  ensureEmployeeOverview(emp: EmployeeResponse): void {
    const beId = this.getBusinessEmployeeIdFor(emp);
    if (beId < 0) return;
    if (this.employeeItemsMap[beId] || this.employeeItemsLoading[beId]) return;
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
  }

  itemsFor(emp: EmployeeResponse | any): EmployeeUnifiedItem[] {
    const id = this.getBusinessEmployeeIdFor(emp);
    return this.employeeItemsMap[id] || [];
  }

  // === Empleados (lista por empresa) ===
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
    }).subscribe({
      next: (page) => {
        this.listEmployees = page?.content || [];
        this.totalElements = page?.totalElements || 0;
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

  nextPage(): void { if ((this.pageIndex + 1) * this.pageSize < this.totalElements) { this.pageIndex++; this.loadEmployeesList(); } }
  prevPage(): void { if (this.pageIndex > 0) { this.pageIndex--; this.loadEmployeesList(); } }
  changePageSize(size: number): void { this.pageSize = size; this.pageIndex = 0; this.loadEmployeesList(); }

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

  // Solo mostrar botones PDF si el archivo es PDF
  isPdf(file: { file_type?: string; file_name?: string } | null | undefined): boolean {
    if (!file) return false;
    const type = (file.file_type || '').toLowerCase();
    const name = (file.file_name || '').toLowerCase();
    return type.includes('pdf') || name.endsWith('.pdf');
  }

  openDocFile(file: { file: string; file_name?: string }): void {
    const rawUrl = this.normalizeFileUrl(file?.file || '');
    // Forzar vista en navegador: si viene como /api/files/download/... cambiar a /api/files/...
    const url = rawUrl.replace('/api/files/download/', '/api/files/');
    // Usar HttpClient para incluir credenciales/headers (evita 401 en enlaces directos)
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        // Si el backend no envía Content-Type correcto, asumir PDF
        const ct = resp.headers.get('Content-Type') || (file.file_name && file.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const typed = new Blob([blob], { type: ct });
        const blobUrl = window.URL.createObjectURL(typed);
        window.open(blobUrl, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      },
      error: () => alert('No se pudo abrir el archivo')
    });
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

  goToEmployeeTab(emp: EmployeeResponse, tab: 'profile' | 'documents' | 'courses' | 'cards'): void {
    this.openMenuForId = null;
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'employee', emp.cedula], {
        queryParams: { tab }
      });
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
  ) {}

  ngOnInit(): void {
    this.cedula = this.route.snapshot.params['cedula'];
    // Intentar extraer businessRuc desde rutas padre
    this.businessRuc = this.findParamUp('businessRuc') || this.findParamUp('ruc');
    const initTab = this.route.snapshot.queryParams['tab'];
    if (initTab && ['employees','courses', 'documents', 'profile', 'cards'].includes(initTab)) {
      this.activeTab = initTab as any;
    }
    if (this.cedula) {
      this.loadEmployee();
      this.loadDocumentTypes();
    }

    this.fallbackTimeoutId = setTimeout(() => {
      if (!this.loading && !this.employee) {
        this.tryNavigateToFirstEmployee();
      }
    }, 2500);

    // Suscribirse a cambios en query params para cambiar el tab
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && ['employees','courses', 'documents', 'profile', 'cards'].includes(tab)) {
        this.activeTab = tab as 'employees' | 'courses' | 'documents' | 'profile' | 'cards';
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
          if (!this.employee) {
            this.tryNavigateToFirstEmployee();
          }
        },
        error: (error) => {
          console.error('Error cargando empleado por cédula y RUC:', error);
          this.employee = null;
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
        },
        error: (error) => {
          console.error('Error cargando empleado por cédula:', error);
          this.employee = null;
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

  setActiveTab(tab: 'employees' | 'profile' | 'courses' | 'documents' | 'cards'): void {
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
        this.pickerEmployees = list || [];
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