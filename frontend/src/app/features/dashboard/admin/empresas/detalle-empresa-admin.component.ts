import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { DepartmentService } from '../../../../services/department.service';
import { UserService } from '../../../../services/user.service';
import { CreateUserRequest, Role } from '../../../../services/user.service';
import { CargoService } from '../../../../services/cargo.service';
import { TipoDocumentoService } from '../../../../services/tipo-documento.service';
import { TypeContractService } from '../../../../services/type-contract.service';
import { ObligationMatrixService } from '../../../../services/obligation-matrix.service';
import { IessService } from '../../../../services/iess.service';
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

  // Listas para todos los datos disponibles
  departamentos: any[] = [];
  cargos: any[] = [];
  tiposDocumentos: any[] = [];
  tiposContratos: any[] = [];
  obligacionesMatriz: any[] = [];
  iessList: any[] = [];
  roles: Role[] = [];
  
  // Variables para gestión de usuarios
  users: User[] = [];
  userToEdit: User | null = null;
  showUserModal = false;

  // Variables para crear usuarios
  showCreateUserModal = false;
  editingUserId: number | null = null;
  isEditingUser = false;
  newUser = {
    nombres: '',
    apellidos: '',
    cedula: '',
    telefono: '',
    email: '',
    username: '',
    password: '',
    selectedRoles: [] as number[]
  };
  showPassword = false;

  // Variables para modales de asignación (simplificados)
  showAsignDepartmentModal = false;
  showAsignCargoModal = false;
  showAsignDocumentModal = false;
  showAsignContractModal = false;
  showAsignObligationModal = false;
  showAsignIessModal = false;

  // Variables para selección de elementos (permitir múltiples selecciones)
  selectedDepartamentos: string[] = [];
  selectedCargos: string[] = [];
  selectedTiposDocumentos: string[] = [];
  selectedTiposContratos: string[] = [];
  selectedObligacionesMatriz: string[] = [];
  selectedIess: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private departmentService: DepartmentService,
    private userService: UserService,
    private cargoService: CargoService,
    private tipoDocumentoService: TipoDocumentoService,
    private typeContractService: TypeContractService,
    private obligationMatrixService: ObligationMatrixService,
    private iessService: IessService
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
    this.error = null;
    
    console.log('Cargando datos para empresa ID:', this.empresaId);
    
    // Cargar empresa
    this.businessService.getById(this.empresaId).subscribe({
      next: (empresa: any) => {
        console.log('Empresa cargada:', empresa);
        this.empresa = empresa;
        
        // Asegurar que todas las propiedades array existen (como frontend-admin)
        if (!this.empresa.departments) this.empresa.departments = [];
        if (!this.empresa.positions) this.empresa.positions = [];
        if (!this.empresa.type_documents) this.empresa.type_documents = [];
        if (!this.empresa.type_contracts) this.empresa.type_contracts = [];
        if (!this.empresa.ieses) this.empresa.ieses = [];
        if (!this.empresa.users) this.empresa.users = [];
        if (!this.empresa.employees) this.empresa.employees = [];
        if (!this.empresa.obligation_matrices) this.empresa.obligation_matrices = [];
        
        // Cargar usuarios por separado
        this.loadUsers();
        
        // Cargar datos de configuración
        this.loadConfigurationData();
      },
      error: (error: any) => {
        console.error('Error al cargar empresa:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        console.error('Is this really an error?', error.status !== 200);
        
        // Solo mostrar error si realmente es un error (no 200)
        if (error.status !== 200) {
          this.error = `Error al cargar la empresa: ${error.message || error.status || 'Error desconocido'}`;
          this.loading = false;
        } else {
          console.log('Respuesta exitosa interpretada como error - ignorando');
        }
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsersByBusiness(this.empresaId).subscribe({
      next: (users: any) => {
        console.log('Usuarios cargados:', users);
        this.users = users || [];
      },
      error: (error: any) => {
        console.error('Error al cargar usuarios:', error);
        this.users = [];
      }
    });
  }

  loadConfigurationData(): void {
    // Cargar todos los datos de configuración en paralelo
    forkJoin({
      departamentos: this.departmentService.getAllDepartments(),
      cargos: this.cargoService.getCargos(),
      tiposDocumentos: this.tipoDocumentoService.getTiposDocumento(),
      tiposContratos: this.typeContractService.getAllTypeContracts(),
      obligacionesMatriz: this.obligationMatrixService.getObligationMatrices(),
      iessList: this.iessService.getIessItems(),
      roles: this.userService.getRoles()
    }).subscribe({
      next: (data) => {
        console.log('Datos de configuración cargados:', data);
        this.departamentos = data.departamentos || [];
        this.cargos = data.cargos || [];
        this.tiposDocumentos = data.tiposDocumentos || [];
        this.tiposContratos = data.tiposContratos || [];
        this.obligacionesMatriz = data.obligacionesMatriz || [];
        this.iessList = data.iessList || [];
        this.roles = data.roles || [];
        
        // Debug específico para obligaciones
        console.log('ObligacionesMatriz cargadas:', this.obligacionesMatriz);
        console.log('Cantidad de obligaciones:', this.obligacionesMatriz.length);
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar datos de configuración:', error);
        // Inicializar con arrays vacíos en caso de error
        this.departamentos = [];
        this.cargos = [];
        this.tiposDocumentos = [];
        this.tiposContratos = [];
        this.obligacionesMatriz = [];
        this.iessList = [];
        this.loading = false;
      }
    });
  }

  getLogoUrl(): string {
    if (this.empresa?.logo) {
      // El backend sirve archivos desde /api/files/ y empresa.logo ya incluye la subcarpeta (ej: "logos/filename.png")
      return `${environment.apiUrl}/api/files/${this.empresa.logo}`;
    }
    return 'assets/default-logo.png';
  }

  // === USUARIOS ===
  // === USUARIOS ===
  openCreateUserModal(): void {
    this.resetUserForm();
    this.showCreateUserModal = true;
  }

  createUser(): void {
    if (!this.empresa?.id) {
      alert('Error: No se encontró la información de la empresa');
      return;
    }

    // Si estamos en modo edición, llamar a updateUser en su lugar
    if (this.isEditingUser) {
      this.updateUser();
      return;
    }

    const userData: CreateUserRequest = {
      name: `${this.newUser.nombres} ${this.newUser.apellidos}`,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password,
      phone: this.newUser.telefono,
      business_id: this.empresa.id,
      role_ids: this.newUser.selectedRoles.length > 0 ? this.newUser.selectedRoles : undefined
    };

    console.log('Datos del usuario a crear:', userData);
    console.log('ID de la empresa:', this.empresa.id);

    this.userService.createUser(userData).subscribe({
      next: (response) => {
        console.log('Usuario creado exitosamente:', response);
        
        // Mostrar roles asignados en el mensaje
        let message = 'Usuario creado exitosamente para la empresa';
        if (response.roles && response.roles.length > 0) {
          const roleNames = response.roles.map(role => role.name).join(', ');
          message += `\nRoles asignados: ${roleNames}`;
        }
        
        alert(message);
        this.closeUserModal();
        // Recargar los datos de la empresa
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        console.error('Detalles del error:', error.error);
        
        let errorMessage = 'Error al crear el usuario para la empresa';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          // Verificar si es por email duplicado u otros errores comunes
          if (error.error && error.error.includes && error.error.includes('email')) {
            errorMessage = 'Este email ya está registrado en el sistema. Por favor, use otro email.';
          } else {
            errorMessage = 'Datos incorrectos. Verifique que todos los campos estén completos y válidos.';
          }
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
        }
        
        alert(errorMessage);
      }
    });
  }

  resetUserForm(): void {
    this.newUser = {
      nombres: '',
      apellidos: '',
      cedula: '',
      telefono: '',
      email: '',
      username: '',
      password: '',
      selectedRoles: []
    };
  }

  onRoleChange(roleId: number, event: any): void {
    if (event.target.checked) {
      if (!this.newUser.selectedRoles.includes(roleId)) {
        this.newUser.selectedRoles.push(roleId);
      }
    } else {
      this.newUser.selectedRoles = this.newUser.selectedRoles.filter(id => id !== roleId);
    }
    console.log('Roles seleccionados:', this.newUser.selectedRoles);
  }

  // Método temporal para depurar la validación del formulario
  debugFormValidation(form: any): void {
    console.log('Form valid:', form.valid);
    console.log('Form controls:', form.controls);
    console.log('Form errors:', form.errors);
    console.log('User data:', this.newUser);
    
    // Verificar cada control individualmente
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key];
      console.log(`${key}: valid=${control.valid}, value='${control.value}', errors=`, control.errors);
    });
  }

  // Validación personalizada del formulario
  isFormValid(): boolean {
    const isValid = !!(
      this.newUser.nombres &&
      this.newUser.apellidos &&
      this.newUser.email &&
      this.newUser.username &&
      this.newUser.password &&
      this.newUser.nombres.trim() !== '' &&
      this.newUser.apellidos.trim() !== '' &&
      this.newUser.email.trim() !== '' &&
      this.newUser.username.trim() !== '' &&
      this.newUser.password.trim() !== ''
    );
    
    console.log('Form validation check:', {
      nombres: this.newUser.nombres,
      apellidos: this.newUser.apellidos,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password,
      isValid: isValid
    });
    
    return isValid;
  }

  openEditUserModal(user: User): void {
    this.userToEdit = user;
    this.showUserModal = true;
  }

  onUserSaved(user: User): void {
    if (this.userToEdit) {
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index] = user;
      }
    } else {
      this.users.push(user);
    }
    this.showUserModal = false;
    this.userToEdit = null;
  }

  // === DEPARTAMENTOS ===
  openAsignDepartmentModal(): void {
    this.selectedDepartamentos = [];
    this.showAsignDepartmentModal = true;
  }

  closeAsignDepartmentModal(): void {
    this.showAsignDepartmentModal = false;
  }

  asignDepartment(): void {
    if (!this.selectedDepartamentos.length || !this.empresa?.id) return;
    
    // Crear promesas para agregar cada departamento
    const addPromises = this.selectedDepartamentos.map(departmentId => 
      this.businessService.addDepartmentToBusiness(this.empresa.id, Number(departmentId)).toPromise()
    );

    Promise.all(addPromises).then(() => {
      // Agregar a la vista local
      this.selectedDepartamentos.forEach(selectedId => {
        const deptSelected = this.departamentos.find((d: any) => d.id == selectedId);
        if (deptSelected) {
          const exists = this.empresa.departments.find((d: any) => d.id == selectedId);
          if (!exists) {
            this.empresa.departments.push(deptSelected);
          }
        }
      });
      
      this.selectedDepartamentos = [];
      this.showAsignDepartmentModal = false;
      alert('Departamentos asignados exitosamente');
    }).catch(error => {
      console.error('Error al asignar departamentos:', error);
      alert('Error al asignar departamentos. Por favor, inténtelo de nuevo.');
    });
  }

  removeDepartment(departmentId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este departamento de la empresa?')) {
      this.businessService.removeDepartmentFromBusiness(this.empresa.id, departmentId).subscribe({
        next: () => {
          this.empresa.departments = this.empresa.departments.filter((d: any) => d.id !== departmentId);
          alert('Departamento eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar departamento:', error);
          alert('Error al eliminar el departamento. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === CARGOS ===
  openAsignCargoModal(): void {
    this.selectedCargos = [];
    this.showAsignCargoModal = true;
  }

  asignCargo(): void {
    if (!this.selectedCargos.length || !this.empresa?.id) return;
    
    // Crear promesas para agregar cada cargo
    const addPromises = this.selectedCargos.map(cargoId => 
      this.businessService.addPositionToBusiness(this.empresa.id, Number(cargoId)).toPromise()
    );

    Promise.all(addPromises).then(() => {
      // Agregar a la vista local
      this.selectedCargos.forEach(selectedId => {
        const cargoSelected = this.cargos.find((c: any) => c.id == selectedId);
        if (cargoSelected) {
          const exists = this.empresa.positions.find((p: any) => p.id == selectedId);
          if (!exists) {
            this.empresa.positions.push(cargoSelected);
          }
        }
      });
      
      this.selectedCargos = [];
      this.showAsignCargoModal = false;
      alert('Cargos asignados exitosamente');
    }).catch(error => {
      console.error('Error al asignar cargos:', error);
      alert('Error al asignar cargos. Por favor, inténtelo de nuevo.');
    });
  }

  removeCargo(cargoId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este cargo de la empresa?')) {
      this.businessService.removePositionFromBusiness(this.empresa.id, cargoId).subscribe({
        next: () => {
          this.empresa.positions = this.empresa.positions.filter((p: any) => p.id !== cargoId);
          alert('Cargo eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar cargo:', error);
          alert('Error al eliminar el cargo. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === TIPOS DE DOCUMENTOS ===
  openAsignDocumentModal(): void {
    this.selectedTiposDocumentos = [];
    this.showAsignDocumentModal = true;
  }

  asignDocument(): void {
    if (!this.selectedTiposDocumentos.length || !this.empresa?.id) return;
    
    // Crear promesas para agregar cada tipo de documento
    const addPromises = this.selectedTiposDocumentos.map(typeDocumentId => 
      this.businessService.addTypeDocumentToBusiness(this.empresa.id, Number(typeDocumentId)).toPromise()
    );

    Promise.all(addPromises).then(() => {
      // Agregar a la vista local
      this.selectedTiposDocumentos.forEach(selectedId => {
        const tipoSelected = this.tiposDocumentos.find((t: any) => t.id == selectedId);
        if (tipoSelected) {
          const exists = this.empresa.type_documents.find((t: any) => t.id == selectedId);
          if (!exists) {
            this.empresa.type_documents.push(tipoSelected);
          }
        }
      });
      
      this.selectedTiposDocumentos = [];
      this.showAsignDocumentModal = false;
      alert('Tipos de documento asignados exitosamente');
    }).catch(error => {
      console.error('Error al asignar tipos de documento:', error);
      alert('Error al asignar tipos de documento. Por favor, inténtelo de nuevo.');
    });
  }

  removeDocument(documentId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este tipo de documento de la empresa?')) {
      this.businessService.removeTypeDocumentFromBusiness(this.empresa.id, documentId).subscribe({
        next: () => {
          this.empresa.type_documents = this.empresa.type_documents.filter((t: any) => t.id !== documentId);
          alert('Tipo de documento eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar tipo de documento:', error);
          alert('Error al eliminar el tipo de documento. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === TIPOS DE CONTRATOS ===
  openAsignContractModal(): void {
    this.selectedTiposContratos = [];
    this.showAsignContractModal = true;
  }

  asignContract(): void {
    if (!this.selectedTiposContratos.length || !this.empresa?.id) return;
    
    // Crear promesas para agregar cada tipo de contrato
    const addPromises = this.selectedTiposContratos.map(typeContractId => 
      this.businessService.addTypeContractToBusiness(this.empresa.id, Number(typeContractId)).toPromise()
    );

    Promise.all(addPromises).then(() => {
      // Agregar a la vista local
      this.selectedTiposContratos.forEach(selectedId => {
        const tipoSelected = this.tiposContratos.find((t: any) => t.id == selectedId);
        if (tipoSelected) {
          const exists = this.empresa.type_contracts.find((t: any) => t.id == selectedId);
          if (!exists) {
            this.empresa.type_contracts.push(tipoSelected);
          }
        }
      });
      
      this.selectedTiposContratos = [];
      this.showAsignContractModal = false;
      alert('Tipos de contrato asignados exitosamente');
    }).catch(error => {
      console.error('Error al asignar tipos de contrato:', error);
      alert('Error al asignar tipos de contrato. Por favor, inténtelo de nuevo.');
    });
  }

  removeContract(contractId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este tipo de contrato de la empresa?')) {
      this.businessService.removeTypeContractFromBusiness(this.empresa.id, contractId).subscribe({
        next: () => {
          this.empresa.type_contracts = this.empresa.type_contracts.filter((t: any) => t.id !== contractId);
          alert('Tipo de contrato eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar tipo de contrato:', error);
          alert('Error al eliminar el tipo de contrato. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === OBLIGACIONES ===
  openAsignObligationModal(): void {
    console.log('Abriendo modal de obligaciones');
    console.log('ObligacionesMatriz disponibles:', this.obligacionesMatriz);
    console.log('Cantidad:', this.obligacionesMatriz.length);
    this.selectedObligacionesMatriz = [];
    this.showAsignObligationModal = true;
  }

  asignObligation(): void {
    if (!this.selectedObligacionesMatriz.length) return;
    
    this.selectedObligacionesMatriz.forEach(selectedId => {
      const obligacionSelected = this.obligacionesMatriz.find((o: any) => o.id == selectedId);
      if (!obligacionSelected) return;
      
      const exists = this.empresa.obligation_matrices.find((o: any) => o.id == selectedId);
      if (!exists) {
        this.empresa.obligation_matrices.push(obligacionSelected);
      }
    });
    
    this.selectedObligacionesMatriz = [];
    this.showAsignObligationModal = false;
  }

  removeObligation(obligationId: number): void {
    this.empresa.obligation_matrices = this.empresa.obligation_matrices.filter((o: any) => o.id !== obligationId);
  }

  // === IESS ===
  openAsignIessModal(): void {
    this.selectedIess = [];
    this.showAsignIessModal = true;
  }

  asignIess(): void {
    if (!this.selectedIess.length) return;
    
    this.selectedIess.forEach(selectedId => {
      const iessSelected = this.iessList.find((i: any) => i.id == selectedId);
      if (!iessSelected) return;
      
      const exists = this.empresa.ieses.find((i: any) => i.id == selectedId);
      if (!exists) {
        this.empresa.ieses.push(iessSelected);
      }
    });
    
    this.selectedIess = [];
    this.showAsignIessModal = false;
  }

  removeIess(iessId: number): void {
    this.empresa.ieses = this.empresa.ieses.filter((i: any) => i.id !== iessId);
  }

  // === GESTIÓN DE USUARIOS ===
  editUser(user: any): void {
    console.log('Editando usuario:', user);
    
    // Rellenar el formulario con los datos del usuario
    this.newUser = {
      nombres: user.name.split(' ')[0] || '',
      apellidos: user.name.split(' ').slice(1).join(' ') || '',
      cedula: user.cedula || '', // Agregar campo cedula
      email: user.email,
      username: user.username || user.email,
      telefono: user.phone || '',
      password: '', // No mostrar password actual
      selectedRoles: user.roles ? user.roles.map((role: string) => {
        // Mapear nombres de roles a IDs
        const roleMapping: { [key: string]: number } = {
          'ADMIN': 1,
          'SUPER_ADMIN': 2,
          'USER': 3
        };
        return roleMapping[role] || 3;
      }) : []
    };
    
    // Guardar ID del usuario para la edición
    this.editingUserId = user.id;
    this.isEditingUser = true;
    this.showCreateUserModal = true;
  }

  deleteUser(user: any): void {
    if (confirm(`¿Está seguro de eliminar al usuario ${user.name}?`)) {
      console.log('Eliminando usuario:', user);
      
      this.userService.deleteUser(user.id).subscribe({
        next: (response) => {
          console.log('Usuario eliminado exitosamente');
          alert('Usuario eliminado exitosamente');
          this.loadUsers(); // Recargar la lista de usuarios
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          alert('Error al eliminar el usuario. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // Método para actualizar usuario existente
  updateUser(): void {
    if (!this.empresa?.id || !this.editingUserId) {
      alert('Error: No se encontró la información necesaria para actualizar');
      return;
    }

    const userData: CreateUserRequest = {
      id: this.editingUserId, // Incluir el ID para la actualización
      name: `${this.newUser.nombres} ${this.newUser.apellidos}`,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password || '', // Incluir password aunque sea vacío
      phone: this.newUser.telefono,
      business_id: this.empresa.id,
      role_ids: this.newUser.selectedRoles.length > 0 ? this.newUser.selectedRoles : undefined
    };

    console.log('Actualizando usuario:', userData);

    this.userService.updateUser(userData).subscribe({
      next: (response) => {
        console.log('Usuario actualizado exitosamente:', response);
        alert('Usuario actualizado exitosamente');
        this.closeUserModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        alert('Error al actualizar el usuario. Por favor, verifique los datos.');
      }
    });
  }

  // Método para cerrar el modal de usuario
  closeUserModal(): void {
    this.showCreateUserModal = false;
    this.isEditingUser = false;
    this.editingUserId = null;
    this.resetUserForm();
  }

  // Método para abrir modal de crear empleado
  openCreateEmployeeModal() {
    console.log('Abrir modal de crear empleado');
    // TODO: Esta funcionalidad se implementará en otra pantalla para gestión de empleados
    alert('La gestión de empleados se realizará en el módulo de Recursos Humanos');
  }
}
