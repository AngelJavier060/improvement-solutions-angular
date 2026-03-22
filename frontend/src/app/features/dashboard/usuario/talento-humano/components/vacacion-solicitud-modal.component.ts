import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeResponse } from '../models/employee.model';
import { AttendanceService, VacationRecord } from '../services/attendance.service';

declare const jspdf: any;

@Component({
  selector: 'app-vacacion-solicitud-modal',
  templateUrl: './vacacion-solicitud-modal.component.html',
  styleUrls: ['./vacacion-solicitud-modal.component.scss']
})
export class VacacionSolicitudModalComponent implements OnInit, OnChanges {

  @Input() employee: EmployeeResponse | null = null;
  @Input() employees: EmployeeResponse[] = [];
  @Input() businessId: number | null = null;
  @Input() businessName: string = '';
  @Input() businessLogoUrl: string | null = null;
  @Input() previewRecord: VacationRecord | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  @ViewChild('pdfContent') pdfContent!: ElementRef;

  form!: FormGroup;
  saving = false;
  generatingPdf = false;
  error: string | null = null;
  showSuccess = false;
  pdfBlobUrl: string | null = null;
  dateConflictWarning: string | null = null;

  readonly approvers = [
    { value: 'gerente_operaciones',   label: 'Gerente de Operaciones' },
    { value: 'jefe_mantenimiento',    label: 'Jefe de Mantenimiento' },
    { value: 'director_rrhh',         label: 'Director de RRHH' },
    { value: 'gerente_general',       label: 'Gerencia General' },
  ];

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService
  ) {}

  get previewMode(): boolean { return !!this.previewRecord; }

  ngOnInit(): void {
    this.buildForm();
    if (this.previewRecord) {
      this.prefillFromRecord(this.previewRecord);
    }
  }

  private setupApproverAutofill(): void {
    const appCtrl = this.form.get('approver');
    const supCtrl = this.form.get('supervisorName');
    appCtrl?.valueChanges.subscribe((val: string) => {
      const opt = this.approvers.find(a => a.value === val);
      const label = opt?.label || '';
      // Sobrescribir por defecto, pero permitir edición manual posterior
      supCtrl?.setValue(label, { emitEvent: false });
    });
  }

  printPdf(): void {
    if (this.pdfBlobUrl) {
      // Abrir en nueva pestaña con sugerencia de impresión
      const w = window.open(this.pdfBlobUrl + '#print=1', '_blank');
      if (!w) {
        // Fallback: cargar en iframe oculto e invocar print()
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = this.pdfBlobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } finally { document.body.removeChild(iframe); }
        };
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewRecord'] && this.previewRecord && this.form) {
      this.prefillFromRecord(this.previewRecord);
    } else if (changes['employee'] && this.employee && this.form) {
      this.prefillEmployee();
    }
  }

  private prefillFromRecord(rec: VacationRecord): void {
    const emp = this.employees.find(e => e.id === rec.employeeId) || null;
    if (emp) this.employee = emp;
    const fullName = rec.employeeName || (emp ? ((emp.nombres || '') + ' ' + (emp.apellidos || '')).trim() : '');
    const dept = emp ? ((emp as any).departmentName || (emp as any).department || '') : '';
    const cargo = emp ? ((emp as any).positionName || (emp as any).position?.name || (emp as any).jobTitle || '') : '';
    const hire = emp ? ((emp as any).fechaIngreso || (emp as any).hireDate || '') : '';
    this.form.patchValue({
      employeeId: rec.employeeId,
      fullName,
      cedula: rec.cedula || (emp?.cedula || ''),
      department: dept,
      jobTitle: cargo,
      hireDate: this.toIsoDate(hire),
      startDate: rec.startDate || '',
      endDate: rec.endDate || '',
      daysBalance: rec.daysTaken ?? this.computeDaysFromRecord(rec),
      observations: rec.notes || '',
      status: rec.status || 'EN_CURSO',
    }, { emitEvent: false });
    this.recomputeDaysBalance();
  }

  private computeDaysFromRecord(rec: VacationRecord): number {
    if (!rec.startDate || !rec.endDate) return 0;
    const s = new Date(`${rec.startDate}T00:00:00`);
    const e = new Date(`${rec.endDate}T00:00:00`);
    const diff = e.getTime() - s.getTime();
    return diff > 0 ? Math.round(diff / (24 * 60 * 60 * 1000)) : 0;
  }

  private buildForm(): void {
    this.form = this.fb.group({
      employeeId:    [null, Validators.required],
      fullName:       ['', Validators.required],
      cedula:         ['', Validators.required],
      department:     ['', Validators.required],
      jobTitle:       ['', Validators.required],
      hireDate:       ['', Validators.required],
      daysBalance:    [0, [Validators.required, Validators.min(0)]],
      approver:       ['', Validators.required],
      startDate:      ['', Validators.required],
      endDate:        ['', Validators.required],
      replacement:    ['', Validators.required],
      replanning:     ['no', Validators.required],
      observations:   [''],
      supervisorName: [''],
      hrResponsible:  ['Talento Humano'],
      status:         ['EN_CURSO']
    });
    // Auto-cálculo de saldo de días cuando cambian las fechas
    this.setupAutoDaysBalance();
    // Enlazar búsqueda por cédula y por nombre
    this.setupEmployeeSearchLinks();
    // Autollenado de nombre del jefe inmediato desde el selector de aprobador
    this.setupApproverAutofill();
    if (this.employee) this.prefillEmployee();
  }

  private prefillEmployee(): void {
    const emp = this.employee!;
    const fullName = ((emp.nombres || '') + ' ' + (emp.apellidos || '')).trim() || (emp as any).name || '';
    const dept  = (emp as any).departmentName || (emp as any).department || '';
    const cargo = (emp as any).positionName   || (emp as any).position?.name || (emp as any).jobTitle || '';
    const hire  = (emp as any).fechaIngreso || (emp as any).hireDate || '';
    const hireIso = this.toIsoDate(hire);
    this.form.patchValue({
      employeeId: emp.id,
      fullName,
      cedula:     emp.cedula || '',
      department: dept,
      jobTitle:   cargo,
      hireDate:   hireIso,
    }, { emitEvent: false });
  }

  onSelectEmployeeId(evt: Event | number | string): void {
    const raw = typeof evt === 'number' || typeof evt === 'string'
      ? evt
      : (evt && (evt.target as HTMLSelectElement)?.value);
    const id = Number(raw);
    const emp = this.employees.find(e => e.id === id) || null;
    this.employee = emp;
    if (emp) this.prefillEmployee();
  }

  private setupEmployeeSearchLinks(): void {
    const cedCtrl = this.form.get('cedula');
    const nameCtrl = this.form.get('fullName');

    cedCtrl?.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe((val: string) => {
      if (!val) return;
      const norm = String(val).replace(/\D+/g, '');
      const found = this.employees.find(e => String(e.cedula || '').replace(/\D+/g, '') === norm);
      if (found) {
        this.employee = found;
        this.prefillEmployee();
      }
    });

    nameCtrl?.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe((val: string) => {
      if (!val) return;
      const typed = this.normalizeStr(val);
      if (typed.length < 3) return; // evitar coincidencias ruidosas
      const matches = this.employees.filter(e => this.normalizeStr(((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || (e as any).name || '')
        .includes(typed));
      if (matches.length === 1) {
        this.employee = matches[0];
        this.prefillEmployee();
      } else {
        // Si hay coincidencia exacta, también prefijar
        const exact = this.employees.find(e => this.normalizeStr(((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || (e as any).name || '') === typed);
        if (exact) {
          this.employee = exact;
          this.prefillEmployee();
        }
      }
    });
  }

  private normalizeStr(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toIsoDate(d: any): string {
    if (!d) return '';
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    const s = String(d);
    // yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // dd/MM/yyyy
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      return `${yyyy}-${mm}-${dd}`;
    }
    // fallback: intentar Date.parse
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const yy = parsed.getFullYear();
      const mm2 = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd2 = String(parsed.getDate()).padStart(2, '0');
      return `${yy}-${mm2}-${dd2}`;
    }
    return '';
  }

  private setupAutoDaysBalance(): void {
    const sCtrl = this.form.get('startDate');
    const eCtrl = this.form.get('endDate');
    sCtrl?.valueChanges.subscribe(() => this.recomputeDaysBalance());
    eCtrl?.valueChanges.subscribe(() => this.recomputeDaysBalance());
  }

  checkConflictFromEvent(evt: Event): void {
    const date = (evt.target as HTMLInputElement).value;
    this.checkConflict(date);
  }

  checkConflict(date: string): void {
    this.dateConflictWarning = null;
    const empId: number | null = this.employee?.id
      ?? (this.form.get('employeeId')?.value ? Number(this.form.get('employeeId')?.value) : null);
    if (!date || !this.businessId || !empId) {
      console.warn('[Vacaciones] checkConflict: faltan datos — date:', date, 'businessId:', this.businessId, 'empId:', empId);
      return;
    }
    console.log('[Vacaciones] checkConflict llamado — date:', date, 'empId:', empId);
    this.attendanceService.checkDateConflict(this.businessId, empId, date).subscribe({
      next: res => {
        console.log('[Vacaciones] checkConflict respuesta:', res);
        this.dateConflictWarning = res.conflict ? res.detail : null;
      },
      error: err => {
        console.error('[Vacaciones] checkConflict error:', err);
        this.dateConflictWarning = null;
      }
    });
  }

  private recomputeDaysBalance(): void {
    const s = this.form.get('startDate')?.value;
    const e = this.form.get('endDate')?.value;
    let days = 0;
    if (s && e) {
      const start = new Date(`${s}T00:00:00`);
      const end   = new Date(`${e}T00:00:00`);
      const diff  = end.getTime() - start.getTime();
      // Si 'ingreso' es el primer día de retorno, los días de vacaciones son la diferencia en días (excluyendo el día de ingreso)
      if (diff > 0) days = Math.round(diff / (24 * 60 * 60 * 1000));
      else days = 0;
    }
    this.form.patchValue({ daysBalance: days }, { emitEvent: false });
  }

  close(): void {
    this.error = null;
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid || !this.businessId) return;
    this.saving = true;
    this.error  = null;

    const v = this.form.value;
    const empId: number | null = this.employee?.id ?? (v.employeeId ? Number(v.employeeId) : null);
    if (!empId) {
      this.saving = false;
      this.error = 'Seleccione un empleado válido para continuar.';
      return;
    }
    const payload = {
      startDate:       v.startDate,
      endDate:         v.endDate,
      daysAccumulated: v.daysBalance,
      notes:           v.observations || '',
      status:          'EN_CURSO'
    };

    this.attendanceService.saveVacation(this.businessId, empId, payload).subscribe({
      next: async () => {
        this.saving = false;
        this.showSuccess = true;
        try {
          await this.generatePdf();
        } finally {
          this.saved.emit();
        }
      },
      error: err => {
        this.saving = false;
        this.error = 'Error al guardar. Verifique los datos e intente de nuevo.';
        console.error(err);
      }
    });
  }

  async generatePdf(): Promise<void> {
    this.generatingPdf = true;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');

      const el: HTMLElement = this.pdfContent.nativeElement;
      // Aplicar centrado solo para la captura del PDF
      el.classList.add('pdf-center');
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW  = pageW - 20;
      const imgH  = imgW * ratio;

      let posY = 10;
      if (imgH <= pageH - 20) {
        pdf.addImage(imgData, 'PNG', 10, posY, imgW, imgH);
      } else {
        let remaining = imgH;
        let srcY = 0;
        const sliceH = pageH - 20;
        while (remaining > 0) {
          const useH = Math.min(sliceH, remaining);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = (useH / imgH) * canvas.height;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, useH);
          remaining -= useH;
          srcY += sliceCanvas.height;
          if (remaining > 0) { pdf.addPage(); }
        }
      }

      // Crear blob y abrir en una nueva pestaña (visualización, no descarga)
      const blob = pdf.output('blob');
      if (this.pdfBlobUrl) { try { URL.revokeObjectURL(this.pdfBlobUrl); } catch {} }
      this.pdfBlobUrl = URL.createObjectURL(blob);
      const w = window.open(this.pdfBlobUrl, '_blank');
      if (!w) {
        // Fallback si el navegador bloquea la apertura automática
        pdf.output('dataurlnewwindow');
      }
    } catch (e) {
      console.error('Error generando PDF:', e);
    } finally {
      // Quitar centrado temporal
      try { this.pdfContent?.nativeElement?.classList?.remove('pdf-center'); } catch {}
      this.generatingPdf = false;
    }
  }

  async generateAndOpenPdf(): Promise<void> {
    await this.generatePdf();
  }

  getFullName(): string {
    const emp = this.employee;
    if (!emp) return '';
    return ((emp.nombres || '') + ' ' + (emp.apellidos || '')).trim() || (emp as any).name || '';
  }

  formatEmpName(e: EmployeeResponse): string {
    const name = ((e.nombres || '') + ' ' + (e.apellidos || '')).trim();
    // Access optional name fallback safely
    const anyE: any = e as any;
    return name || anyE.name || '—';
  }

  getDept(): string {
    const emp = this.employee;
    if (!emp) return '';
    return (emp as any).departmentName || (emp as any).department || (emp as any).cargo || '';
  }

  getHireDate(): string {
    const emp = this.employee;
    if (!emp) return '';
    return (emp as any).fechaIngreso || (emp as any).hireDate || '';
  }
}
