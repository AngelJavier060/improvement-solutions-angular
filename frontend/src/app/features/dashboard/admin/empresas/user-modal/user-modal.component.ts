import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CargoService } from '../../../../../services/cargo.service';
import { UserService } from '../../../../../services/user.service';

export interface UserFormData {
  id?: number;
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  business_id?: number;
  permission_ids: number[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  username: string;
  business_id: number;
  permissions: any[];
  roles?: string[]; // Agregar roles como opcional
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  department: {
    id: number;
    name: string;
  };
}

export interface DepartmentGroup {
  name: string;
  permissions: Permission[];
}

@Component({
  selector: 'app-user-modal',
  templateUrl: './user-modal.component.html',
  styleUrls: ['./user-modal.component.scss']
})
export class UserModalComponent implements OnInit, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() empresa: any = null;
  @Input() userToEdit: User | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<void>();

  userForm: UserFormData = {
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    permission_ids: []
  };

  permissions: Permission[] = [];
  departmentGroups: DepartmentGroup[] = [];
  loading: boolean = false;
  submitting: boolean = false;

  constructor(
    private cargoService: CargoService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadPermissions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible'] && this.isVisible) {
      if (this.userToEdit) {
        this.populateForm();
      } else {
        this.resetForm();
      }
    }
  }

  loadPermissions() {
    this.loading = true;
    // Usando el servicio de cargos para obtener permisos
    // En un escenario real, necesitarías un servicio específico para permisos
    this.cargoService.getCargos().subscribe({
      next: (cargos: any[]) => {
        // Transformar cargos en permisos con departamentos
        this.permissions = cargos.map(cargo => ({
          id: cargo.id,
          name: cargo.name,
          department: {
            id: cargo.department?.id || 1,
            name: cargo.department?.name || 'General'
          }
        }));
        this.groupPermissionsByDepartment();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading permissions:', error);
        this.loading = false;
      }
    });
  }

  groupPermissionsByDepartment() {
    const grouped = this.permissions.reduce((acc: any, permission) => {
      const deptName = permission.department.name.toLowerCase();
      if (!acc[deptName]) {
        acc[deptName] = {
          name: deptName,
          permissions: []
        };
      }
      acc[deptName].permissions.push(permission);
      return acc;
    }, {});

    this.departmentGroups = Object.values(grouped);
  }

  populateForm() {
    if (this.userToEdit) {
      this.userForm = {
        id: this.userToEdit.id,
        name: this.userToEdit.name,
        email: this.userToEdit.email,
        phone: this.userToEdit.phone,
        username: this.userToEdit.username,
        password: '',
        business_id: this.empresa?.id,
        permission_ids: this.userToEdit.permissions?.map(p => p.id) || []
      };
    }
  }

  resetForm() {
    this.userForm = {
      name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      business_id: this.empresa?.id,
      permission_ids: []
    };
  }

  onPermissionChange(permissionId: number, event: any) {
    const isChecked = event.target.checked;
    
    if (isChecked) {
      if (!this.userForm.permission_ids.includes(permissionId)) {
        this.userForm.permission_ids.push(permissionId);
      }
    } else {
      this.userForm.permission_ids = this.userForm.permission_ids.filter(id => id !== permissionId);
    }
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.userForm.permission_ids.includes(permissionId);
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.submitting = true;
      
      const userData = {
        ...this.userForm,
        business_id: this.empresa.id
      };

      const saveOperation = this.userToEdit 
        ? this.userService.updateUser(userData)
        : this.userService.createUser(userData);

      saveOperation.subscribe({
        next: (response: any) => {
          console.log('User saved successfully:', response);
          this.submitting = false;
          this.userSaved.emit();
          this.close();
        },
        error: (error: any) => {
          console.error('Error saving user:', error);
          this.submitting = false;
        }
      });
    }
  }

  close() {
    this.isVisible = false;
    this.resetForm();
    this.closeModal.emit();
  }
}
