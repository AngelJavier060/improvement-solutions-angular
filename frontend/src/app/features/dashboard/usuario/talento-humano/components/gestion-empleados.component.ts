// ...existing code...
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { Employee, EmployeeResponse } from '../models/employee.model';

@Component({
  selector: 'app-gestion-empleados',
  templateUrl: './gestion-empleados.component.html',
  styleUrls: ['./gestion-empleados.component.scss']
})
export class GestionEmpleadosComponent implements OnInit {

  employees: EmployeeResponse[] = [];
  filteredEmployees: EmployeeResponse[] = [];
  searchTerm: string = '';
  loading = false;
  error: string | null = null;
  businessId = 3; // OrientOil empresa ID = 3
  businessRuc = '0365265569652'; // RUC de OrientOil

  // Modal
  showCreateModal = false;
  showEditModal = false;
  employeeToEdit: EmployeeResponse | null = null;

  constructor(
    private employeeService: EmployeeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener el RUC de la URL (en lugar del businessId)
    const routeRuc = this.route.snapshot.params['businessRuc'] || 
                     this.route.parent?.snapshot.params['businessRuc'];
    if (routeRuc) {
      this.businessRuc = routeRuc;
    }
    
    // Intentar obtener el businessId de la URL también para compatibilidad
    const routeBusinessId = this.route.snapshot.params['businessId'] || 
                           this.route.parent?.snapshot.params['businessId'];
    if (routeBusinessId) {
      this.businessId = parseInt(routeBusinessId, 10);
    }
    
    console.log('Business RUC para empleados:', this.businessRuc);
    console.log('Business ID para empleados:', this.businessId);
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading = true;
    this.error = null;
    
    // Usar el RUC para obtener empleados
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = employees;
        this.loading = false;
        console.log('Empleados cargados:', employees);
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.error = 'Error al cargar los empleados';
        this.loading = false;
      }
    });
  }

  // Método para filtrar empleados por búsqueda
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
        const email = (employee.email || '').toLowerCase();
        const position = this.getEmployeePosition(employee).toLowerCase();
        
        return fullName.toLowerCase().includes(term) || 
               cedula.includes(term) || 
               email.includes(term) || 
               position.includes(term);
      });
    }
  }

  // Método para manejar cambios en el input de búsqueda
  onSearchChange(): void {
    this.filterEmployees();
  }

  // Método para obtener el nombre completo
  getFullName(employee: EmployeeResponse): string {
    const nombres = employee.nombres || '';
    const apellidos = employee.apellidos || '';
    const fullName = `${nombres} ${apellidos}`.trim();
    
    // Si nombres y apellidos están vacíos, usar el campo name
    if (!fullName && employee.name) {
      return employee.name;
    }
    
    return fullName || 'Sin nombre';
  }

  // Método para obtener el cargo del empleado
  getEmployeePosition(employee: EmployeeResponse): string {
    // Intentar obtener el cargo de diferentes propiedades
    if (employee.positionName) {
      return employee.positionName;
    }
    if (employee.position?.name) {
      return employee.position.name;
    }
    if (employee.position) {
      return employee.position;
    }
    return 'Sin cargo';
  }

  // Método para obtener las iniciales del empleado
  getInitials(employee: EmployeeResponse): string {
    const nombres = employee.nombres || '';
    const apellidos = employee.apellidos || '';
    
    if (nombres && apellidos) {
      return (nombres.charAt(0) + apellidos.charAt(0)).toUpperCase();
    }
    
    const fullName = employee.name || 'NN';
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    
    return fullName.charAt(0).toUpperCase();
  }

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    console.log('Error cargando imagen:', event);
    event.target.style.display = 'none';
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  openEditModal(employee: EmployeeResponse): void {
    this.employeeToEdit = employee;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.employeeToEdit = null;
  }

  onEmployeeCreated(): void {
    this.closeCreateModal();
    this.loadEmployees();
  }

  onEmployeeUpdated(): void {
    this.closeEditModal();
    this.loadEmployees();
  }

  deleteEmployee(employee: EmployeeResponse): void {
    if (confirm(`¿Está seguro de que desea eliminar al empleado ${employee.name}?`)) {
      this.employeeService.deleteEmployee(employee.id).subscribe({
        next: () => {
          console.log('Empleado eliminado exitosamente');
          this.loadEmployees();
        },
        error: (error) => {
          console.error('Error al eliminar empleado:', error);
          alert('Error al eliminar el empleado');
        }
      });
    }
  }

  getStatusText(status: boolean): string {
    return status ? 'Activo' : 'Inactivo';
  }

  getStatusClass(status: boolean): string {
    return status ? 'badge-success' : 'badge-secondary';
  }

  // Contar empleados activos
  getActiveEmployeesCount(): number {
    return this.employees.filter(emp => emp.status === true).length;
  }

  // Contar empleados inactivos 
  getInactiveEmployeesCount(): number {
    return this.employees.filter(emp => emp.status === false).length;
  }

  // Devuelve la URL absoluta del backend para la imagen de perfil
  getEmployeeImageUrl(employee: any): string {
    const backendUrl = 'http://localhost:8080';
    if (employee.imagePath) {
      if (employee.imagePath.startsWith('http')) return employee.imagePath;
      // Si la ruta ya contiene 'uploads/profiles/', solo anteponer el backend
      if (employee.imagePath.startsWith('uploads/profiles/')) {
        return `${backendUrl}/api/files/profiles/${employee.imagePath.replace('uploads/profiles/', '')}`;
      }
      // Si la ruta es relativa simple, anteponer el backend y la carpeta
      return `${backendUrl}/api/files/profiles/${employee.imagePath}`;
    }
    if (employee.profile_picture) {
      if (employee.profile_picture.startsWith('http')) return employee.profile_picture;
      if (employee.profile_picture.startsWith('uploads/profiles/')) {
        return `${backendUrl}/api/files/profiles/${employee.profile_picture.replace('uploads/profiles/', '')}`;
      }
      return `${backendUrl}/api/files/profiles/${employee.profile_picture}`;
    }
    return '';
  }
}