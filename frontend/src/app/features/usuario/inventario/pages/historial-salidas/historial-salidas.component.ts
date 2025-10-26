import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FileService } from '../../../../../services/file.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { EmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';

@Component({
  selector: 'app-historial-salidas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historial-salidas.component.html',
  styleUrls: ['./historial-salidas.component.scss']
})
export class HistorialSalidasComponent implements OnInit {
  ruc: string = '';
  loading = false;
  outputs: InventoryOutput[] = [];
  employees: EmployeeResponse[] = [];
  selectedOutput: InventoryOutput | null = null;
  departments: Department[] = [];
  
  // Filtros
  startDate: string = '';
  endDate: string = '';
  filterEmployeeId: number | null = null;
  filterOutputType: string = '';

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private employeeService: EmployeeService,
    private fileService: FileService,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadEmployees();
    this.loadOutputs();
    this.loadDepartments();
  }

  loadEmployees(): void {
    this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
      next: (data) => this.employees = data,
      error: () => this.employees = []
    });
  }

  loadOutputs(): void {
    this.loading = true;
    this.outputService.list(this.ruc).subscribe({
      next: (data) => {
        this.outputs = data;
        this.loading = false;
      },
      error: () => {
        this.outputs = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    if (this.startDate && this.endDate) {
      this.loading = true;
      this.outputService.searchByDateRange(this.ruc, this.startDate, this.endDate).subscribe({
        next: (data) => {
          let result = data;
          if (this.filterEmployeeId) {
            result = result.filter(e => e.employeeId === this.filterEmployeeId);
          }
          if (this.filterOutputType) {
            result = result.filter(e => e.outputType === this.filterOutputType);
          }
          this.outputs = result;
          this.loading = false;
        },
        error: () => {
          this.outputs = [];
          this.loading = false;
        }
      });
    } else if (this.filterEmployeeId || this.filterOutputType) {
      this.loading = true;
      let observable = this.outputService.list(this.ruc);
      
      if (this.filterEmployeeId) {
        observable = this.outputService.findByEmployee(this.ruc, this.filterEmployeeId);
      } else if (this.filterOutputType) {
        observable = this.outputService.findByType(this.ruc, this.filterOutputType);
      }
      
      observable.subscribe({
        next: (data) => {
          this.outputs = data;
          this.loading = false;
        },
        error: () => {
          this.outputs = [];
          this.loading = false;
        }
      });
    } else {
      this.loadOutputs();
    }
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.filterEmployeeId = null;
    this.filterOutputType = '';
    this.loadOutputs();
  }

  viewDetails(output: InventoryOutput): void {
    this.selectedOutput = output;
  }

  getTotalAmount(): number {
    return this.outputs.reduce((sum, output) => {
      const outputTotal = output.details?.reduce((s, d) => s + (d.totalCost || 0), 0) || 0;
      return sum + outputTotal;
    }, 0);
  }

  getOutputTypeBadge(type: string): string {
    const badges: any = {
      'EPP_TRABAJADOR': 'bg-primary',
      'PRESTAMO': 'bg-warning',
      'CONSUMO_AREA': 'bg-info',
      'BAJA': 'bg-danger'
    };
    return badges[type] || 'bg-secondary';
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      'CONFIRMADO': 'bg-success',
      'BORRADOR': 'bg-warning',
      'ANULADO': 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  }

  getEmployeeName(employeeId?: number): string {
    if (!employeeId) return '';
    const employee = this.employees.find(e => e.id === employeeId);
    return employee ? `${employee.nombres} ${employee.apellidos}` : '';
  }

  getDocumentUrl(path?: string): string {
    if (!path) return '';
    return this.fileService.getFileUrl(path);
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => this.departments = data || [],
      error: () => this.departments = []
    });
  }

  getDepartmentName(id?: number): string {
    if (!id) return '--';
    const d = this.departments.find(x => x.id === id);
    return d?.name || String(id);
  }
}
