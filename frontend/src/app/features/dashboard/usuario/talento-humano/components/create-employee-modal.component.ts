import { Component, EventEmitter, OnInit, Output, ViewChild, ElementRef, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfigurationService, Position, Degree, IessCode, Gender, CivilStatus, Ethnicity, Department, TypeContract, WorkSchedule, WorkShift } from '../services/configuration.service';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeRequest } from '../models/employee.model';
import { BusinessService } from '../../../../../services/business.service';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../../services/contractor-block.service';
import { ContractorCompany, ContractorBlock } from '../../../../../models/contractor-company.model';
import { NotificationService } from '../../../../../services/notification.service';

interface ConfigurationOption {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-create-employee-modal',
  templateUrl: './create-employee-modal.component.html',
  styleUrls: ['./create-employee-modal.component.scss']
})
export class CreateEmployeeModalComponent implements OnInit {
  employeeForm: FormGroup;
  loading = false;
  error: string | null = null;
  
  loadingConfigurations = false;
  
  genders: Gender[] = [];
  civilStatuses: CivilStatus[] = [];
  etnias: Ethnicity[] = [];
  positions: Position[] = [];
  departments: Department[] = [];
  typeContracts: TypeContract[] = [];
  workSchedules: WorkSchedule[] = [];
  workShifts: WorkShift[] = [];
  degrees: Degree[] = [];
  iessCode: string = '';
  iessCodes: IessCode[] = []; // Nueva propiedad para almacenar todos los códigos IESS
  businessRuc: string = ''; // Guardar el RUC de la empresa
  
  // Empresas contratistas y bloques
  contractorCompanies: ContractorCompany[] = [];
  availableContractorBlocks: ContractorBlock[] = [];
  
  selectedFile: File | null = null;
  photoPreviewUrl: string | null = null;
  // Índices para validación de duplicados
  private existingEmployees: any[] = [];
  private cedulaSet: Set<string> = new Set();
  private codeSet: Set<string> = new Set();
  private namePairSet: Set<string> = new Set();
  private wasCedulaDuplicate = false;
  private wasCodigoDuplicate = false;
  
