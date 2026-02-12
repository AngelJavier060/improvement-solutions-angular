import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeAccountService, EmployeeWithAccount } from '../../../../services/employee-account.service';
import { BusinessService } from '../../../../services/business.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-empleados-empresa',
  templateUrl: './empleados-empresa.component.html',
  styleUrls: ['./empleados-empresa.component.scss']
})
export class EmpleadosEmpresaComponent implements OnInit {

  businessId!: number;
  businessName = '';
  employees: EmployeeWithAccount[] = [];
  filteredEmployees: EmployeeWithAccount[] = [];
  isLoading = true;
  searchText = '';
  filterAccount: 'all' | 'with' | 'without' = 'all';
  isSuperAdmin = false;

  // Create account modal
  showCreateModal = false;
  selectedEmployee: EmployeeWithAccount | null = null;
  accountForm = { username: '', password: '', email: '' };
  isCreating = false;

  constructor(
    private route: ActivatedRoute,
    private employeeAccountService: EmployeeAccountService,
    private businessService: BusinessService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.hasRole('ROLE_SUPER_ADMIN');
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.businessId = +params['id'];
        this.loadBusiness();
        this.loadEmployees();
      }
    });
  }

  loadBusiness(): void {
    this.businessService.getById(this.businessId).subscribe({
      next: (b: any) => { this.businessName = b.name || ''; }
    });
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.employeeAccountService.getEmployeesWithAccountStatus(this.businessId).subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.employees = [];
        this.filteredEmployees = [];
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    let list = [...this.employees];

    if (this.searchText.trim()) {
      const s = this.searchText.toLowerCase();
      list = list.filter(e =>
        (e.fullName || '').toLowerCase().includes(s) ||
        (e.cedula || '').includes(s) ||
        (e.email || '').toLowerCase().includes(s)
      );
    }

    if (this.filterAccount === 'with') {
      list = list.filter(e => e.hasAccount);
    } else if (this.filterAccount === 'without') {
      list = list.filter(e => !e.hasAccount);
    }

    this.filteredEmployees = list;
  }

  get countWithAccount(): number {
    return this.employees.filter(e => e.hasAccount).length;
  }

  get countWithoutAccount(): number {
    return this.employees.filter(e => !e.hasAccount).length;
  }

  // ---- Create Account Modal ----

  openCreateAccountModal(emp: EmployeeWithAccount): void {
    this.selectedEmployee = emp;
    this.accountForm = {
      username: emp.cedula || '',
      password: '',
      email: emp.email || ''
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.selectedEmployee = null;
    this.isCreating = false;
  }

  createAccount(): void {
    if (!this.selectedEmployee || !this.accountForm.password) return;
    this.isCreating = true;

    this.employeeAccountService.createAccount(this.selectedEmployee.id, this.accountForm).subscribe({
      next: () => {
        alert('Cuenta creada exitosamente. El empleado puede iniciar sesión con su cédula.');
        this.closeCreateModal();
        this.loadEmployees();
      },
      error: (err) => {
        this.isCreating = false;
        alert('Error: ' + (err?.error?.message || err?.message || 'Error desconocido'));
      }
    });
  }
}
