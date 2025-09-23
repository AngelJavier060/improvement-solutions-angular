import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { EmployeeResponse } from '../models/employee.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-documents-certifications',
  templateUrl: './documents-certifications.component.html',
  styleUrls: ['./documents-certifications.component.scss']
})
export class DocumentsCertificationsComponent implements OnInit {

  employees: EmployeeResponse[] = [];
  filteredEmployees: EmployeeResponse[] = [];
  searchTerm: string = '';
  searchCedula: string = '';
  selectedEmployee: EmployeeResponse | null = null;
  loading = false;
  error: string | null = null;
  businessRuc: string | null = null;

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.extractRouteParams();
    this.loadEmployees();
  }

  private extractRouteParams(): void {
    const findParamUp = (key: string): string | null => {
      let r: any = this.route;
      while (r) {
        const val = r.snapshot?.params?.[key];
        if (val !== undefined) {
          return val;
        }
        r = r.parent;
      }
      return null;
    };

    const ruc = findParamUp('businessRuc') || findParamUp('ruc');
    this.businessRuc = ruc || null;
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = null;

    if (this.businessRuc && this.businessRuc.trim() !== '') {
      this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
        next: (employees) => {
          this.employees = employees;
          this.filterEmployees();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar empleados:', error);
          this.error = 'Error al cargar los empleados';
          this.loading = false;
        }
      });
    } else {
      this.employees = [];
      this.filteredEmployees = [];
      this.loading = false;
      this.error = 'Seleccione una empresa para ver sus empleados.';
    }
  }

  filterEmployees(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEmployees = this.employees;
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredEmployees = this.employees.filter(employee => {
        const nombres = employee.nombres || '';
        const apellidos = employee.apellidos || '';
        const fullName = `${nombres} ${apellidos}`.trim() || employee.name || '';
        const cedula = (employee.cedula || '').toLowerCase();

        return fullName.toLowerCase().includes(term) || cedula.includes(term);
      });
    }
  }

  onSearchChange(): void {
    this.filterEmployees();
  }

  getFullName(employee: EmployeeResponse): string {
    const nombres = employee.nombres || '';
    const apellidos = employee.apellidos || '';
    const fullName = `${nombres} ${apellidos}`.trim();

    return fullName || employee.name || 'Sin nombre';
  }

  goToEmployeeDocuments(employee: EmployeeResponse): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'dashboard', 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab: 'documents' }
      });
    }
  }

  goToEmployeeCourses(employee: EmployeeResponse): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'dashboard', 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab: 'courses' }
      });
    }
  }

  searchByCedula(): void {
    if (!this.searchCedula.trim()) {
      this.selectedEmployee = null;
      return;
    }

    const cedula = this.searchCedula.trim();
    this.selectedEmployee = this.employees.find(emp => emp.cedula === cedula) || null;

    if (!this.selectedEmployee) {
      alert('No se encontró un empleado con esa cédula.');
    }
  }

  manageCourses(employee: EmployeeResponse): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'dashboard', 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab: 'courses' }
      });
    }
  }

  manageDocuments(employee: EmployeeResponse): void {
    if (this.businessRuc) {
      this.router.navigate(['/usuario', this.businessRuc, 'dashboard', 'talento-humano', 'employee', employee.cedula], {
        queryParams: { tab: 'documents' }
      });
    }
  }
}