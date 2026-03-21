import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  Subscription
} from 'rxjs';
import { BusinessIncidentService, BusinessIncidentDto } from '../../../../../../services/business-incident.service';
import { BusinessService } from '../../../../../../services/business.service';
import { EmployeeService } from '../../../talento-humano/services/employee.service';
import { EmployeeResponse } from '../../../talento-humano/models/employee.model';
import { AttendanceService } from '../../../talento-humano/services/attendance.service';
import { FileService } from '../../../../../../services/file.service';
import { AuthService } from '../../../../../../core/services/auth.service';

@Component({
  selector: 'app-incident-form',
  templateUrl: './incident-form.component.html',
  styleUrls: ['./incident-form.component.scss']
})
export class IncidentFormComponent implements OnInit, OnDestroy {
  ruc: string | null = null;
  businessId?: number;
  businessName: string = '';
  businessLoadError: string | null = null;
  form!: FormGroup;
  saving = false;
  error: string | null = null;
  successMsg: string | null = null;

  // Empleados para desplegable
  employees: EmployeeResponse[] = [];
  selectedEmployeeId?: number;
  /** Valor enlazado al &lt;select&gt; de empleado (standalone) */
  employeeSelectValue: string = '';

  // Evidencias
  evidenceFiles: string[] = [];
  uploadingEvidence = false;

  private subs: Subscription[] = [];
  private currentUserName: string = '';

  readonly investigationLevels: string[] = [
    'T1 (Mínimo) Análisis Simple',
    'T2 Investigación básica',
    'T3 Investigación formal',
    'T4 Investigación profunda / evento crítico',
  ];

  readonly criteriaFields = [
    { key: 'isHighPotential',        label: '¿Es este incidente clasificado como Alto Potencial?' },
    { key: 'isCriticalEnap',         label: 'Incidente grave o crítico (fatalidad o incapacidad >70%)' },
    { key: 'isFatal',                label: 'Accidente Fatal' },
    { key: 'requiresResuscitation',  label: 'Maniobras de reanimación' },
    { key: 'requiresRescue',         label: 'Maniobras de rescate (desaparecido, no podía evacuar por sus propios medios)' },
    { key: 'fallOver2m',             label: 'Caída de altura de más de 2 metros' },
    { key: 'involvesAmputation',     label: 'Provocan, en forma inmediata, la amputación o pérdida de cualquier parte del cuerpo' },
    { key: 'affectsNormalTask',      label: 'Involucra número de trabajadores que afecta el desarrollo normal de la tarea' },
    { key: 'isCollective',           label: 'Evento colectivo (2 o más trabajadores)' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: BusinessIncidentService,
    private businessService: BusinessService,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private fileService: FileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) { this.ruc = found; break; }
      parent = parent.parent;
    }
    this.buildForm();

    // Usuario actual para "Elaborado por"
    const cu = this.authService.getCurrentUser();
    if (cu && cu.name) {
      this.currentUserName = cu.name;
      this.form.patchValue({ reportedBy: cu.name });
    }
    this.form.patchValue({ reportDate: this.todayLocalIso() });

    // Cargar empresa por RUC y setear nombre automáticamente
    if (this.ruc) {
      this.businessLoadError = null;
      this.businessService.getByRuc(this.ruc).subscribe({
        next: (biz: any) => {
          this.businessId = biz?.id;
          this.businessName = (biz?.name || '').trim();
          if (this.businessName) {
            this.form.patchValue({ companyName: this.businessName });
          }
          this.employeeService.getEmployeesByBusinessRuc(this.ruc!).subscribe({
            next: list => { this.employees = list || []; },
            error: () => { this.employees = []; }
          });
        },
        error: () => {
          this.businessLoadError = 'No se pudo cargar la empresa. Verifique el RUC en la URL.';
          this.businessName = '';
        }
      });
    }

