import {
  AfterViewInit, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy,
  Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployeeResponse } from '../models/employee.model';
import { DocumentService, EmployeeDocumentResponse } from '../services/document.service';
import { EmployeeCourseService, EmployeeCourseResponse } from '../services/employee-course.service';
import { EmployeeCardService, EmployeeCardResponse } from '../services/employee-card.service';
import { EmployeeService } from '../services/employee.service';

@Component({
  selector: 'app-employee-cv-overlay',
  templateUrl: './employee-cv-overlay.component.html',
  styleUrls: ['./employee-cv-overlay.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EmployeeCvOverlayComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() employee: EmployeeResponse | null = null;
  @Input() businessRuc = '';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('cvTpl') cvTpl!: TemplateRef<unknown>;

  loading = true;
  profile: EmployeeResponse | null = null;
  documents: EmployeeDocumentResponse[] = [];
  courses: EmployeeCourseResponse[] = [];
  cards: EmployeeCardResponse[] = [];
  movements: Array<{ movementType: string; effectiveDate: string; reason?: string | null }> = [];

  private overlayRef: OverlayRef | null = null;
  private attached = false;

  constructor(
    private overlay: Overlay,
    private vcr: ViewContainerRef,
    private employeeService: EmployeeService,
    private documentService: DocumentService,
    private courseService: EmployeeCourseService,
    private cardService: EmployeeCardService
  ) {}

  ngAfterViewInit(): void {
    this.attachOverlay();
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && !changes['employee'].firstChange) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.disposeOverlay();
    document.documentElement.classList.remove('ed-cv-print-mode');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.disposeOverlay();
    this.closed.emit();
  }

  downloadPdf(): void {
    document.documentElement.classList.add('ed-cv-print-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.documentElement.classList.remove('ed-cv-print-mode'), 400);
    }, 50);
  }

  fullName(emp: EmployeeResponse | null): string {
    if (!emp) return '';
    return `${emp.nombres || emp.name || ''} ${emp.apellidos || ''}`.trim();
  }

  photoUrl(emp: EmployeeResponse | null): string {
    try {
      let rel = String(emp?.imagePath || '').replace(/\\/g, '/').replace(/^\.?\/?/, '').trim();
      if (!rel) return 'assets/img/default-avatar.svg';
      if (/^https?:\/\//i.test(rel)) return rel;
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      if (rel.startsWith('profiles/') || rel.includes('/profiles/')) return `/api/files/${rel}`;
      if (!rel.includes('/')) return `/api/files/profiles/${rel}`;
      return `/api/files/${rel}`;
    } catch {
      return 'assets/img/default-avatar.svg';
    }
  }

  onImgError(event: Event): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) img.src = 'assets/img/default-avatar.svg';
  }

  companyLine(emp: EmployeeResponse | null): string {
    if (!emp) return '—';
    const ruc = emp.codigoEmpresa || this.businessRuc || '';
    const name = emp.businessName || '';
    if (ruc && name) return `${ruc} (${name})`;
    return name || ruc || '—';
  }

  expiryStatus(dateStr?: string | null): string {
    const v = this.daysLeft(dateStr);
    if (v === null) return '—';
    if (v < 0) return 'Caducado';
    if (v <= 30) return 'Próximo a vencer';
    return 'Vigente';
  }

  expiryClass(dateStr?: string | null): string {
    const s = this.expiryStatus(dateStr);
    if (s === 'Caducado') return 'is-expired';
    if (s === 'Próximo a vencer') return 'is-soon';
    if (s === 'Vigente') return 'is-ok';
    return '';
  }

  movementLabel(type: string | undefined | null): string {
    if (type === 'DEACTIVATION') return 'Salida / desvinculación';
    if (type === 'REACTIVATION') return 'Reingreso';
    return type || '—';
  }

  movementClass(type: string | undefined | null): string {
    if (type === 'REACTIVATION') return 'is-ok';
    if (type === 'DEACTIVATION') return 'is-muted';
    return '';
  }

  private daysLeft(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    const iso = String(dateStr).split(/[T\s]/)[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    const end = new Date(+m[1], +m[2] - 1, +m[3]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86400000);
  }

  private attachOverlay(): void {
    if (this.attached || !this.cvTpl) return;
    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      panelClass: 'ed-cv-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().top('0').left('0'),
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh'
    });
    this.overlayRef.attach(new TemplatePortal(this.cvTpl, this.vcr));
    this.attached = true;
  }

  private disposeOverlay(): void {
    if (this.overlayRef) {
      try { this.overlayRef.dispose(); } catch { /* ignore */ }
      this.overlayRef = null;
    }
    this.attached = false;
  }

  private load(): void {
    const seed = this.employee;
    if (!seed) return;
    this.loading = true;
    this.profile = seed;
    const beId = typeof seed.id === 'number' ? seed.id : null;
    const cedula = seed.cedula;
    const profile$ = (this.businessRuc && cedula)
      ? this.employeeService.getEmployeeByCedulaScopedByRuc(this.businessRuc, cedula).pipe(catchError(() => of(seed)))
      : of(seed);
    const docs$ = beId
      ? this.documentService.getByBusinessEmployeeId(beId, false).pipe(catchError(() => of([])))
      : of([]);
    const courses$ = beId
      ? this.courseService.getByBusinessEmployeeId(beId, false).pipe(catchError(() => of([])))
      : of([]);
    const cards$ = beId
      ? this.cardService.getByBusinessEmployeeId(beId, false).pipe(catchError(() => of([])))
      : of([]);
    const moves$ = beId
      ? this.employeeService.getEmployeeMovements(beId).pipe(catchError(() => of([])))
      : of([]);

    forkJoin({ profile: profile$, docs: docs$, courses: courses$, cards: cards$, moves: moves$ }).subscribe({
      next: ({ profile, docs, courses, cards, moves }) => {
        this.profile = profile || seed;
        this.documents = docs || [];
        this.courses = courses || [];
        this.cards = cards || [];
        this.movements = moves || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
