import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { DepartmentService } from '../../../../services/department.service';
import { UserService } from '../../../../services/user.service';
import { environment } from '../../../../../environments/environment';
import { forkJoin } from 'rxjs';
import { User } from './user-modal/user-modal.component';

@Component({
  selector: 'app-detalle-empresa-admin',
  templateUrl: './detalle-empresa-admin.component.html',
  styleUrls: ['./detalle-empresa-admin.component.scss']
})
export class DetalleEmpresaAdminComponent implements OnInit {
  empresaId!: number;
  empresa: any = null;
  loading = true;
  error: string | null = null;

  // Listas simplificadas - solo para usuarios
  departamentos: any[] = [];
  
  // Variables para gestión de usuarios
  users: User[] = [];
  userToEdit: User | null = null;
  showUserModal = false;

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private departmentService: DepartmentService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.empresaId = +params['id'];
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.loading = true;
    
    // Cargar solo empresa y usuarios - simplificado para enfocarse en gestión de usuarios
    forkJoin({
      empresa: this.businessService.getBusinessAdminDetails(this.empresaId),
      users: this.userService.getUsersByBusiness(this.empresaId),
      departamentos: this.departmentService.getAllDepartments() // Solo para usuarios
    }).subscribe({
      next: (data: any) => {
        this.empresa = data.empresa;
        this.users = data.users || [];
        this.departamentos = data.departamentos || [];
        
        console.log('Datos cargados:', {
          empresa: this.empresa,
          users: this.users,
          departamentos: this.departamentos
        });
        
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Error al cargar los datos';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  getLogoUrl(): string {
    if (this.empresa?.logo) {
      return `${environment.apiUrl}/api/files/logo/${this.empresa.logo}`;
    }
    return 'assets/default-logo.png';
  }

  // Métodos para gestión de usuarios
  openCreateUserModal(): void {
    this.userToEdit = null;
    this.showUserModal = true;
  }

  openEditUserModal(user: User): void {
    this.userToEdit = user;
    this.showUserModal = true;
  }

  onUserSaved(user: User): void {
    if (this.userToEdit) {
      // Actualizar usuario existente
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index] = user;
      }
    } else {
      // Agregar nuevo usuario
      this.users.push(user);
    }
    
    this.showUserModal = false;
    this.userToEdit = null;
  }

  deleteUser(userId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
        },
        error: (error: any) => {
          console.error('Error al eliminar usuario:', error);
          alert('Error al eliminar el usuario');
        }
      });
    }
  }
}