    const cedSub = this.form.get('personCedula')!.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        map(v => (typeof v === 'string' ? v : String(v ?? '')).trim()),
        filter(v => v.length >= 6)
      )
      .subscribe(v => this.lookupByCedula(v));
    this.subs.push(cedSub);

    // Recalcular día de turno si cambia la fecha
    const dateSub = this.form.get('incidentDate')!.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(() => this.computeDayType());
    this.subs.push(dateSub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private buildForm(): void {
    const boolFields: Record<string, any[]> = {};
    this.criteriaFields.forEach(f => {
      boolFields[f.key] = [false];
    });

    this.form = this.fb.group({
      // Sección 1
      affectationType: ['Salud y Seguridad'],
      incidentDate:    ['', Validators.required],
      incidentTime:    [''],
      location:        [''],
      personnelType:   ['Propio'],
      companyName:     [{ value: '', disabled: true }],
      // Sección 2
      personName:      [''],
      personCedula:    [''],
      personPosition:  [''],
      personArea:      [''],
      personAge:       [null],
      personGender:    [''],
      personShift:     [''],
      personExperience:[''],
      // Sección 3
      title:           ['', Validators.required],
      description:     ['', Validators.required],
      eventClassification: ['Incidente'],
      // Sección 4
      mitigationActions: [''],
      // Sección 5
      ...boolFields,
      lifeRuleViolated:  ['Ninguna'],
      apiLevel:          ['No Aplica'],
      hasOccurredBefore: [''],
      investigationLevel:['T1 (Mínimo) Análisis Simple'],
      // Sección 6
      preliminaryComments: [''],
      controlMeasures:     [''],
      // Sección 7 - Generación del Informe
      reportedBy:      ['', Validators.required],
      reportDate:      ['', Validators.required],
      reviewedBy:      [''],
      approvedBy:      ['']
    });
  }

  private todayLocalIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  toggleCriteria(key: string): void {
    const current = this.form.get(key)?.value;
    this.form.get(key)?.setValue(!current);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.ruc) return;

    this.saving = true;
    this.error = null;

    const raw = this.form.getRawValue();
    const dto: BusinessIncidentDto = { ...raw } as any;
    // Asegurar nombre de empresa y evidencias
    if (this.businessName) dto.companyName = this.businessName;
    if (this.evidenceFiles?.length) dto.evidenceFiles = [...this.evidenceFiles];

    this.incidentService.create(this.ruc, dto).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Alerta registrada exitosamente.';
        setTimeout(() => {
          this.router.navigate(['/usuario', this.ruc, 'seguridad-industrial', 'accidentes-incidentes']);
        }, 1500);
      },
      error: (err) => {
        console.error('Error al crear incidente:', err);
        this.error = 'No se pudo registrar el incidente. Verifique los datos e intente nuevamente.';
        this.saving = false;
      }
    });
  }

  cancel(): void {
    if (this.ruc) {
      this.router.navigate(['/usuario', this.ruc, 'seguridad-industrial', 'accidentes-incidentes']);
    }
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  // ─────── Helpers: Empleado y cédula ───────
  getEmployeeFullName(e: EmployeeResponse | any): string {
    if (!e) return '';
    const direct = (e.name || '').toString().trim();
    if (direct) return direct;
    const ap = [e.apellidos, e.nombres].filter(Boolean).join(' ').trim();
    return ap || '';
  }

  private positionFromEmp(emp: any): string {
    if (!emp) return '';
    if (emp.positionName) return String(emp.positionName);
    if (typeof emp.position === 'string') return emp.position;
    return emp.position?.name || '';
  }

  private departmentFromEmp(emp: any): string {
    if (!emp) return '';
    if (emp.departmentName) return String(emp.departmentName);
    return emp.department?.name || '';
  }

  private genderFromEmp(emp: any): string {
    const raw = emp?.genderName ?? emp?.gender?.name ?? '';
    return this.normalizeGenderForForm(String(raw));
  }

  private birthDateFromEmp(emp: any): string | undefined {
    return emp?.dateBirth ?? emp?.birthdate;
  }

  private fechaIngresoFromEmp(emp: any): string | undefined {
    const fi = emp?.fechaIngreso;
    return fi ? String(fi).split('T')[0] : undefined;
  }

  /** Alinea valores del backend con las opciones del &lt;select&gt; de género */
  normalizeGenderForForm(raw: string): string {
    const u = (raw || '').toUpperCase().trim();
    if (!u) return '';
    if (u.includes('MASC') || u === 'M' || u === 'HOMBRE' || u === 'MASCULINO') return 'Masculino';
    if (u.includes('FEM') || u === 'F' || u === 'MUJER' || u === 'FEMENINO') return 'Femenino';
    return 'Otro';
  }

  onEmployeeSelected(idStr: string): void {
    if (!idStr) {
      this.selectedEmployeeId = undefined;
      this.employeeSelectValue = '';
      this.form.patchValue({
        personName: '',
        personCedula: '',
        personPosition: '',
        personArea: '',
        personAge: null,
        personGender: '',
        personShift: '',
        personExperience: ''
      });
      return;
    }
    const id = Number(idStr);
    this.selectedEmployeeId = Number.isNaN(id) ? undefined : id;
    const emp = this.employees.find(x => Number((x as any).id) === id);
    if (!emp) return;
    const fullName = this.getEmployeeFullName(emp);
    const age = this.computeAge(this.birthDateFromEmp(emp));
    const gender = this.genderFromEmp(emp);
    const position = this.positionFromEmp(emp);
    const area = this.departmentFromEmp(emp);
    const experience = this.computeExperience(this.fechaIngresoFromEmp(emp));
    this.employeeSelectValue = String(id);
    this.form.patchValue({
      personName: fullName,
      personCedula: (emp.cedula || '').trim(),
      personPosition: position,
      personArea: area,
      personAge: age,
      personGender: gender,
      personExperience: experience
    });
    this.computeDayType();
  }

  lookupByCedula(cedula: string): void {
    if (!this.ruc || !cedula) return;
    this.employeeService.getEmployeeByCedulaScopedByRuc(this.ruc, cedula).pipe(
      catchError(() => of(null as EmployeeResponse | null))
    ).subscribe((emp) => {
      if (!emp) return;
      const fullName = this.getEmployeeFullName(emp);
      const age = this.computeAge(this.birthDateFromEmp(emp));
      const gender = this.genderFromEmp(emp);
      const position = this.positionFromEmp(emp);
      const area = this.departmentFromEmp(emp);
      const experience = this.computeExperience(this.fechaIngresoFromEmp(emp));
      const eid = (emp as any).id;
      this.selectedEmployeeId = typeof eid === 'number' ? eid : Number(eid);
      this.employeeSelectValue = eid != null && !Number.isNaN(Number(eid)) ? String(eid) : '';
      this.form.patchValue({
        personName: fullName,
        personPosition: position,
        personArea: area,
        personAge: age,
        personGender: gender,
        personExperience: experience
      });
      this.computeDayType();
    });
  }

  private computeAge(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = new Date(String(dateStr).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const years = new Date(diff).getUTCFullYear() - 1970;
    return years >= 0 ? years : null;
  }

  private computeExperience(startDateStr?: string): string {
    if (!startDateStr) return '';
    const d = new Date(String(startDateStr));
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    if (months < 0) { years -= 1; months += 12; }
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} año${years>1?'s':''}`);
    if (months > 0) parts.push(`${months} mes${months>1?'es':''}`);
    return parts.join(' ');
  }

  private computeDayType(): void {
    if (!this.businessId || !this.selectedEmployeeId) return;
    const date = this.form.get('incidentDate')!.value as string;
    if (!date) return;
    this.attendanceService.getEmployeeDayType(this.businessId, this.selectedEmployeeId, date).subscribe({
      next: (resp) => {
        const dt = resp?.dayType || '';
        this.form.patchValue({ personShift: dt });
      },
      error: () => {}
    });
  }

  // ─────── Evidencias ───────
  onEvidenceDragOver(ev: DragEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
  }

  onEvidenceDrop(ev: DragEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const list = ev.dataTransfer?.files;
    if (!list?.length) return;
    void this.processEvidenceFiles(Array.from(list));
  }

  onEvidenceFilesSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files?.length) return;
    void this.processEvidenceFiles(Array.from(input.files)).then(() => { input.value = ''; });
  }

  private async processEvidenceFiles(files: File[]): Promise<void> {
    this.uploadingEvidence = true;
    try {
      for (const f of files) {
        const res = await firstValueFrom(this.fileService.uploadFileToDirectory('incidents-evidence', f));
        if (res?.url) this.evidenceFiles.push(res.url);
      }
    } finally {
      this.uploadingEvidence = false;
    }
  }

  removeEvidence(idx: number): void {
    if (idx >= 0 && idx < this.evidenceFiles.length) {
      this.evidenceFiles.splice(idx, 1);
    }
  }

  getFileName(url: string): string {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split(/[/\\]/);
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  isPdfUrl(url: string): boolean {
    const base = url.split('?')[0].toLowerCase();
    return base.endsWith('.pdf');
  }
}
