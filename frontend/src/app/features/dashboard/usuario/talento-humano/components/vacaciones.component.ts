import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService, VacationRecord } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../models/employee.model';

@Component({
  selector: 'app-vacaciones',
  templateUrl: './vacaciones.component.html',
  styleUrls: ['./vacaciones.component.scss']
})
export class VacacionesComponent implements OnInit {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';

  employees: EmployeeResponse[] = [];
  records: VacationRecord[] = [];

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
      startDate:       ['', Validators.required],
      endDate:         ['', Validators.required],
      daysAccumulated: [15, [Validators.required, Validators.min(0)]],
      notes:           [''],
      status:          ['APROBADO']
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
    this.attendanceService.getVacations(this.businessId, this.filterYear, this.filterMonth).subscribe({
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
    this.form.reset({ startDate: '', endDate: '', daysAccumulated: 15, notes: '', status: 'APROBADO' });
    this.error = null;
  }

  cancelForm(): void { this.showForm = false; this.selectedEmployee = null; }

  submitForm(): void {
    if (this.form.invalid || !this.businessId || !this.selectedEmployee) return;
    this.saving = true;
    this.error = null;
    this.attendanceService.saveVacation(this.businessId, this.selectedEmployee.id, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.selectedEmployee = null;
        this.successMsg = 'Vacaciones registradas correctamente';
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
    if (!this.businessId || !confirm('¿Eliminar este registro de vacaciones?')) return;
    this.attendanceService.deleteVacation(this.businessId, id).subscribe({
      next: () => this.loadRecords(),
      error: err => console.error(err)
    });
  }

  getFullName(e: EmployeeResponse): string {
    return ((e.nombres || '') + ' ' + (e.apellidos || '')).trim() || e.name || '—';
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-other';
    const s = status.toUpperCase();
    if (s === 'APROBADO') return 'status-ok';
    if (s === 'PENDIENTE') return 'status-pend';
    return 'status-other';
  }

  goBack(): void {
    if (this.businessRuc) this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'planilla-mensual']);
  }
}
