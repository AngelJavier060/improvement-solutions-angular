import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { EmployeeCourseService, EmployeeCourseResponse, CreateEmployeeCourseRequest } from '../services/employee-course.service';
import { CourseCertificationService, CourseCertification } from '../../../../../services/course-certification.service';
import { HttpClient, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-employee-courses',
  templateUrl: './employee-courses.component.html',
  styleUrls: ['./employee-courses.component.scss']
})
export class EmployeeCoursesComponent implements OnInit, OnChanges {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Output() changed = new EventEmitter<void>();

  courses: EmployeeCourseResponse[] = [];
  catalog: CourseCertification[] = [];

  loading = false;
  saving = false;
  error: string | null = null;

  // Form inputs
  selectedCourseId: string = '';
  issueDate: string = '';
  expiryDate: string = '';
  hours: string = '';
  score: string = '';
  observations: string = '';
  selectedFiles: File[] = [];

  // Confirmación de renovación
  showRenewConfirm = false;
  renewTarget: EmployeeCourseResponse | null = null;
  // Mostrar histórico
  showHistory = false;
  // Formulario de renovación (modal independiente)
  showRenewForm = false;
  renewSaving = false;
  renewIssueDate: string = '';
  renewExpiryDate: string = '';
  renewHours: string = '';
  renewScore: string = '';
  renewObservations: string = '';
  renewFiles: File[] = [];
  renewFileError: string | null = null;
  renewCourseName: string = '';

