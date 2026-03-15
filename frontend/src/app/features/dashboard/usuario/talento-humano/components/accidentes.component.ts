import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, IncidentRecord } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../models/employee.model';

@Component({
  selector: 'app-accidentes',
  templateUrl: './accidentes.component.html',
  styleUrls: ['./accidentes.component.scss']
})
export class AccidentesComponent implements OnInit {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';

  employees: EmployeeResponse[] = [];
  records: IncidentRecord[] = [];

  selectedEmployee: EmployeeResponse | null = null;
  searchEmp: string = '';

  form!: FormGroup;
  showForm = false;
  saving = false;
  loading = false;
  loadingEmps = false;
  error: string | null = null;
  successMsg: string | null = null;

  filterYear: number = new Date().getFullYear();
  filterMonth: number = new Date().getMonth() + 1;

  readonly incidentTypes = ['ACCIDENTE', 'INCIDENTE', 'CUASI_ACCIDENTE'];
  readonly severities     = ['LEVE', 'MODERADO', 'GRAVE', 'FATAL'];

  readonly months = [
    {v:1,l:'Enero'},{v:2,l:'Febrero'},{v:3,l:'Marzo'},{v:4,l:'Abril'},
    {v:5,l:'Mayo'},{v:6,l:'Junio'},{v:7,l:'Julio'},{v:8,l:'Agosto'},
    {v:9,l:'Septiembre'},{v:10,l:'Octubre'},{v:11,l:'Noviembre'},{v:12,l:'Diciembre'}
  ];
  readonly availableYears = Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private businessContext: BusinessContextService,
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.extractParams();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      incidentDate: ['', Validators.required],
      incidentTime: [''],
      incidentType: ['INCIDENTE', Validators.required],
      description:  ['', [Validators.required, Validators.minLength(10)]],
      location:     [''],
      severity:     ['LEVE', Validators.required],
      notes:        ['']
    });
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
      this.businessId   = active.id;
      this.businessName = active.name ?? '';
      if (!this.businessRuc) this.businessRuc = active.ruc;
      this.loadEmployees();
      this.loadRecords();
    } else if (this.businessRuc) {
      this.businessService.getAll().subscribe({
        next: (list: any[]) => {
          const found = list.find((b: any) => b.ruc === this.businessRuc);
          if (found) { this.businessId = found.id; this.businessName = found.name ?? ''; }
          this.loadEmployees();
          this.loadRecords();
        },
        error: () => { this.loadEmployees(); this.loadRecords(); }
      });
    }
  }

  loadEmployees(): void {
    if (!this.businessRuc) return;
    this.loadingEmps = true;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: emps => { this.employees = emps.filter(e => e.active !== false); this.loadingEmps = false; },
      error: () => { this.loadingEmps = false; }
    });
  }

  loadRecords(): void {
    if (!this.businessId) return;
    this.loading = true;
    this.attendanceService.getIncidents(this.businessId, this.filterYear, this.filterMonth).subscribe({
      next: recs => { this.records = recs; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get filteredEmployees(): EmployeeResponse[] {
    const q = this.searchEmp.trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter(e =>
      ((e.nombres || '') + ' ' + (e.apellidos || '')).toLowerCase().includes(q) ||
      (e.cedula || '').includes(q)
    );
  }

  selectEmployee(emp: EmployeeResponse): void {
    this.selectedEmployee = emp;
    this.showForm = true;
    this.form.reset({ incidentDate: '', incidentTime: '', incidentType: 'INCIDENTE',
                      description: '', location: '', severity: 'LEVE', notes: '' });
    this.error = null;
  }

  cancelForm(): void { this.showForm = false; this.selectedEmployee = null; }

  submitForm(): void {
    if (this.form.invalid || !this.businessId || !this.selectedEmployee) return;
    this.saving = true;
    this.error = null;
    this.attendanceService.saveIncident(this.businessId, this.selectedEmployee.id, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.selectedEmployee = null;
        this.successMsg = 'Incidente/Accidente registrado correctamente';
        setTimeout(() => this.successMsg = null, 3500);
        this.loadRecords();
      },
      error: err => {
        this.saving = false;
        this.error = 'Error al guardar. Verifique los datos e intente nuevamente.';
        console.error(err);
      }
    });
  }

  deleteRecord(id: number): void {
    if (!this.businessId || !confirm('¿Eliminar este registro?')) return;
    this.attendanceService.deleteIncident(this.businessId, id).subscribe({
      next: () => this.loadRecords(),
      error: err => console.error(err)
    });
  }

  getFullName(e: EmployeeResponse): string {
    return ((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || e.name || '—';
  }

  getSeverityClass(sev: string): string {
    if (!sev) return 'sev-leve';
    const s = sev.toUpperCase();
    if (s === 'LEVE')     return 'sev-leve';
    if (s === 'MODERADO') return 'sev-moderado';
    if (s === 'GRAVE')    return 'sev-grave';
    if (s === 'FATAL')    return 'sev-fatal';
    return 'sev-leve';
  }

  getTypeClass(type: string): string {
    if (!type) return 'status-other';
    const t = type.toUpperCase();
    if (t === 'ACCIDENTE')     return 'status-ok';
    if (t === 'CUASI_ACCIDENTE') return 'status-pend';
    return 'status-other';
  }

  goBack(): void {
    if (this.businessRuc) this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'planilla-mensual']);
  }
}
