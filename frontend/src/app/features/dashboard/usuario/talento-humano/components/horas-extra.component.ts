import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AttendanceService,
  OvertimeRequest,
  OvertimeActivity
} from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../models/employee.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-horas-extra',
  templateUrl: './horas-extra.component.html',
  styleUrls: ['./horas-extra.component.scss']
})
export class HorasExtraComponent implements OnInit {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';
  businessRucDisplay: string = '';
  businessLogoUrl: string | null = null;
  businessLogoBase64: string | null = null;

  employees: EmployeeResponse[] = [];
  requests: OvertimeRequest[] = [];
  filteredRequests: OvertimeRequest[] = [];

  searchTerm: string = '';
  filterPeriod: string = this.currentPeriod();
  filterStatus: string = '';
  filterWithExtra: boolean = false;

  loading = false;
  loadingEmps = false;
  saving = false;
  uploadingId: number | null = null;
  error: string | null = null;
  successMsg: string | null = null;

  // Modal de detalle de solicitud
  detailReq: OvertimeRequest | null = null;

  showForm = false;
  selectedEmployee: EmployeeResponse | null = null;
  searchEmp: string = '';

  formDraft = {
    reportPeriod: this.currentPeriod(),
    supervisorName: '',
    department: '',
    area: '',
    recognitionType: 'Pago en Nómina',
    notes: ''
  };

  activities: OvertimeActivity[] = [];