  constructor(
    private employeeCourseService: EmployeeCourseService,
    private courseCatalogService: CourseCertificationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    this.loadCourses();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] || changes['employeeCedula']) {
      this.loadCourses();
    }
  }

  loadCatalog(): void {
    this.courseCatalogService.getAll().subscribe({
      next: (items) => (this.catalog = items || []),
      error: (err) => console.error('Error loading course catalog', err)
    });
  }

  loadCourses(): void {
    if (!this.employeeId) return;
    this.loading = true;
    // Siempre pedir con histórico; el filtrado visible lo maneja filteredCourses() según el toggle
    this.employeeCourseService.getByBusinessEmployeeId(this.employeeId, true).subscribe({
      next: (items) => {
        this.courses = items || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading employee courses', err);
        this.loading = false;
      }
    });
  }

  // Lista visible según "Ver histórico":
  // - Histórico OFF: mostrar SOLO el último registro por curso (por id), y ocultar caducados
  // - Histórico ON: mostrar todo
  filteredCourses(): EmployeeCourseResponse[] {
    const items = this.courses || [];
    if (this.showHistory) {
      // Mostrar solo históricos por item: preferir active===false; si no hay bandera, usar estado de vigencia
      return items.filter(c => {
        const a = (c as any).active;
        if (a === false) return true;
        if (a === true) return false;
        return this.getExpiryStatus(c.expiry_date) === 'Caducado';
      });
    }

    const score = (c: EmployeeCourseResponse): number => {
      const toTs = (d?: string) => {
        if (!d) return Number.NEGATIVE_INFINITY;
        const t = new Date(d as string).getTime();
        return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
      };
      const exp = toTs(c.expiry_date);
      if (exp !== Number.NEGATIVE_INFINITY) return exp;
      return toTs(c.issue_date);
    };

    const byCourse = new Map<number, EmployeeCourseResponse>();
    for (const c of items) {
      const id = ((c as any)?.course?.id ?? -1) as number;
      const prev = byCourse.get(id);
      if (!prev || score(c) > score(prev)) {
        byCourse.set(id, c);
      }
    }

    const latest = Array.from(byCourse.values());
    // Ocultar caducados en vista principal
    const visible = latest.filter(c => this.getExpiryStatus(c.expiry_date) !== 'Caducado');
    // Orden opcional por nombre de curso
    visible.sort((a, b) => ((a as any)?.course?.name || '').localeCompare(((b as any)?.course?.name || '')));
    return visible;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) this.selectedFiles = Array.from(input.files);
  }

  clearForm(): void {
    this.selectedCourseId = '';
    this.issueDate = '';
    this.expiryDate = '';
    this.hours = '';
    this.score = '';
    this.observations = '';
    this.selectedFiles = [];
  }

  createCourse(): void {
    if (!this.employeeId || !this.selectedCourseId) {
      this.error = 'Seleccione el curso/certificación';
      return;
    }
    this.saving = true;
    this.error = null;

    const req: CreateEmployeeCourseRequest = {
      business_employee_id: this.employeeId,
      course_certification_id: Number(this.selectedCourseId),
      issue_date: this.issueDate || undefined,
      expiry_date: this.expiryDate || undefined,
      hours: this.hours ? Number(this.hours) : undefined,
      score: this.score || undefined,
      observations: this.observations || undefined,
      files: this.selectedFiles && this.selectedFiles.length ? this.selectedFiles : undefined
    };

    this.employeeCourseService.create(req).subscribe({
      next: () => {
        this.saving = false;
        this.clearForm();
        this.loadCourses();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creating course', err);
        const serverMsg = (err?.error && (err.error.message || err.error.error || (typeof err.error === 'string' ? err.error : null))) || err?.message;
        this.error = serverMsg ? `Error al crear registro: ${serverMsg}` : 'No se pudo crear el registro';
        this.saving = false;
      }
    });
  }

  deleteCourse(item: EmployeeCourseResponse): void {
    if (!confirm('¿Eliminar este curso/certificación?')) return;
    this.employeeCourseService.delete(item.id).subscribe({
      next: () => { this.loadCourses(); this.changed.emit(); },
      error: (err) => console.error('Error deleting course', err)
    });
  }

  // Abrir archivo con token (similar a documentos)
  openFile(file: { file: string; file_name?: string }): void {
    const raw = file.file || '';
    const url = raw.replace('/api/files/download/', '/api/files/');
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        // Forzar PDF si el nombre termina en .pdf
        const name = (file.file_name || this.extractFileNameFromUrl(url) || '').toLowerCase();
        const headerCt = resp.headers.get('Content-Type') || '';
        const ct = name.endsWith('.pdf') ? 'application/pdf' : (headerCt || 'application/octet-stream');
        const typed = new Blob([blob], { type: ct });
        const blobUrl = window.URL.createObjectURL(typed);
        window.open(blobUrl, '_blank');
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
      const lastSlash = url.lastIndexOf('/');
      if (lastSlash >= 0) return url.substring(lastSlash + 1);
      return url;
    } catch {
      return 'archivo';
    }
  }

  // === Helpers de vigencia ===
  getDaysLeft(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const end = new Date(dateStr as string);
      if (isNaN(end.getTime())) return '-';
      const today = new Date();
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
  renewCourse(c: EmployeeCourseResponse): void {
    try {
      this.selectedCourseId = String((c as any)?.course?.id ?? '');
      this.observations = `Renovación de ${(c as any)?.course?.name || 'curso'}`;
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.issueDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.expiryDate = '';
      this.hours = '';
      this.score = '';
      this.selectedFiles = [];
    } catch (e) {
      console.error('Error preparando renovación de curso', e);
    }
  }

  openRenewConfirm(c: EmployeeCourseResponse): void {
    this.renewTarget = c;
    this.showRenewConfirm = true;
  }

  closeRenewConfirm(): void {
    this.showRenewConfirm = false;
    this.renewTarget = null;
  }

  confirmRenew(): void {
    // Preparar modal de renovación sin tocar el formulario principal
    if (this.renewTarget) {
      this.renewCourseName = (this.renewTarget as any)?.course?.name || 'curso';
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.renewIssueDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.renewExpiryDate = '';
      this.renewHours = '';
      this.renewScore = '';
      this.renewObservations = `Renovación de ${this.renewCourseName}`;
      this.renewFiles = [];
      this.renewFileError = null;
    }
    this.showRenewConfirm = false;
    this.showRenewForm = true;
  }

  onRenewFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) this.renewFiles = Array.from(input.files);
  }

  cancelRenewForm(): void {
    this.showRenewForm = false;
    this.renewSaving = false;
    this.renewIssueDate = '';
    this.renewExpiryDate = '';
    this.renewHours = '';
    this.renewScore = '';
    this.renewObservations = '';
    this.renewFiles = [];
    this.renewFileError = null;
    this.renewCourseName = '';
    this.renewTarget = null;
  }

  submitRenewal(): void {
    if (!this.employeeId || !this.renewTarget) return;
    if (!this.renewFiles || this.renewFiles.length === 0) {
      this.renewFileError = 'Adjunte al menos un archivo PDF.';
      return;
    }
    if (this.renewIssueDate && this.renewExpiryDate && this.renewIssueDate > this.renewExpiryDate) {
      this.renewFileError = 'La fecha de emisión no puede ser posterior a la fecha de expiración.';
      return;
    }
    this.renewSaving = true;
    const req: CreateEmployeeCourseRequest = {
      business_employee_id: this.employeeId,
      course_certification_id: Number((this.renewTarget as any)?.course?.id),
      issue_date: this.renewIssueDate || undefined,
      expiry_date: this.renewExpiryDate || undefined,
      hours: this.renewHours ? Number(this.renewHours) : undefined,
      score: this.renewScore || undefined,
      observations: this.renewObservations || undefined,
      files: this.renewFiles
    };
    this.employeeCourseService.create(req).subscribe({
      next: () => {
        this.renewSaving = false;
        this.cancelRenewForm();
        this.loadCourses();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creando renovación de curso', err);
        this.renewSaving = false;
        this.renewFileError = 'No se pudo completar la renovación.';
      }
    });
  }
}
