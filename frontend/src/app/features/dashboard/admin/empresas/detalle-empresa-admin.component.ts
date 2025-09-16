import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
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
import { ContractorCompanyService } from '../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../services/contractor-block.service';
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
  
  // Empresas contratistas y bloques
  contractorCompanies: any[] = [];
  contractorBlocks: any[] = [];
  availableBlocks: any[] = [];
  
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
  showAsignContractorModal = false;

  // Variables para selección de elementos (permitir múltiples selecciones)
  selectedDepartamentos: string[] = [];
  selectedCargos: string[] = [];
  selectedTiposDocumentos: string[] = [];
  selectedTiposContratos: string[] = [];
  selectedObligacionesMatriz: string[] = [];
  // Para IESS usaremos objetos completos con ngModel ([ngValue])
  selectedIess: any[] = [];
  
  // Variables para empresas contratistas
  selectedContractorCompanies: any[] = [];
  selectedBlocks: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private departmentService: DepartmentService,
    private userService: UserService,
    private cargoService: CargoService,
    private tipoDocumentoService: TipoDocumentoService,
    private typeContractService: TypeContractService,
    private obligationMatrixService: ObligationMatrixService,
    private iessService: IessService,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService,
    private title: Title
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.empresaId = +params['id'];
        this.loadData();
      }
    });
  }
  /* Duplicated helper and early openCreateUserModal removed; single definitions exist further below */

  loadData(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Cargando datos para empresa ID:', this.empresaId);
    
    // Cargar empresa con detalles de administración (incluye todas las relaciones)
    this.businessService.getBusinessAdminDetails(this.empresaId).subscribe({
      next: (empresa: any) => {
        console.log('=== DEBUGGING EMPRESA DATA ===');
        console.log('Empresa completa:', empresa);
        console.log('=== DEBUGGING IESS ===');
        console.log('IESS data received from backend:', empresa.ieses);
        console.log('Tipo de datos IESS:', typeof empresa.ieses);
        console.log('Es array?:', Array.isArray(empresa.ieses));
        console.log('Longitud de IESS:', empresa.ieses?.length);
        
        // Verificar si existe la propiedad
        if (empresa.hasOwnProperty('ieses')) {
          console.log('✅ Propiedad ieses existe');
        } else {
          console.log('❌ Propiedad ieses NO existe');
          console.log('📋 Propiedades disponibles:', Object.keys(empresa));
        }
        
        // Verificar otras propiedades relacionadas con IESS
        console.log('🔍 Buscando propiedades relacionadas con IESS:');
        const allKeys = Object.keys(empresa);
        const iessRelated = allKeys.filter(key => key.toLowerCase().includes('ies'));
        console.log('📋 Propiedades relacionadas con IESS:', iessRelated);
        
        // Imprimir toda la estructura de la empresa para análisis
        console.log('🏢 Estructura completa de empresa:', JSON.stringify(empresa, null, 2));
        
        this.empresa = empresa;
        
        // Asegurar que todas las propiedades array existen (como frontend-admin)
        if (!this.empresa.departments) this.empresa.departments = [];
        if (!this.empresa.positions) this.empresa.positions = [];
        if (!this.empresa.type_documents) this.empresa.type_documents = [];
        if (!this.empresa.type_contracts) this.empresa.type_contracts = [];
        // Normalizar nombre de propiedad de IESS desde backend
        if (!this.empresa.ieses && (this.empresa as any).iessItems) {
          this.empresa.ieses = (this.empresa as any).iessItems;
        }
        if (!this.empresa.ieses && (this.empresa as any).iess) {
          this.empresa.ieses = (this.empresa as any).iess;
        }
        if (!this.empresa.ieses) {
          console.log('Inicializando array de IESS vacío');
          this.empresa.ieses = [];
        }
        if (!this.empresa.users) this.empresa.users = [];
        if (!this.empresa.employees) this.empresa.employees = [];
        if (!this.empresa.obligation_matrices) this.empresa.obligation_matrices = [];
        
        // Inicializar propiedades de empresas contratistas
        if (!this.empresa.contractor_companies) this.empresa.contractor_companies = [];
        if (!this.empresa.contractor_blocks) this.empresa.contractor_blocks = [];
        
        console.log('IESS después de inicialización:', this.empresa.ieses);
        console.log('Longitud final de IESS:', this.empresa.ieses.length);
        console.log('=== FIN DEBUGGING ===');

        // Título dinámico del documento
        try {
          const empresaNombre = this.empresa?.name || this.empresa?.nameShort || `Empresa #${this.empresaId}`;
          this.title.setTitle(`Administrando: ${empresaNombre}`);
        } catch (e) {
          console.warn('No se pudo actualizar el título del documento', e);
        }
        
        // Cargar usuarios por separado
        this.loadUsers();
        
        // Cargar datos globales para las listas desplegables de asignación
        this.loadConfigurationData();
        
        console.log('Datos específicos de la empresa cargados:', empresa);
        console.log('Departamentos de la empresa:', empresa.departments?.length || 0);
        console.log('Cargos de la empresa:', empresa.positions?.length || 0);
        console.log('Documentos de la empresa:', empresa.type_documents?.length || 0);
        
        this.loading = false;
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
    console.log('Iniciando carga de datos de configuración para listas desplegables...');
    
    // Cargar cada servicio individualmente para las listas desplegables
    // Estos datos NO sobrescriben los datos específicos de la empresa
    this.loadDepartamentos();
    this.loadCargos();
    this.loadTiposDocumentos();
    this.loadTiposContratos();
    this.loadObligacionesMatriz();
    this.loadIessList();
    this.loadRoles();
    this.loadContractorCompanies();
  }

  loadDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.departamentos = data || [];
        console.log('Departamentos globales cargados para listas desplegables:', this.departamentos.length);
      },
      error: (error) => {
        console.error('Error al cargar departamentos globales:', error);
        this.departamentos = [];
      }
    });
  }

  loadCargos(): void {
    this.cargoService.getCargos().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.cargos = data || [];
        console.log('Cargos globales cargados para listas desplegables:', this.cargos.length);
      },
      error: (error) => {
        console.error('Error al cargar cargos globales:', error);
        this.cargos = [];
      }
    });
  }

  loadTiposDocumentos(): void {
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.tiposDocumentos = data || [];
        console.log('Tipos de documentos globales cargados para listas desplegables:', this.tiposDocumentos.length);
      },
      error: (error) => {
        console.error('Error al cargar tipos de documentos globales:', error);
        this.tiposDocumentos = [];
      }
    });
  }

  loadTiposContratos(): void {
    this.typeContractService.getAllTypeContracts().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.tiposContratos = data || [];
        console.log('Tipos de contratos globales cargados para listas desplegables:', this.tiposContratos.length);
      },
      error: (error) => {
        console.error('Error al cargar tipos de contratos globales:', error);
        this.tiposContratos = [];
      }
    });
  }

  loadObligacionesMatriz(): void {
    this.obligationMatrixService.getObligationMatrices().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.obligacionesMatriz = data || [];
        console.log('Obligaciones matriz globales cargadas para listas desplegables:', this.obligacionesMatriz.length);
      },
      error: (error) => {
        console.error('Error al cargar obligaciones matriz globales:', error);
        this.obligacionesMatriz = [];
      }
    });
  }

  loadIessList(): void {
    console.log('🔄 Iniciando carga de IESS globales...');
    this.iessService.getIessItems().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.iessList = data || [];
        console.log('🛡️ IESS items globales cargados para listas desplegables:', this.iessList.length);
        console.log('🛡️ Datos IESS globales completos:', this.iessList);
        console.log('🛡️ Primer item IESS:', this.iessList[0]);
      },
      error: (error) => {
        console.error('❌ Error al cargar IESS items globales:', error);
        this.iessList = [];
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = data || [];
        console.log('Roles cargados:', this.roles.length);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.roles = [
          { id: 1, name: 'ROLE_ADMIN', description: 'Administrador' },
          { id: 2, name: 'ROLE_USER', description: 'Usuario' }
        ];
      }
    });
  }

  loadContractorCompanies(): void {
    this.contractorCompanyService.getAllActiveCompanies().subscribe({
      next: (data: any) => {
        this.contractorCompanies = data || [];
        console.log('Empresas contratistas globales cargadas para listas desplegables:', this.contractorCompanies.length);
      },
      error: (error: any) => {
        console.error('Error al cargar empresas contratistas globales:', error);
        this.contractorCompanies = [];
      }
    });
  }

  loadContractorBlocks(contractorCompanyId: number): void {
    if (!contractorCompanyId) {
      this.availableBlocks = [];
      return;
    }
    
    this.contractorBlockService.getActiveBlocksByCompanyId(contractorCompanyId).subscribe({
      next: (data: any) => {
        this.availableBlocks = data || [];
        console.log('Bloques cargados para empresa contratista:', this.availableBlocks.length);
      },
      error: (error: any) => {
        console.error('Error al cargar bloques:', error);
        this.availableBlocks = [];
      }
    });
  }
  // Helper: resolver ID de rol por nombre (fallback a 2 => ROLE_USER)
  private getRoleIdByName(name: string): number {
    const found = (this.roles || []).find(r => (r.name || '').toUpperCase() === (name || '').toUpperCase());
    return found && found.id != null ? Number(found.id) : 2;
  }

  // Logo de la empresa con fallback para evitar titileo por imagen faltante
  getLogoUrl(): string {
    const logo = this.empresa?.logo;
    if (logo) {
      return `${environment.apiUrl}/api/files/${logo}`;
    }
    return '/assets/img/company-placeholder.svg';
  }
  // === USUARIOS ===
  // === USUARIOS ===
  openCreateUserModal(): void {
    this.resetUserForm();
    this.isEditingUser = false;
    // Forzar rol "Usuario estándar" (ROLE_USER) para creación dentro de la empresa
    const roleUserId = this.getRoleIdByName('ROLE_USER')
      ?? this.getRoleIdByName('USER')
      ?? 2; // fallback común
    this.newUser.selectedRoles = [Number(roleUserId)];
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
    if (!this.selectedObligacionesMatriz.length || !this.empresa?.id) return;
    
    // Crear promesas para agregar cada matriz de obligación
    const addPromises = this.selectedObligacionesMatriz.map(obligationMatrixId => 
      this.businessService.addObligationMatrixToBusiness(this.empresa.id, Number(obligationMatrixId)).toPromise()
    );

    Promise.all(addPromises).then(() => {
      // Agregar a la vista local
      this.selectedObligacionesMatriz.forEach(selectedId => {
        const obligacionSelected = this.obligacionesMatriz.find((o: any) => o.id == selectedId);
        if (obligacionSelected) {
          const exists = this.empresa.obligation_matrices.find((o: any) => o.id == selectedId);
          if (!exists) {
            this.empresa.obligation_matrices.push(obligacionSelected);
          }
        }
      });
      
      this.selectedObligacionesMatriz = [];
      this.showAsignObligationModal = false;
      alert('Matrices de obligación asignadas exitosamente');
    }).catch(error => {
      console.error('Error al asignar matrices de obligación:', error);
      alert('Error al asignar matrices de obligación. Por favor, inténtelo de nuevo.');
    });
  }

  removeObligation(obligationId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar esta matriz de obligación de la empresa?')) {
      this.businessService.removeObligationMatrixFromBusiness(this.empresa.id, obligationId).subscribe({
        next: () => {
          this.empresa.obligation_matrices = this.empresa.obligation_matrices.filter((o: any) => o.id !== obligationId);
          alert('Matriz de obligación eliminada exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar matriz de obligación:', error);
          alert('Error al eliminar la matriz de obligación. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === IESS ===
  openAsignIessModal(): void {
    this.selectedIess = [];
    this.showAsignIessModal = true;
  }

  asignIess(): void {
    if (!this.selectedIess.length) {
      console.log('No hay IESS seleccionados');
      return;
    }
    
    console.log('✅ Asignando IESS (selección):', this.selectedIess);

    // La selección puede venir como objetos completos (preferido) o IDs. Soportamos ambos.
    const toAssign = this.selectedIess.map(sel => {
      if (sel && typeof sel === 'object') return sel; // ya es el objeto IESS
      const idNum = Number(sel);
      return this.iessList.find((i: any) => i.id === idNum);
    }).filter(Boolean);

    toAssign.forEach((iessSelected: any) => {
      const exists = this.empresa.ieses.find((i: any) => i.id === iessSelected.id);
      if (!exists) {
        console.log('✅ Agregando IESS a empresa:', iessSelected.description || iessSelected.name);
        this.empresa.ieses.push(iessSelected);
      }
    });
    
    console.log('✅ IESS finales en empresa:', this.empresa.ieses);
    
    this.selectedIess = [];
    this.showAsignIessModal = false;
    
    // Guardar cambios en backend
    this.saveIessChanges();
    
    console.log('✅ Modal cerrado, empresa actualizada');
  }

  trackByIessId(index: number, iess: any): number {
    return iess.id;
  }

  removeIess(iessId: number): void {
    this.empresa.ieses = this.empresa.ieses.filter((i: any) => i.id !== iessId);
    
    // Guardar los cambios en el backend
    this.saveIessChanges();
  }
  
  // Función para obtener IESS disponibles (no asignados a la empresa)
  getAvailableIess(): any[] {
    if (!this.iessList || !this.empresa.ieses) {
      return this.iessList || [];
    }
    
    return this.iessList.filter(iess =>
      !this.empresa.ieses.some((empresaIess: any) => Number(empresaIess.id) === Number(iess.id))
    );
  }

  // Función para verificar si es array (para usar en template)
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // Función para obtener nombre de visualización de IESS
  getIessDisplayName(iess: any): string {
    if (!iess) return 'IESS desconocido';
    
    // Simplemente mostrar la descripción
    return iess.description || iess.name || `IESS #${iess.id}`;
  }

  // Función para obtener matrices de obligaciones disponibles (no asignadas a la empresa)
  getAvailableObligacionesMatriz(): any[] {
    if (!this.obligacionesMatriz || !this.empresa.obligationMatrices) {
      return this.obligacionesMatriz || [];
    }
    
    return this.obligacionesMatriz.filter(obligacion => 
      !this.empresa.obligationMatrices.some((empresaObl: any) => empresaObl.id === obligacion.id)
    );
  }
  
  private saveIessChanges(): void {
    console.log('Guardando cambios de IESS...');
    console.log('IESS actuales en empresa:', this.empresa.ieses);
    
    const configurations = {
      iessItems: this.empresa.ieses
    };
    
    console.log('Configuraciones a enviar:', configurations);
    
    this.businessService.updateBusinessConfigurations(this.empresaId, configurations).subscribe({
      next: (updatedBusiness: any) => {
        console.log('IESS guardados correctamente. Respuesta:', updatedBusiness);
        // Actualizar los datos locales con la respuesta del servidor (normalizando nombres)
        const updatedIess = updatedBusiness?.ieses || updatedBusiness?.iessItems || updatedBusiness?.iess;
        if (updatedIess) {
          this.empresa.ieses = updatedIess;
          console.log('IESS actualizados desde servidor:', this.empresa.ieses);
        }
      },
      error: (error: any) => {
        console.error('Error al guardar IESS:', error);
        // Recargar los datos en caso de error para mantener consistencia
        this.loadData();
      }
    });
  }

  // === EMPRESAS CONTRATISTAS ===
  openAsignContractorModal(): void {
    this.selectedContractorCompanies = [];
    this.selectedBlocks = [];
    this.availableBlocks = [];
    this.showAsignContractorModal = true;
  }

  onContractorCompanyChange(): void {
    // Limpiar bloques seleccionados cuando cambian las empresas contratistas
    this.selectedBlocks = [];
    this.availableBlocks = [];
    
    // Cargar bloques de todas las empresas contratistas seleccionadas
    if (this.selectedContractorCompanies.length > 0) {
      this.selectedContractorCompanies.forEach(company => {
        this.loadContractorBlocks(company.id);
      });
    }
  }

  asignContractor(): void {
    if (!this.selectedContractorCompanies.length || !this.empresa?.id) return;
    
    console.log('Agregando empresas contratistas:', this.selectedContractorCompanies);
    console.log('Bloques seleccionados:', this.selectedBlocks);
    
    // Inicializar arrays si no existen
    if (!this.empresa.contractor_companies) {
      this.empresa.contractor_companies = [];
    }
    if (!this.empresa.contractor_blocks) {
      this.empresa.contractor_blocks = [];
    }
    
    // Agregar las nuevas empresas contratistas (evitar duplicados)
    this.selectedContractorCompanies.forEach(newCompany => {
      const exists = this.empresa.contractor_companies?.some((existingCompany: any) => 
        existingCompany.id === newCompany.id
      );
      if (!exists) {
        this.empresa.contractor_companies?.push(newCompany);
      }
    });
    
    // Agregar los nuevos bloques (evitar duplicados)
    this.selectedBlocks.forEach(newBlock => {
      const exists = this.empresa.contractor_blocks?.some((existingBlock: any) => 
        existingBlock.id === newBlock.id
      );
      if (!exists) {
        this.empresa.contractor_blocks?.push(newBlock);
      }
    });
    
    // Guardar en backend
    this.saveContractorChanges();
    
    // Cerrar modal y limpiar selecciones
    this.selectedContractorCompanies = [];
    this.selectedBlocks = [];
    this.availableBlocks = [];
    this.showAsignContractorModal = false;
    
    alert('Empresas contratistas agregadas exitosamente');
  }

  removeContractor(): void {
    if (confirm('¿Está seguro de eliminar todas las empresas contratistas asignadas y todos sus bloques?')) {
      this.empresa.contractor_companies = [];
      this.empresa.contractor_blocks = [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Empresas contratistas eliminadas exitosamente');
    }
  }

  removeSpecificContractor(companyId: number): void {
    const company = this.empresa.contractor_companies?.find((c: any) => c.id === companyId);
    if (company && confirm(`¿Está seguro de eliminar la empresa contratista "${company.name}"?`)) {
      // Remover la empresa contratista
      this.empresa.contractor_companies = this.empresa.contractor_companies?.filter((c: any) => c.id !== companyId) || [];
      
      // Remover todos los bloques de esa empresa contratista
      this.empresa.contractor_blocks = this.empresa.contractor_blocks?.filter((block: any) => 
        block.contractorCompanyId !== companyId && 
        block.contractor_company_id !== companyId
      ) || [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Empresa contratista eliminada exitosamente');
    }
  }

  removeContractorBlock(blockId: number): void {
    if (confirm('¿Está seguro de eliminar este bloque de la empresa?')) {
      this.empresa.contractor_blocks = this.empresa.contractor_blocks?.filter((block: any) => block.id !== blockId) || [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Bloque eliminado exitosamente');
    }
  }

  private saveContractorChanges(): void {
    console.log('Guardando cambios de empresas contratistas...');
    console.log('Empresas contratistas actuales:', this.empresa.contractor_companies);
    console.log('Bloques actuales:', this.empresa.contractor_blocks);
    
    const configurations = {
      contractorCompanies: this.empresa.contractor_companies,
      contractorBlocks: this.empresa.contractor_blocks
    };
    
    console.log('Configuraciones a enviar:', configurations);
    
    this.businessService.updateBusinessConfigurations(this.empresaId, configurations).subscribe({
      next: (updatedBusiness: any) => {
        console.log('Empresas contratistas guardadas correctamente. Respuesta:', updatedBusiness);
        // Actualizar los datos locales con la respuesta del servidor
        if (updatedBusiness?.contractor_companies) {
          this.empresa.contractor_companies = updatedBusiness.contractor_companies;
        }
        if (updatedBusiness?.contractor_blocks) {
          this.empresa.contractor_blocks = updatedBusiness.contractor_blocks;
        }
      },
      error: (error: any) => {
        console.error('Error al guardar empresas contratistas:', error);
        // Recargar los datos en caso de error para mantener consistencia
        this.loadData();
      }
    });
  }

  // Función para obtener el nombre de visualización de la empresa contratista
  getContractorCompanyDisplayName(company: any): string {
    if (!company) return 'Sin empresa contratista';
    return company.name || company.companyName || `Empresa #${company.id}`;
  }

  // Función para obtener todas las empresas contratistas como string
  getContractorCompaniesDisplayNames(): string {
    if (!this.empresa.contractor_companies || this.empresa.contractor_companies.length === 0) {
      return 'Sin empresas contratistas';
    }
    return this.empresa.contractor_companies
      .map((company: any) => this.getContractorCompanyDisplayName(company))
      .join(', ');
  }

  // Función para obtener el nombre de visualización del bloque
  getContractorBlockDisplayName(block: any): string {
    if (!block) return 'Bloque desconocido';
    return block.name || block.blockName || `Bloque #${block.id}`;
  }

  // Función para verificar si hay empresas contratistas configuradas
  hasContractorCompanies(): boolean {
    return this.empresa.contractor_companies && this.empresa.contractor_companies.length > 0;
  }

  // Función para obtener empresas contratistas disponibles (no asignadas)
  getAvailableContractorCompanies(): any[] {
    if (!this.contractorCompanies || !this.empresa.contractor_companies) {
      return this.contractorCompanies || [];
    }
    
    return this.contractorCompanies.filter(company =>
      !this.empresa.contractor_companies?.some((assignedCompany: any) => assignedCompany.id === company.id)
    );
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

  // Método para actualizar usuario
  updateUser(): void {
    if (!this.editingUserId) {
      console.error('No hay ID de usuario para actualizar');
      return;
    }

    const userData: CreateUserRequest = {
      id: this.editingUserId || undefined, // Convertir null a undefined
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
        let errorMessage = 'Error al actualizar el usuario. Por favor, verifique los datos.';
        
        if (error.status === 400) {
          errorMessage = 'Los datos del usuario no son válidos. Verifique email, username y teléfono.';
        } else if (error.status === 404) {
          errorMessage = 'El usuario no fue encontrado.';
        } else if (error.status === 409) {
          errorMessage = 'El email o username ya están en uso por otro usuario.';
        } else if (error.status === 403) {
          errorMessage = 'No tiene permisos para actualizar este usuario.';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor. Inténtelo más tarde.';
        }
        
        alert(errorMessage);
      }
    });
  }

  // Método para eliminar usuario
  deleteUser(user: any): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user.name}?`)) {
      console.log('Intentando eliminar usuario con ID:', user.id);
      
      // Debug: Verificar información del usuario actual
      const currentUser = localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken');
      console.log('Usuario actual en localStorage:', currentUser);
      console.log('Token disponible:', !!authToken);
      
      this.userService.deleteUser(user.id).subscribe({
        next: (response) => {
          console.log('Usuario eliminado exitosamente:', response);
          alert('Usuario eliminado exitosamente');
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          console.error('Detalles completos del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          
          let errorMessage = 'Error al eliminar el usuario.';
          
          if (error.status === 400) {
            // Error 400 puede ser problema de restricciones de base de datos
            if (error.error && error.error.message && error.error.message.includes('foreign key constraint')) {
              errorMessage = 'No se puede eliminar el usuario porque tiene sesiones activas o datos relacionados. El usuario será eliminado ahora que se han limpiado sus dependencias.';
            } else {
              errorMessage = 'No se puede eliminar el usuario. Verifique que el usuario no tenga dependencias activas.';
            }
          } else if (error.status === 404) {
            errorMessage = 'El usuario no fue encontrado.';
          } else if (error.status === 403) {
            errorMessage = 'No tiene permisos para eliminar este usuario.';
          } else if (error.status === 500) {
            errorMessage = 'Error del servidor. Inténtelo más tarde.';
          }
          
          alert(errorMessage);
        }
      });
    }
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