  readonly months = [
    {v:1,l:'Enero'},{v:2,l:'Febrero'},{v:3,l:'Marzo'},{v:4,l:'Abril'},
    {v:5,l:'Mayo'},{v:6,l:'Junio'},{v:7,l:'Julio'},{v:8,l:'Agosto'},
    {v:9,l:'Septiembre'},{v:10,l:'Octubre'},{v:11,l:'Noviembre'},{v:12,l:'Diciembre'}
  ];
  readonly availableYears = Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i);
  readonly recognitionTypes = ['Pago en Nómina', 'Días Compensatorios'];

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private businessContext: BusinessContextService,
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.extractParams();
  }

  private extractParams(): void {
    let r: any = this.route;
    while (r) {
      const ruc = r.snapshot?.params?.['ruc'] || r.snapshot?.params?.['businessRuc'];
      if (ruc) { this.businessRuc = ruc; break; }
      r = r.parent;
    }
    if (!this.businessRuc && typeof window !== 'undefined') {
      const m = window.location.pathname.match(/\/usuario\/([^/]+)\//);
      if (m?.[1]) this.businessRuc = m[1];
    }
    const active = this.businessContext.getActiveBusiness();
    if (active) {
      this.businessId       = active.id;
      this.businessName     = active.name ?? '';
      this.businessRucDisplay = active.ruc ?? '';
      if (!this.businessRuc) this.businessRuc = active.ruc;
      this.loadBusinessInfo();
      this.loadData();
    } else if (this.businessRuc) {
      this.businessService.getAll().subscribe({
        next: (list: any[]) => {
          const found = list.find((b: any) => b.ruc === this.businessRuc);
          if (found) {
            this.businessId = found.id;
            this.businessName = found.name ?? '';
            this.businessRucDisplay = found.ruc ?? '';
            this.loadBusinessInfo();
          }
          this.loadData();
        },
        error: () => this.loadData()
      });
    }
  }

  private loadBusinessInfo(): void {
    if (!this.businessId) return;
    this.businessService.getById(this.businessId).subscribe({
      next: (b: any) => {
        const raw = (b.logo || '').trim();
        const base = '';
        if (!raw) { this.businessLogoUrl = null; return; }
        if (/^https?:\/\//i.test(raw)) {
          this.businessLogoUrl = raw;
        } else if (raw.startsWith('logos/')) {
          this.businessLogoUrl = `${base}/api/files/${raw}`;
        } else {
          this.businessLogoUrl = `${base}/api/files/logos/${raw}`;
        }
      },
      error: () => { this.businessLogoUrl = null; }
    });
  }

  private async toDataUrl(url: string): Promise<string> {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private loadData(): void {
    this.loadEmployees();
    this.loadRequests();
  }

  loadEmployees(): void {
    if (!this.businessRuc) return;
    this.loadingEmps = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: emps => { this.employees = emps.filter(e => e.active !== false); this.loadingEmps = false; },
      error: () => { this.loadingEmps = false; }
    });
  }

  loadRequests(): void {
    if (!this.businessId) return;
    this.loading = true;
    this.attendanceService.getOvertimeRequests(this.businessId, this.filterPeriod || undefined).subscribe({
      next: reqs => {
        this.requests = reqs;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    let list = [...this.requests];
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.employeeCedula || '').includes(q)
      );
    }
    if (this.filterStatus) {
      list = list.filter(r => r.status === this.filterStatus);
    }
    if (this.filterWithExtra) {
      list = list.filter(r => (r.totalDays || 0) > 0);
    }
    this.filteredRequests = list;
  }

  get filteredEmployees(): EmployeeResponse[] {
    const q = this.searchEmp.trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter(e =>
      ((e.nombres || '') + ' ' + (e.apellidos || '')).toLowerCase().includes(q) ||
      (e.cedula || '').includes(q)
    );
  }

  // ── KPIs ────────────────────────────────────────────────────────────────
  get totalHours(): number {
    return this.filteredRequests.reduce((s, r) => s + (r.totalHours || 0), 0);
  }
  get totalDays(): number {
    return this.filteredRequests.reduce((s, r) => s + (r.totalDays || 0), 0);
  }
  get pendingCount(): number {
    return this.filteredRequests.filter(r => r.status === 'PENDIENTE').length;
  }
  get avgHours(): number {
    if (!this.filteredRequests.length) return 0;
    return Math.round((this.totalHours / this.filteredRequests.length) * 10) / 10;
  }

  // ── Formulario nuevo ────────────────────────────────────────────────────
  openForm(): void {
    this.showForm = true;
    this.selectedEmployee = null;
    this.searchEmp = '';
    this.error = null;
    this.formDraft = {
      reportPeriod: this.currentPeriod(),
      supervisorName: '',
      department: '',
      area: '',
      recognitionType: 'Pago en Nómina',
      notes: ''
    };
    this.activities = [this.emptyActivity()];
  }

  cancelForm(): void {
    this.showForm = false;
    this.selectedEmployee = null;
  }

  selectEmployee(emp: EmployeeResponse): void {
    this.selectedEmployee = emp;
    this.searchEmp = '';
    // Autocompletar Departamento y Cargo desde la ficha
    const dept = (emp as any).departmentName || (emp as any).department?.name || '';
    const cargo = (emp as any).positionName || (emp as any).position?.name || (emp as any).position || '';
    this.formDraft.department = dept;
    this.formDraft.area = cargo; // el backend espera 'area', la UI mostrará 'Cargo'
  }

  private emptyActivity(): OvertimeActivity {
    return { activityDate: '', startTime: '', endTime: '', description: '', supportDoc: '' };
  }

  addActivity(): void {
    this.activities.push(this.emptyActivity());
  }

  removeActivity(i: number): void {
    if (this.activities.length > 1) this.activities.splice(i, 1);
  }

  calcHours(act: OvertimeActivity): number {
    if (!act.startTime || !act.endTime) return 0;
    const [sh, sm] = act.startTime.split(':').map(Number);
    const [eh, em] = act.endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, Math.round(mins / 6) / 10);
  }

  get formTotalHours(): number {
    return this.activities.reduce((s, a) => s + this.calcHours(a), 0);
  }

  async submitForm(): Promise<void> {
    if (!this.businessId || !this.selectedEmployee) {
      this.error = 'Seleccione un empleado.';
      return;
    }
    const validActivities = this.activities.filter(a => a.activityDate && a.startTime && a.endTime && a.description);
    if (!validActivities.length) {
      this.error = 'Agregue al menos una actividad con fecha, hora y descripción.';
      return;
    }

    // Validación previa en cliente: no permitir registrar en día de jornada normal (T)
    try {
      const dates = Array.from(new Set(validActivities.map(a => a.activityDate)));
      for (const d of dates) {
        const resp = await firstValueFrom(this.attendanceService.getEmployeeDayType(this.businessId, this.selectedEmployee.id, d));
        if ((resp.dayType || '').toUpperCase() === 'T') {
          this.error = `No es posible registrar horas/días extra el ${d}: es un día de jornada laboral normal.`;
          return;
        }
      }
    } catch {
      // Si falla la validación previa, continuar y que el backend aplique la validación definitiva
    }
    this.saving = true;
    this.error = null;
    const dto: OvertimeRequest = { ...this.formDraft, activities: validActivities };
    this.attendanceService.createOvertimeRequest(this.businessId, this.selectedEmployee.id, dto).subscribe({
      next: created => {
        this.saving = false;
        this.showForm = false;
        this.successMsg = 'Solicitud registrada correctamente.';
        setTimeout(() => this.successMsg = null, 4000);
        this.loadRequests();
        this.generatePdf(created);
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.error || 'Error al guardar. Intente nuevamente.';
      }
    });
  }

  // ── PDF ─────────────────────────────────────────────────────────────────
  async generatePdf(req: OvertimeRequest): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const m      = 14;   // margin
    const usable = pageW - m * 2;
    let y = m;

    const BORDER  : [number,number,number] = [203, 213, 225];  // slate-300
    const ACCENT  : [number,number,number] = [236,  91,  19];  // #ec5b13
    const DARK    : [number,number,number] = [ 15,  23,  42];  // slate-900
    const GRAY_BG : [number,number,number] = [248, 250, 252];  // slate-50
    const GRAY_TXT: [number,number,number] = [100, 116, 139];  // slate-500
    const WHITE   : [number,number,number] = [255, 255, 255];

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);

    // ── 1. HEADER GRID (3 columnas) ─────────────────────────────────────
    const hdrH  = 28;
    const col1W = usable * 0.30;
    const col2W = usable * 0.45;
    const col3W = usable * 0.25;

    // Borde exterior
    doc.rect(m, y, usable, hdrH);

    // Col 1 — Logo / empresa (con fallback a texto)
    doc.setFillColor(248, 250, 252);
    doc.rect(m, y, col1W, hdrH, 'F');
    // Preparar logo base64 si hay URL y aún no está cargado
    if (!this.businessLogoBase64 && this.businessLogoUrl) {
      try { this.businessLogoBase64 = await this.toDataUrl(this.businessLogoUrl); } catch { /* ignore */ }
    }
    if (this.businessLogoBase64) {
      try {
        const fmt = this.businessLogoBase64.startsWith('data:image/png') ? 'PNG'
                  : (this.businessLogoBase64.startsWith('data:image/jpeg') || this.businessLogoBase64.startsWith('data:image/jpg')) ? 'JPEG'
                  : 'JPEG';
        // dejar un pequeño padding
        doc.addImage(this.businessLogoBase64, fmt as any, m + 2, y + 2, col1W - 4, hdrH - 4);
      } catch {
        // Fallback a texto
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        const bizLines = doc.splitTextToSize(this.businessName.toUpperCase(), col1W - 4);
        doc.text(bizLines, m + col1W / 2, y + hdrH / 2, { align: 'center', baseline: 'middle' });
        if (this.businessRucDisplay) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...GRAY_TXT);
          doc.text(`RUC: ${this.businessRucDisplay}`, m + col1W / 2, y + hdrH / 2 + 5, { align: 'center' });
        }
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      const bizLines = doc.splitTextToSize(this.businessName.toUpperCase(), col1W - 4);
      doc.text(bizLines, m + col1W / 2, y + hdrH / 2, { align: 'center', baseline: 'middle' });
      if (this.businessRucDisplay) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...GRAY_TXT);
        doc.text(`RUC: ${this.businessRucDisplay}`, m + col1W / 2, y + hdrH / 2 + 5, { align: 'center' });
      }
    }
    doc.line(m + col1W, y, m + col1W, y + hdrH);

    // Col 2 — Título central
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text('REPORTE DE DÍAS & HORAS EXTRAS', m + col1W + col2W / 2, y + hdrH / 2 - 2, { align: 'center', baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_TXT);
    doc.text('Control de jornada suplementaria', m + col1W + col2W / 2, y + hdrH / 2 + 4, { align: 'center' });
    doc.line(m + col1W + col2W, y, m + col1W + col2W, y + hdrH);

    // Col 3 — Meta info (4 celdas)
    const metaX  = m + col1W + col2W;
    const metaH  = hdrH / 4;
    const meta   = [
      ['Código',    'RH-FOR-042'],
      ['Fecha Rev.', new Date().toLocaleDateString('es-EC')],
      ['Versión',   '01'],
      ['Período',   this.periodLabel(req.reportPeriod)],
    ];
    meta.forEach(([label, val], i) => {
      const my = y + i * metaH;
      if (i > 0) doc.line(metaX, my, metaX + col3W, my);
      doc.setFillColor(...GRAY_BG);
      doc.rect(metaX, my, col3W / 2, metaH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_TXT);
      doc.text(label.toUpperCase(), metaX + 1.5, my + metaH / 2 + 0.5, { baseline: 'middle' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(val, metaX + col3W / 2 + 1.5, my + metaH / 2 + 0.5, { baseline: 'middle' });
    });
    y += hdrH + 5;

    // ── 2. DATOS DEL COLABORADOR ─────────────────────────────────────────
    // Título de sección
    doc.setFillColor(236, 91, 19, 0.12 as any);
    doc.setFillColor(255, 237, 213);
    doc.rect(m, y, usable, 7, 'F');
    doc.setDrawColor(...BORDER);
    doc.rect(m, y, usable, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.text('INFORMACIÓN DEL COLABORADOR', m + 3, y + 4.5);
    y += 7;

    // Cuadrícula 2x2
    const empFields = [
      { label: 'NOMBRE Y APELLIDOS', val: req.employeeName || '—' },
      { label: 'CARGO',              val: req.employeePosition || '—' },
      { label: 'DEPARTAMENTO',       val: req.department || '—' },
      { label: 'JEFE INMEDIATO',     val: req.supervisorName || '—' },
    ];
    const empCellH = 12;
    const halfW    = usable / 2;
    empFields.forEach((f, i) => {
      const ex = m + (i % 2) * halfW;
      const ey = y + Math.floor(i / 2) * empCellH;
      doc.setDrawColor(...BORDER);
      doc.rect(ex, ey, halfW, empCellH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_TXT);
      doc.text(f.label, ex + 2, ey + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(f.val, ex + 2, ey + 9);
    });
    y += empCellH * 2 + 5;

    // ── 3. TABLA DE ACTIVIDADES ──────────────────────────────────────────
    // Rellenar al menos 3 filas para que haya espacio de firma
    const actRows = [...(req.activities || [])];
    while (actRows.length < 3) {
      actRows.push({ activityDate: '', startTime: '', endTime: '', description: '', supportDoc: '' });
    }

    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      head: [['N°', 'Fecha', 'Hora (Desde/Hasta)', 'Actividades (Especificación Detallada)', 'Sustento Verificable', 'Firma Jefe']],
      body: actRows.map((a, idx) => [
        String(idx + 1),
        a.activityDate || '',
        a.startTime && a.endTime ? `${a.startTime} - ${a.endTime}` : '',
        a.description || '',
        a.supportDoc || '',
        ''
      ]),
      headStyles: {
        fillColor: [248, 250, 252], textColor: DARK,
        fontSize: 6.5, fontStyle: 'bold', halign: 'center',
        lineColor: BORDER, lineWidth: 0.25
      },
      bodyStyles: {
        fontSize: 7, textColor: DARK,
        lineColor: BORDER, lineWidth: 0.25,
        minCellHeight: 14
      },
      alternateRowStyles: { fillColor: WHITE },
      columnStyles: {
        0: { cellWidth: 7,    halign: 'center' },
        1: { cellWidth: 22,   halign: 'center' },
        2: { cellWidth: 26,   halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 28 },
        5: { cellWidth: 25,   fillColor: GRAY_BG }
      },
      tableLineColor: BORDER,
      tableLineWidth: 0.25,
    });

    let tableEndY = (doc as any).lastAutoTable.finalY;
    y = tableEndY + 6;

    // ── 4. NOTA ──────────────────────────────────────────────────────────
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(m, y, m, y + 16);
    doc.setLineWidth(0.25);
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...GRAY_BG);
    doc.rect(m + 1.5, y, usable - 1.5, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...DARK);
    doc.text('NOTA: ', m + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const noteText = 'El presente reporte tiene carácter de declaración jurada. Las actividades aquí descritas deben estar alineadas con las necesidades operativas de la institución y contar con el respaldo documentario. La aprobación del jefe inmediato valida la ejecución efectiva de las horas reportadas.';
    const noteLines = doc.splitTextToSize(noteText, usable - 12);
    doc.text(noteLines, m + 15, y + 5);
    y += 21;

    // ── 5. FIRMAS ────────────────────────────────────────────────────────
    const sigW  = (usable - 20) / 2;
    const sigH  = 18;
    const sigs  = [
      { name: req.employeeName || '—',     role: 'TRABAJADOR' },
      { name: req.supervisorName || '—',   role: 'AUTORIZADO POR (JEFE INMEDIATO)' }
    ];
    sigs.forEach((s, i) => {
      const sx = m + i * (sigW + 20);
      // Línea de firma
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(sx, y + sigH, sx + sigW, y + sigH);
      doc.setLineWidth(0.25);
      // Nombre
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.text(s.name.toUpperCase(), sx + sigW / 2, y + sigH + 4, { align: 'center' });
      // Rol
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_TXT);
      doc.text(s.role, sx + sigW / 2, y + sigH + 8, { align: 'center' });
    });
    y += sigH + 14;

    // ── 6. SECCIÓN TTHH ─────────────────────────────────────────────────
    if (y + 32 > pageH - m) {
      doc.addPage();
      y = m;
    }
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.rect(m, y, usable, 32);
    doc.setLineWidth(0.25);

    doc.setFillColor(...GRAY_BG);
    doc.rect(m, y, usable, 32, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...ACCENT);
    doc.text('PARA USO EXCLUSIVO DE TALENTO HUMANO', m + 3, y + 5);

    // 3 columnas internas
    const thCols = [
      { title: 'VALIDACIÓN DE DOCUMENTOS', content: '[ ] Evidencia adjunta\n[ ] Reloj Marcador' },
      { title: 'FECHA DE RECEPCIÓN',        content: '___/___/______' },
      { title: 'APROBACIÓN FINAL TTHH',     content: '(Sello y Firma)' },
    ];
    const thColW = usable / 3;
    thCols.forEach((col, i) => {
      const tx = m + i * thColW;
      if (i > 0) {
        doc.setDrawColor(...BORDER);
        doc.line(tx, y + 1, tx, y + 31);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...GRAY_TXT);
      doc.text(col.title, tx + 3, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const cLines = col.content.split('\n');
      cLines.forEach((cl, ci) => doc.text(cl, tx + 3, y + 17 + ci * 6));
    });

    // ── 7. PIE DE PÁGINA ─────────────────────────────────────────────────
    const fY = pageH - 6;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(m, fY - 3, pageW - m, fY - 3);
    doc.setFontSize(6);
    doc.setTextColor(...GRAY_TXT);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.businessName} — Horas Extras ${this.periodLabel(req.reportPeriod)}`, m, fY);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-EC')} | RH-FOR-042`, pageW - m, fY, { align: 'right' });

    const fileName = `HorasExtras_${(req.employeeName || 'empleado').replace(/\s+/g,'_')}_${req.reportPeriod}.pdf`;
    doc.save(fileName);
  }

  downloadPdf(req: OvertimeRequest): void {
    this.generatePdf(req);
  }

  // ── Upload PDF firmado ───────────────────────────────────────────────────
  onSignedPdfSelected(event: Event, req: OvertimeRequest): void {
    if (!this.businessId || !req.id) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingId = req.id;
    this.attendanceService.uploadOvertimeSignedPdf(this.businessId, req.id, file).subscribe({
      next: updated => {
        this.uploadingId = null;
        const idx = this.requests.findIndex(r => r.id === updated.id);
        if (idx >= 0) this.requests[idx] = updated;
        this.applyFilters();
        this.successMsg = 'PDF firmado cargado. Solicitud aprobada.';
        setTimeout(() => this.successMsg = null, 4000);
      },
      error: err => {
        this.uploadingId = null;
        this.error = err?.error?.error || 'Error al cargar el PDF firmado.';
      }
    });
    input.value = '';
  }

  viewSignedPdf(req: OvertimeRequest): void {
    if (!this.businessId || !req.id) return;
    this.attendanceService.getOvertimeSignedPdf(this.businessId, req.id).subscribe({
      next: (blob: Blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: err => {
        this.error = err?.error?.error || 'No se pudo abrir el PDF firmado.';
      }
    });
  }

  // ── Detalle de solicitud ─────────────────────────────────────────────────
  openDetails(req: OvertimeRequest): void {
    this.detailReq = req;
  }

  closeDetails(): void {
    this.detailReq = null;
  }

  deleteRequest(req: OvertimeRequest): void {
    if (!this.businessId || !req.id) return;
    if (!confirm(`¿Eliminar la solicitud de ${req.employeeName}?`)) return;
    this.attendanceService.deleteOvertimeRequest(this.businessId, req.id).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== req.id);
        this.applyFilters();
      },
      error: () => {}
    });
  }

  // ── Utilidades ─────────────────────────────────────────────────────────
  getFullName(e: EmployeeResponse): string {
    return ((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || e.name || '—';
  }

  periodLabel(period: string): string {
    if (!period) return '—';
    const [y, m] = period.split('-');
    const ml = this.months.find(x => x.v === Number(m));
    return ml ? `${ml.l} ${y}` : period;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'badge-pending',
      APROBADO:  'badge-approved',
      PAGADO:    'badge-paid',
      RECHAZADO: 'badge-rejected'
    };
    return map[status] ?? 'badge-pending';
  }

  private calcHoursFromTimes(start?: string, end?: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
  }

  trackById(_i: number, r: OvertimeRequest): any { return r.id; }
}