  @Output() onClose = new EventEmitter<void>();
  @Output() onEmployeeCreated = new EventEmitter<void>();
  @Input() businessId!: number;
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private configurationService: ConfigurationService,
    private employeeService: EmployeeService,
    private businessService: BusinessService,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService,
    private notificationService: NotificationService
  ) {
    this.employeeForm = this.fb.group({
      // Campos básicos requeridos
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      birthdate: ['', [Validators.required]],
      address: ['', [Validators.required]],
      
      // Contacto de emergencia
      contact_kinship: ['', [Validators.required]],
      contact_name: ['', [Validators.required]],
      contact_phone: ['', [Validators.required]],
      
      // Campos adicionales de la imagen del usuario
      lugarNacimientoProvincia: [''],
      lugarNacimientoCiudad: [''],
      lugarNacimientoParroquia: [''],
      direccionDomiciliaria: [''],
      fechaIngreso: [''],
      tipoSangre: [''],
      discapacidad: [''],
      codigoIess: [''],
      salario: [''],
      codigoTrabajador: [''], // Código único del trabajador en la empresa
      
      // IDs de configuración  
      gender_id: [''],
      civil_status_id: [''],
      ethnicity_id: [''],
      position_id: [''],
      department_id: [''],
      type_contract_id: [''],
      work_schedule_id: [''],
      work_shift_id: [''],
      degree_id: [''],
      
      // Campos de empresa contratista
      contractor_company_id: [''],
      contractor_block_id: [''],
      
      status: [true]
    });
  }

  private rebuildDuplicateIndex(): void {
    this.cedulaSet.clear();
    this.codeSet.clear();
    this.namePairSet.clear();
    for (const e of this.existingEmployees) {
      const ced = (e?.cedula || '').trim();
      if (ced) this.cedulaSet.add(ced);
      const code = (e?.codigoTrabajador || e?.codigo_empresa || e?.codigoEmpresa || '').toString().trim();
      if (code) this.codeSet.add(code.toLowerCase());
      const ap = (e?.apellidos || '').toString().trim().toLowerCase();
      const no = (e?.nombres || '').toString().trim().toLowerCase();
      if (ap && no) this.namePairSet.add(`${ap}|${no}`);
    }
  }

  private applyDuplicateValidation(): void {
    // Cedula
    const cedCtrl = this.employeeForm.get('cedula');
    const cedVal = (cedCtrl?.value || '').toString().trim();
    const isCedDup = !!(cedVal && this.cedulaSet.has(cedVal));
    if (isCedDup) {
      cedCtrl?.setErrors({ ...(cedCtrl.errors || {}), duplicate: true });
      if (!this.wasCedulaDuplicate) {
        this.notificationService.warning('La cédula ya existe en esta empresa. Ingrese una diferente.');
        this.wasCedulaDuplicate = true;
      }
    } else {
      if (cedCtrl?.hasError('duplicate')) {
        const { duplicate, ...rest } = cedCtrl.errors || {};
        cedCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      this.wasCedulaDuplicate = false;
    }

    // Código Trabajador
    const codeCtrl = this.employeeForm.get('codigoTrabajador');
    const codeVal = (codeCtrl?.value || '').toString().trim().toLowerCase();
    const isCodeDup = !!(codeVal && this.codeSet.has(codeVal));
    if (isCodeDup) {
      codeCtrl?.setErrors({ ...(codeCtrl.errors || {}), duplicate: true });
      if (!this.wasCodigoDuplicate) {
        this.notificationService.warning('El código del trabajador ya existe. Use un código diferente.');
        this.wasCodigoDuplicate = true;
      }
    } else {
      if (codeCtrl?.hasError('duplicate')) {
        const { duplicate, ...rest } = codeCtrl.errors || {};
        codeCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      this.wasCodigoDuplicate = false;
    }

    // Nombres + Apellidos
    const nCtrl = this.employeeForm.get('nombres');
    const aCtrl = this.employeeForm.get('apellidos');
    const nVal = (nCtrl?.value || '').toString().trim().toLowerCase();
    const aVal = (aCtrl?.value || '').toString().trim().toLowerCase();
    const pair = nVal && aVal ? `${aVal}|${nVal}` : '';
    const dupName = pair && this.namePairSet.has(pair);
    if (dupName) {
      nCtrl?.setErrors({ ...(nCtrl.errors || {}), duplicate: true });
      aCtrl?.setErrors({ ...(aCtrl.errors || {}), duplicate: true });
    } else {
      if (nCtrl?.hasError('duplicate')) {
        const { duplicate, ...rest } = nCtrl.errors || {};
        nCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      if (aCtrl?.hasError('duplicate')) {
        const { duplicate, ...rest } = aCtrl.errors || {};
        aCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
  }

  ngOnInit(): void {
    if (this.businessId == null) {
      this.error = 'No se pudo resolver la empresa actual.';
      return;
    }
    this.loadBusinessInfo();
    this.loadAllConfigurations();
    // Cargar empresas contratistas para el selector
    this.loadContractorCompanies();

    // Cargar empleados existentes para validación de duplicados
    this.employeeService.getEmployeesByBusiness(this.businessId).subscribe({
      next: (emps) => {
        this.existingEmployees = emps || [];
        this.rebuildDuplicateIndex();
      },
      error: () => {}
    });

    // Validación reactiva de duplicados
    this.employeeForm.get('cedula')?.valueChanges.subscribe(() => this.applyDuplicateValidation());
    this.employeeForm.get('codigoTrabajador')?.valueChanges.subscribe(() => this.applyDuplicateValidation());
    this.employeeForm.get('nombres')?.valueChanges.subscribe(() => this.applyDuplicateValidation());
    this.employeeForm.get('apellidos')?.valueChanges.subscribe(() => this.applyDuplicateValidation());
  }

  private async loadBusinessInfo(): Promise<void> {
    try {
      // Usar endpoint de detalles que expone contratistas/bloques para USER/ADMIN
      const business = await this.businessService.getDetails(this.businessId).toPromise();
      if (business) {
        this.businessRuc = business.ruc;
        console.log('🏢 RUC de la empresa obtenido:', this.businessRuc);
      }
    } catch (error) {
      console.error('Error al obtener información de la empresa:', error);
      this.error = 'Error al cargar información de la empresa';
    }
  }

  private async loadAllConfigurations(): Promise<void> {
    this.loadingConfigurations = true;
    
    try {
      // Cargar todas las configuraciones en paralelo
      const [
        gendersResponse,
        civilStatusResponse,
        etniasResponse,
        positionsResponse,
        departmentsResponse,
        typeContractsResponse,
        degreesResponse,
        iessCodesResponse,
        workSchedulesResponse,
        workShiftsResponse
      ] = await Promise.all([
        this.configurationService.getGenders().toPromise(),
        this.configurationService.getCivilStatuses().toPromise(),
        this.configurationService.getEtnias().toPromise(),
        this.configurationService.getPositionsByCompany(this.businessId).toPromise(),
        this.configurationService.getDepartmentsByCompany(this.businessId).toPromise(),
        this.configurationService.getTypeContractsByCompany(this.businessId).toPromise(),
        this.configurationService.getDegrees().toPromise(),
        this.configurationService.getIessCodesByBusiness(this.businessId).toPromise(),
        this.configurationService.getWorkSchedulesByCompany(this.businessId).toPromise(),
        this.configurationService.getWorkShiftsByCompany(this.businessId).toPromise()
      ]);

      this.genders = gendersResponse || [];
      this.civilStatuses = civilStatusResponse || [];
      this.etnias = etniasResponse || [];
      this.positions = positionsResponse || [];
      this.departments = departmentsResponse || [];
      this.typeContracts = typeContractsResponse || [];
      this.degrees = degreesResponse || [];
      this.workSchedules = workSchedulesResponse || [];
      this.workShifts = workShiftsResponse || [];
      
      // Cargar empresas contratistas configuradas para esta empresa
      await this.loadContractorCompanies();
      
      // Asignar y mostrar códigos IESS
      this.iessCodes = iessCodesResponse || [];
      console.log('Códigos IESS disponibles para la empresa:', this.iessCodes.length);
      
      console.log('Cargas iniciales:', {
        genders: this.genders.length,
        civilStatuses: this.civilStatuses.length,
        etnias: this.etnias.length,
        positions: this.positions.length,
        departments: this.departments.length,
        typeContracts: this.typeContracts.length,
        degrees: this.degrees.length,
        contractorCompanies: this.contractorCompanies.length
      });

      console.log('Departamentos disponibles para la empresa:', this.departments);
      console.log('Tipos de contrato disponibles para la empresa:', this.typeContracts);
      console.log('Empresas contratistas disponibles:', this.contractorCompanies);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      this.error = 'Error al cargar las configuraciones necesarias';
    } finally {
      this.loadingConfigurations = false;
    }
  }
  

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        this.error = 'Solo se permiten archivos de imagen (JPG, PNG)';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        this.error = 'El archivo no debe exceder 5MB';
        return;
      }
      
      this.selectedFile = file;
      this.error = null;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.photoPreviewUrl = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // === MÉTODOS PARA EMPRESAS CONTRATISTAS ===
  
  private async loadContractorCompanies(): Promise<void> {
    try {
      console.log('🔍 Iniciando carga de empresas contratistas para businessId:', this.businessId);
      
      // Obtener la información de la empresa para ver qué empresas contratistas tiene configuradas
      const business: any = await this.businessService.getDetails(this.businessId).toPromise();
      
      console.log('🏢 Información completa de la empresa obtenida:', business);
      console.log('🏢 contractor_companies (múltiples):', business?.contractor_companies);
      console.log('🏢 contractorCompanies (alternativo):', business?.contractorCompanies);
      
      // Buscar empresas contratistas configuradas (nuevo sistema con múltiples empresas)
      let contractorCompanies = [];
      
      if (business?.contractor_companies && Array.isArray(business.contractor_companies)) {
        contractorCompanies = business.contractor_companies;
        console.log('✅ Encontradas empresas contratistas en contractor_companies:', contractorCompanies.length);
      } else if (business?.contractorCompanies && Array.isArray(business.contractorCompanies)) {
        contractorCompanies = business.contractorCompanies;
        console.log('✅ Encontradas empresas contratistas en contractorCompanies:', contractorCompanies.length);
      } else {
        // Fallback: sistema anterior con una sola empresa contratista
        console.log('⚠️ No se encontraron empresas contratistas múltiples, intentando sistema anterior');
        
        let singleContractorCompany = null;
        if (business?.contractor_company) {
          singleContractorCompany = business.contractor_company;
        } else if (business?.contractorCompany) {
          singleContractorCompany = business.contractorCompany;
        } else if (business?.contractor_company_id) {
          try {
            singleContractorCompany = await this.contractorCompanyService.getCompanyById(business.contractor_company_id).toPromise();
            console.log('✅ Empresa contratista cargada por ID:', singleContractorCompany);
          } catch (error) {
            console.error('❌ Error al cargar empresa contratista por ID:', error);
          }
        }
        
        if (singleContractorCompany) {
          contractorCompanies = [singleContractorCompany];
          console.log('✅ Usando empresa contratista única como fallback');
        }
      }
      
      if (contractorCompanies.length > 0) {
        this.contractorCompanies = contractorCompanies;
        console.log('✅ Empresas contratistas configuradas para empleados:');
        contractorCompanies.forEach((company: any, index: number) => {
          console.log(`  ${index + 1}. ${company.name} (${company.code})`);
        });
        console.log('✅ Total empresas contratistas disponibles:', this.contractorCompanies.length);
      } else {
        console.log('⚠️ No se encontraron empresas contratistas configuradas para esta empresa');
        this.contractorCompanies = [];
      }
      
    } catch (error) {
      console.error('❌ Error al cargar empresas contratistas:', error);
      this.contractorCompanies = [];
    }
  }

  onContractorCompanyChange(): void {
    const contractorCompanyId = this.employeeForm.get('contractor_company_id')?.value;
    
    // Limpiar bloque seleccionado cuando cambia la empresa contratista
    this.employeeForm.patchValue({ contractor_block_id: '' });
    this.availableContractorBlocks = [];
    
    if (contractorCompanyId) {
      this.loadContractorBlocksForBusiness(contractorCompanyId);
    }
  }

  private loadContractorBlocksForBusiness(contractorCompanyId: number): void {
    if (!contractorCompanyId) {
      this.availableContractorBlocks = [];
      return;
    }
    
    console.log('🔍 Cargando bloques configurados para la empresa y contratista:', contractorCompanyId);
    
    // Cargar bloques específicos configurados para esta empresa y esta empresa contratista
    this.businessService.getDetails(this.businessId).subscribe({
      next: (business: any) => {
        console.log('🏢 Datos completos de empresa obtenidos:', business);
        console.log('📋 contractor_blocks:', business?.contractor_blocks);
        console.log('📋 contractorBlocks:', business?.contractorBlocks);
        
        // Obtener bloques configurados para esta empresa específica
        let configuredBlocks = business?.contractor_blocks || business?.contractorBlocks || [];
        
        console.log('📋 Bloques configurados para la empresa (total):', configuredBlocks.length);
        configuredBlocks.forEach((block: any, index: number) => {
          console.log(`  ${index + 1}. ${block.name} (ID: ${block.id}) - Empresa contratista: ${block.contractorCompanyId || block.contractor_company_id || block.contractorCompany?.id || block.contractor_company?.id || 'No definida'}`);
        });
        
        if (configuredBlocks.length === 0) {
          console.log('⚠️ No hay bloques configurados para esta empresa');
          this.availableContractorBlocks = [];
          return;
        }
        
        // Filtrar bloques que pertenecen a la empresa contratista seleccionada
        const blocksForSelectedCompany = configuredBlocks.filter((block: any) => {
          // Intentar múltiples formas de obtener el contractor company id, priorizando el nuevo DTO (contractorCompanyId)
          let blockContractorId: number | null = null;

          if (block.contractorCompanyId !== undefined && block.contractorCompanyId !== null) {
            blockContractorId = Number(block.contractorCompanyId);
          } else if (block.contractor_company_id) {
            blockContractorId = Number(block.contractor_company_id);
          } else if (block.contractorCompany?.id) {
            blockContractorId = Number(block.contractorCompany.id);
          } else if (block.contractor_company?.id) {
            blockContractorId = Number(block.contractor_company.id);
          }

          const belongsToCompany = blockContractorId === Number(contractorCompanyId);

          console.log(`🔄 Analizando bloque "${block.name}" (ID: ${block.id})`);
          console.log(`   - contractorCompanyId del bloque: ${blockContractorId}`);
          console.log(`   - contractor_company_id seleccionado: ${contractorCompanyId}`);
          console.log(`   - ¿Coincide?: ${belongsToCompany}`);

          return belongsToCompany;
        });
        
        this.availableContractorBlocks = blocksForSelectedCompany;
        console.log(`✅ Bloques disponibles para empresa contratista ${contractorCompanyId}: ${this.availableContractorBlocks.length}`);
        
        if (this.availableContractorBlocks.length > 0) {
          console.log('📋 Lista de bloques filtrados:');
          this.availableContractorBlocks.forEach((block: any, index: number) => {
            console.log(`  ${index + 1}. ${block.name} (${block.code || 'Sin código'})`);
          });
        } else {
          console.log('⚠️ No hay bloques configurados para esta empresa contratista específica');
          console.log(`💡 Sugerencia: Verificar que en la configuración de la empresa haya bloques asignados para la empresa contratista ID ${contractorCompanyId}`);
        }
      },
      error: (error: any) => {
        console.error('❌ Error al cargar información de la empresa para filtrar bloques:', error);
        this.availableContractorBlocks = [];
      }
    });
  }

  onSubmit() {
    // Aplicar validación de duplicados antes de enviar
    this.applyDuplicateValidation();
    if (this.employeeForm.invalid) {
      // Mensaje compilado de duplicados si existieran
      const msgs: string[] = [];
      if (this.employeeForm.get('cedula')?.hasError('duplicate')) msgs.push('Cédula ya registrada en esta empresa');
      if (this.employeeForm.get('codigoTrabajador')?.hasError('duplicate')) msgs.push('Código de trabajador duplicado en esta empresa');
      if (this.employeeForm.get('nombres')?.hasError('duplicate') || this.employeeForm.get('apellidos')?.hasError('duplicate')) msgs.push('Nombre y apellidos ya existen en esta empresa');
      if (msgs.length) {
        this.error = msgs.join('. ');
        this.notificationService.warning(this.error);
      }
    }
    if (this.employeeForm.valid) {
      console.log('Formulario válido, enviando datos...');
      const formValue = this.employeeForm.value;
      
      console.log('🏢 Usando businessId:', this.businessId);
      console.log('🎓 Grados disponibles:', this.degrees);
      console.log('🎓 Degree ID seleccionado:', formValue.degree_id);
      console.log('🎓 Nivel educación calculado:', formValue.degree_id ? (this.degrees.find(d => d.id === formValue.degree_id)?.name || null) : null);
      
      // Crear objeto con nombres de campos correctos según la interfaz CreateEmployeeRequest
      const employeeData: any = {
        cedula: formValue.cedula,
        apellidos: formValue.apellidos,
        nombres: formValue.nombres,
        codigoTrabajador: formValue.codigoTrabajador || null,
        phone: formValue.phone,
        email: formValue.email,
        dateBirth: formValue.birthdate ? `${formValue.birthdate} 00:00:00` : null, // Formato LocalDateTime
        address: formValue.address,
        direccionDomiciliaria: formValue.direccionDomiciliaria,
        residentAddress: formValue.direccionDomiciliaria, // Usar la misma dirección por ahora
        lugarNacimientoProvincia: formValue.lugarNacimientoProvincia,
        lugarNacimientoCiudad: formValue.lugarNacimientoCiudad,
        lugarNacimientoParroquia: formValue.lugarNacimientoParroquia,
        contactKinship: formValue.contact_kinship,
        contactName: formValue.contact_name,
        contactPhone: formValue.contact_phone,
        fechaIngreso: formValue.fechaIngreso,
        businessId: this.businessId, // Usar businessId directo
        codigoEmpresa: this.businessRuc || null, // RUC de la empresa (backend usará businessId si está)
        // IDs en camelCase como espera el backend (CreateBusinessEmployeeDto)
        positionId: formValue.position_id || null,
        departmentId: formValue.department_id || null,
        typeContractId: formValue.type_contract_id || null,
        tipoSangre: formValue.tipoSangre,
        salario: formValue.salario ? parseFloat(formValue.salario) : null,
        genderId: formValue.gender_id || null,
        civilStatusId: formValue.civil_status_id || null,
        etniaId: formValue.ethnicity_id || null,
        degreeId: formValue.degree_id || null,
        nivelEducacion: formValue.degree_id ? (this.degrees.find(d => d.id === formValue.degree_id)?.name || null) : null,
        discapacidad: formValue.discapacidad,
        codigoIess: formValue.codigoIess,
        iess: formValue.codigoIess, // Usar el mismo valor para ambos campos
        
        // Campos de empresa contratista
        contractorCompanyId: formValue.contractor_company_id || null,
        contractorBlockId: formValue.contractor_block_id || null,
        
        active: true,
        status: 'ACTIVO'
      };

      // Agregar la imagen si está seleccionada
      if (this.selectedFile) {
        employeeData.profile_picture = this.selectedFile;
        console.log('📷 Imagen incluida en los datos del empleado:', this.selectedFile.name);
      }

      console.log('🔍 DATOS DEL EMPLEADO PARA ENVIAR:', employeeData);
      console.log('🔍 JSON (sin imagen):', JSON.stringify({...employeeData, profile_picture: employeeData.profile_picture ? '[File Object]' : null}, null, 2));
      
      // Intentar crear empleado
      this.loading = true;
      this.error = null;

      this.employeeService.createEmployee(employeeData).subscribe({
        next: (response) => {
          console.log('Empleado creado exitosamente:', response);
          this.loading = false;
          // Actualizar índice local para futuras validaciones
          this.existingEmployees.push(response as any);
          this.rebuildDuplicateIndex();
          this.closeModal();
          this.onEmployeeCreated.emit();
        },
        error: (error) => {
          console.error('Error completo al crear empleado:', error);
          console.error('Status del error:', error.status);
          console.error('Mensaje del error:', error.error);
          console.error('Body del error:', error.error);
          console.error('Headers del error:', error.headers);
          this.loading = false;
          
          // Intentar extraer el mensaje de error más específico
          let errorMessage = 'Error al crear el empleado. Por favor, intente nuevamente.';
          
          if (error.error) {
            console.log('Error object exists:', error.error);
            
            // Si el error tiene un message directo
            if (error.error.message) {
              errorMessage = error.error.message;
              console.log('Using error.error.message:', errorMessage);
            }
            // Si el error es solo una cadena
            else if (typeof error.error === 'string') {
              errorMessage = error.error;
              console.log('Using error.error string:', errorMessage);
            }
            // Si el error tiene una propiedad error
            else if (error.error.error) {
              errorMessage = error.error.error;
              console.log('Using error.error.error:', errorMessage);
            }
          }
          
          // Si el error es 400, probablemente sea un error de validación específico
          if (error.status === 400) {
            errorMessage = 'Error de validación: ' + errorMessage;
          }
          // Conflictos/duplicados desde el backend
          if (error.status === 409 || error.status === 422) {
            // Mensaje estándar para cédula/código duplicado
            const std = 'Cédula o código de trabajador ya existentes. Ingrese valores diferentes.';
            errorMessage = errorMessage && errorMessage !== '[object Object]' ? errorMessage : std;
            this.notificationService.warning(errorMessage);
          }
          
          console.log('Final error message:', errorMessage);
          this.error = errorMessage;
        }
      });
    } else {
      console.log('Formulario inválido');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      control?.markAsTouched();
    });
  }

  closeModal(): void {
    this.employeeForm.reset();
    this.selectedFile = null;
    this.photoPreviewUrl = null;
    this.error = null;
    this.loading = false;
    this.onClose.emit();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['duplicate']) {
        if (fieldName === 'cedula') return 'Cédula ya registrada en esta empresa';
        if (fieldName === 'codigoTrabajador') return 'Código de trabajador duplicado en esta empresa';
        if (fieldName === 'nombres' || fieldName === 'apellidos') return 'Nombre y apellidos ya existen en esta empresa';
      }
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email no válido';
      if (field.errors['pattern']) return `${fieldName} no tiene el formato correcto`;
      if (field.errors['minlength']) return `${fieldName} es muy corto`;
    }
    return '';
  }
}
