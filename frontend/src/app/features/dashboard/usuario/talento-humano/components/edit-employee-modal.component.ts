import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeeService } from '../services/employee.service';
import { Employee, UpdateEmployeeRequest } from '../models/employee.model';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../../services/contractor-block.service';
import { BusinessService } from '../../../../../services/business.service';
import { ContractorCompany, ContractorBlock } from '../../../../../models/contractor-company.model';
import { ConfigurationService, Position, Degree, Gender, CivilStatus, Ethnicity, Department, TypeContract, IessCode } from '../services/configuration.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-edit-employee-modal',
  templateUrl: './edit-employee-modal.component.html',
  styleUrls: ['./edit-employee-modal.component.scss']
})
export class EditEmployeeModalComponent implements OnInit, OnChanges {
  @Input() employee: Employee | null = null;
  @Input() businessId: number = 1; // Agregar el input businessId
  @Output() onClose = new EventEmitter<void>();
  @Output() onEmployeeUpdated = new EventEmitter<void>();
  @Output() onPhotoUpdated = new EventEmitter<void>();

  employeeForm: FormGroup;
  loading = false;
  error: string | null = null;

  // Variables para empresas contratistas
  contractorCompanies: ContractorCompany[] = [];
  availableContractorBlocks: ContractorBlock[] = [];

  // Catálogos de configuración
  genders: Gender[] = [];
  civilStatuses: CivilStatus[] = [];
  etnias: Ethnicity[] = [];
  positions: Position[] = [];
  departments: Department[] = [];
  typeContracts: TypeContract[] = [];
  degrees: Degree[] = [];
  iessCodes: IessCode[] = [];

  // Tabs
  activeTab: 'datos' | 'documentos' | 'contratos' = 'datos';

  // Foto de perfil (cambio en edición)
  selectedProfilePicture: File | null = null;
  selectedProfilePicturePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private configurationService: ConfigurationService,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService,
    private businessService: BusinessService
  ) {
    this.employeeForm = this.createForm();
  }

  // Cambiar pestaña en el modal
  setTab(tab: 'datos' | 'documentos' | 'contratos') {
    this.activeTab = tab;
  }

  ngOnInit(): void {
    this.populateForm();
    this.loadConfigurations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && this.employee) {
      this.populateForm();
    }
    if (changes['businessId'] && this.businessId) {
      this.loadConfigurations();
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      cedula: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^\d{10}$/)]],
      nombres: [''],
      apellidos: [''],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,12}$/)]],
      email: ['', [Validators.required, Validators.email]],
      birthdate: ['', [Validators.required]],
      address: ['', [Validators.required]],
      direccionDomiciliaria: [''],
      lugarNacimientoProvincia: [''],
      lugarNacimientoCiudad: [''],
      lugarNacimientoParroquia: [''],
      fechaIngreso: [''],
      tipoSangre: [''],
      discapacidad: [''],
      codigoIess: [''],
      contact_kinship: ['', [Validators.required]],
      contact_name: ['', [Validators.required]],
      contact_phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,12}$/)]],
      status: [true],
      codigo_trabajador: [{ value: '', disabled: true }],
      salario: [{ value: '', disabled: true }],
      position_id: [''],
      department_id: [''],
      type_contract_id: [''],
      gender_id: [''],
      ethnicity_id: [''],
      civil_status_id: [''],
      resident_address_id: [''],
      iess_id: [''],
      degree_id: [''],
      contractor_company_id: [''],
      contractor_block_id: ['']
    });
  }

  private getId(source: any, ...keys: string[]): any {
    // Try direct scalar ids by keys, then nested object { id }
    for (const k of keys) {
      if (source && source[k] !== undefined && source[k] !== null && source[k] !== '') {
        const v = source[k];
        const n = Number(v);
        return isNaN(n) ? v?.id ?? '' : n;
      }
    }
    // Try nested objects: position, department, etc.
    const nestedKeys = keys
      .map(k => k.replace(/_?id$/i, ''))
      .map(k => k.replace(/Id$/i, ''));
    for (const nk of nestedKeys) {
      const obj = source?.[nk];
      if (obj && obj.id !== undefined && obj.id !== null) {
        const n = Number(obj.id);
        return isNaN(n) ? '' : n;
      }
    }
    return '';
  }

  private resolveIdByName(catalog: any[], name: string | null | undefined): string {
    if (!catalog || !catalog.length || !name) return '';
    const n = String(name).trim().toLowerCase();
    const found = catalog.find((x: any) => (x?.name || x?.nombre || '').toString().trim().toLowerCase() === n);
    return found ? String(found.id) : '';
  }

  private reapplyCatalogSelections(): void {
    const emp: any = this.employee || {};
    const toStrId = (v: any) => (v === '' || v === null || v === undefined) ? '' : String(v);
    let positionId = this.getId(emp, 'position_id', 'positionId', 'position');
    let departmentId = this.getId(emp, 'department_id', 'departmentId', 'department');
    let typeContractId = this.getId(emp, 'type_contract_id', 'typeContractId', 'type_contract', 'typeContract');
    let degreeId = this.getId(emp, 'degree_id', 'degreeId', 'degree');
    let genderId = this.getId(emp, 'gender_id', 'genderId', 'gender');
    let civilStatusId = this.getId(emp, 'civil_status_id', 'civilStatusId', 'civil_status', 'civilStatus');
    let ethnicityId = this.getId(emp, 'ethnicity_id', 'ethnia_id', 'ethnicityId', 'ethnicity', 'ethnia');
    let contractorCompanyId = this.getId(emp, 'contractor_company_id', 'contractorCompanyId', 'contractorCompany');
    let contractorBlockId = this.getId(emp, 'contractor_block_id', 'contractorBlockId', 'contractorBlock');

    // Fallback por nombre si no hay id
    if (positionId === '') positionId = this.resolveIdByName(this.positions, emp.position_name || emp.positionName || emp.position?.name);
    if (departmentId === '') departmentId = this.resolveIdByName(this.departments, emp.department_name || emp.departmentName || emp.department?.name);
    if (typeContractId === '') typeContractId = this.resolveIdByName(this.typeContracts, emp.type_contract_name || emp.typeContractName || emp.type_contract?.name || emp.typeContract?.name);
    if (degreeId === '') degreeId = this.resolveIdByName(this.degrees, emp.degree_name || emp.degreeName || emp.degree?.name);
    if (genderId === '') genderId = this.resolveIdByName(this.genders, emp.gender_name || emp.genderName || emp.gender?.name);
    if (civilStatusId === '') civilStatusId = this.resolveIdByName(this.civilStatuses, emp.civil_status_name || emp.civilStatusName || emp.civil_status?.name || emp.civilStatus?.name);
    if (ethnicityId === '') ethnicityId = this.resolveIdByName(this.etnias, emp.ethnicity_name || emp.ethnia_name || emp.ethnicityName || emp.ethnia?.name || emp.ethnicity?.name);
    if (contractorCompanyId === '') contractorCompanyId = this.resolveIdByName(this.contractorCompanies as any[], emp.contractor_company_name || emp.contractorCompanyName || emp.contractor_company?.name || emp.contractorCompany?.name);

    this.employeeForm.patchValue({
      position_id: toStrId(positionId),
      department_id: toStrId(departmentId),
      type_contract_id: toStrId(typeContractId),
      degree_id: toStrId(degreeId),
      gender_id: toStrId(genderId),
      civil_status_id: toStrId(civilStatusId),
      ethnicity_id: toStrId(ethnicityId),
      contractor_company_id: toStrId(contractorCompanyId)
    });

    // Si tenemos empresa contratista y bloque del empleado, cargar bloques y preseleccionar
    if (contractorCompanyId) {
      const ccIdNum = Number(contractorCompanyId);
      if (!isNaN(ccIdNum)) {
        this.loadContractorBlocksForBusiness(ccIdNum, () => {
          // Intentar preseleccionar el bloque
          const blockIdStr = toStrId(contractorBlockId);
          if (blockIdStr) {
            this.employeeForm.patchValue({ contractor_block_id: blockIdStr });
          }
        });
      }
    }
  }

  populateForm(): void {
    if (this.employee) {
      // Formatear la fecha para el input date (aceptar birthdate o dateBirth)
      const rawBirth = (this as any).employee.birthdate || (this as any).employee.dateBirth || '';
      let birthdate = '';
      if (rawBirth) {
        try {
          // rawBirth puede venir como 'yyyy-MM-ddTHH:mm:ss' o 'yyyy-MM-dd HH:mm:ss' o solo 'yyyy-MM-dd'
          const onlyDate = String(rawBirth).split('T')[0].split(' ')[0];
          birthdate = onlyDate;
        } catch (e) {
          birthdate = '';
        }
      }

      const codigoTrab = (this as any).employee.codigoTrabajador || (this as any).employee.codigo_trabajador || (this as any).employee.codigoEmpresa || '';
      const salario = (this as any).employee.salario || '';

      const nombres = (this as any).employee.nombres || '';
      const apellidos = (this as any).employee.apellidos || '';
      const fullName = this.employee.name && this.employee.name.trim().length > 0
        ? this.employee.name
        : `${nombres} ${apellidos}`.trim();

      // Flexible mapping for contact and address fields
      const contactNameVal = (this as any).employee.contact_name || (this as any).employee.contactName || '';
      const contactKinshipVal = (this as any).employee.contact_kinship || (this as any).employee.contactKinship || '';
      const contactPhoneVal = (this as any).employee.contact_phone || (this as any).employee.contactPhone || '';
      const addressVal = (this as any).employee.address || (this as any).employee.residentAddress || '';

      const toStrId = (v: any) => (v === '' || v === null || v === undefined) ? '' : String(v);
      this.employeeForm.patchValue({
        cedula: this.employee.cedula,
        nombres: nombres,
        apellidos: apellidos,
        name: fullName,
        phone: this.employee.phone,
        email: this.employee.email,
        birthdate: birthdate,
        address: addressVal,
        direccionDomiciliaria: (this as any).employee.direccionDomiciliaria || (this as any).employee.residentAddress || '',
        lugarNacimientoProvincia: (this as any).employee.lugarNacimientoProvincia || '',
        lugarNacimientoCiudad: (this as any).employee.lugarNacimientoCiudad || '',
        lugarNacimientoParroquia: (this as any).employee.lugarNacimientoParroquia || '',
        fechaIngreso: (this as any).employee.fechaIngreso || '',
        tipoSangre: (this as any).employee.tipoSangre || '',
        discapacidad: (this as any).employee.discapacidad || '',
        codigoIess: (this as any).employee.codigoIess || '',
        contact_kinship: contactKinshipVal,
        contact_name: contactNameVal,
        contact_phone: contactPhoneVal,
        status: this.employee.status,
        codigo_trabajador: codigoTrab,
        salario: salario,
        position_id: toStrId(this.getId((this as any).employee, 'position_id', 'positionId', 'position')),
        department_id: toStrId(this.getId((this as any).employee, 'department_id', 'departmentId', 'department')),
        type_contract_id: toStrId(this.getId((this as any).employee, 'type_contract_id', 'typeContractId', 'type_contract', 'typeContract')),
        gender_id: toStrId(this.getId((this as any).employee, 'gender_id', 'genderId', 'gender')),
        ethnicity_id: toStrId(this.getId((this as any).employee, 'ethnicity_id', 'ethnia_id', 'ethnicityId', 'ethnicity', 'ethnia')),
        civil_status_id: toStrId(this.getId((this as any).employee, 'civil_status_id', 'civilStatusId', 'civil_status', 'civilStatus')),
        resident_address_id: toStrId(this.getId((this as any).employee, 'resident_address_id', 'residentAddressId', 'resident_address', 'residentAddress')),
        iess_id: toStrId(this.getId((this as any).employee, 'iess_id', 'iessId', 'iess')),
        degree_id: toStrId(this.getId((this as any).employee, 'degree_id', 'degreeId', 'degree')),
        contractor_company_id: toStrId(this.getId((this as any).employee, 'contractor_company_id', 'contractorCompanyId', 'contractorCompany')),
        contractor_block_id: toStrId(this.getId((this as any).employee, 'contractor_block_id', 'contractorBlockId', 'contractorBlock'))
      });

      // Si las opciones ya están cargadas, re-aplicar una vez más
      if (this.positions?.length || this.departments?.length) {
        this.reapplyCatalogSelections();
      }
    }
  }

  onSubmit(): void {
    if (this.employeeForm.valid && this.employee && this.employee.id) {
      this.loading = true;
      this.error = null;

      const fv = this.employeeForm.getRawValue();

      // Mapear a las propiedades esperadas por UpdateBusinessEmployeeDto (camelCase)
      const payload: any = {
        cedula: fv.cedula,
        apellidos: fv.apellidos,
        nombres: fv.nombres,
        phone: fv.phone,
        email: fv.email,
        address: fv.address,
        direccionDomiciliaria: fv.direccionDomiciliaria || undefined,
        residentAddress: fv.direccionDomiciliaria || undefined,
        dateBirth: fv.birthdate ? `${fv.birthdate} 00:00:00` : undefined,
        lugarNacimientoProvincia: fv.lugarNacimientoProvincia || undefined,
        lugarNacimientoCiudad: fv.lugarNacimientoCiudad || undefined,
        lugarNacimientoParroquia: fv.lugarNacimientoParroquia || undefined,
        contactKinship: fv.contact_kinship,
        contactName: fv.contact_name,
        contactPhone: fv.contact_phone,
        fechaIngreso: fv.fechaIngreso || undefined,
        // IDs de catálogos
        positionId: fv.position_id ? Number(fv.position_id) : undefined,
        departmentId: fv.department_id ? Number(fv.department_id) : undefined,
        typeContractId: fv.type_contract_id ? Number(fv.type_contract_id) : undefined,
        degreeId: fv.degree_id ? Number(fv.degree_id) : undefined,
        genderId: fv.gender_id ? Number(fv.gender_id) : undefined,
        civilStatusId: fv.civil_status_id ? Number(fv.civil_status_id) : undefined,
        etniaId: fv.ethnicity_id ? Number(fv.ethnicity_id) : undefined,
        // Contratista
        contractorCompanyId: fv.contractor_company_id ? Number(fv.contractor_company_id) : undefined,
        contractorBlockId: fv.contractor_block_id ? Number(fv.contractor_block_id) : undefined,
        // Otros
        tipoSangre: fv.tipoSangre || undefined,
        discapacidad: fv.discapacidad || undefined,
        codigoIess: fv.codigoIess || undefined,
        // Foto (si el usuario seleccionó una nueva)
        profile_picture: this.selectedProfilePicture || undefined,
        // status/active se gestionan con toggle específico; no enviar si no cambian
      };

      // Limpiar propiedades vacías/undefined
      Object.keys(payload).forEach(k => {
        const v = (payload as any)[k];
        if (v === '' || v === undefined) {
          delete (payload as any)[k];
        }
      });

      this.employeeService.updateEmployee(this.employee.id, payload).subscribe({
        next: (response) => {
          console.log('Empleado actualizado exitosamente:', response);
          this.onEmployeeUpdated.emit();
        },
        error: (error) => {
          console.error('Error al actualizar empleado:', error);
          this.error = 'Error al actualizar el empleado. Por favor, inténtelo de nuevo.';
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  // === MANEJO DE FOTO ===
  onProfilePictureChange(event: any): void {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.error = 'Formato no permitido. Solo JPG, PNG o WEBP';
      this.selectedProfilePicture = null;
      this.selectedProfilePicturePreview = null;
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
      this.error = 'La imagen supera el tamaño máximo permitido de 5MB';
      this.selectedProfilePicture = null;
      this.selectedProfilePicturePreview = null;
      return;
    }
    this.error = null;
    this.selectedProfilePicture = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedProfilePicturePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  getProfileImageSrc(): string {
    if (!this.employee) return '/assets/img/user-placeholder.svg';
    const emp: any = this.employee;
    const path: string = emp.imagePath || emp.profile_picture || emp.photoFileName || '';
    if (!path) return '/assets/img/user-placeholder.svg';
    if (path.startsWith('http')) return path;
    if (path.startsWith('uploads/')) {
      const rel = path.replace(/^uploads\//, '');
      return `/api/files/${rel}`;
    }
    if (!path.includes('/')) {
      return `/api/files/profiles/${path}`;
    }
    return `/${path}`.replace(/\/\/+/, '/');
  }

  onRemoveProfilePicture(): void {
    if (!this.employee || !this.employee.id) return;
    if (!confirm('¿Eliminar la foto de perfil?')) return;
    this.loading = true;
    this.employeeService.deleteEmployeePhoto(this.employee.id).subscribe({
      next: (updated) => {
        // Limpiar selección local y actualizar modelo
        this.selectedProfilePicture = null;
        this.selectedProfilePicturePreview = null;
        (this.employee as any).imagePath = null;
        this.loading = false;
        this.onPhotoUpdated.emit();
      },
      error: (err) => {
        console.error('Error al eliminar foto:', err);
        this.error = 'No se pudo eliminar la foto de perfil';
        this.loading = false;
      }
    });
  }

  closeModal(): void {
    this.onClose.emit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['pattern']) {
        if (fieldName === 'cedula') return 'Cédula debe tener 10 dígitos';
        if (fieldName === 'phone' || fieldName === 'contact_phone') return 'Teléfono debe tener 10-12 dígitos';
      }
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  private loadConfigurations(): void {
    if (!this.businessId) {
      return;
    }
    forkJoin({
      genders: this.configurationService.getGenders(),
      civil: this.configurationService.getCivilStatuses(),
      etnias: this.configurationService.getEtnias(),
      positions: this.configurationService.getPositionsByCompany(this.businessId),
      departments: this.configurationService.getDepartmentsByCompany(this.businessId),
      typeContracts: this.configurationService.getTypeContractsByCompany(this.businessId),
      degrees: this.configurationService.getDegrees(),
      iessCodes: this.configurationService.getIessCodesByBusiness(this.businessId)
    }).subscribe({
      next: (res) => {
        this.genders = res.genders || [];
        this.civilStatuses = res.civil || [];
        this.etnias = res.etnias || [];
        this.positions = res.positions || [];
        this.departments = res.departments || [];
        this.typeContracts = res.typeContracts || [];
        this.degrees = res.degrees || [];
        this.iessCodes = res.iessCodes || [];
        // Reaplicar selecciones de catálogos una vez cargadas las opciones
        if (this.employee) {
          this.reapplyCatalogSelections();
        }
        // Cargar empresas contratistas disponibles para esta empresa
        this.loadContractorCompanies();
      },
      error: (err) => {
        console.error('Error cargando catálogos de configuración:', err);
      }
    });
  }

  // === MÉTODOS PARA EMPRESAS CONTRATISTAS ===
  private async loadContractorCompanies(): Promise<void> {
    try {
      if (!this.businessId) {
        this.contractorCompanies = [];
        this.availableContractorBlocks = [];
        return;
      }
      const business: any = await this.businessService.getById(this.businessId).toPromise();
      let contractorCompanies = [] as any[];
      if (business?.contractor_companies && Array.isArray(business.contractor_companies)) {
        contractorCompanies = business.contractor_companies;
      } else if (business?.contractorCompanies && Array.isArray(business.contractorCompanies)) {
        contractorCompanies = business.contractorCompanies;
      } else if (business?.contractor_company) {
        contractorCompanies = [business.contractor_company];
      } else if (business?.contractorCompany) {
        contractorCompanies = [business.contractorCompany];
      }
      this.contractorCompanies = contractorCompanies as any;

      // Si el empleado ya tenía empresa contratista, disparar carga de bloques y preseleccionar
      const emp: any = this.employee || {};
      const ccId = this.getId(emp, 'contractor_company_id', 'contractorCompanyId', 'contractorCompany');
      const ccIdNum = Number(ccId);
      if (!isNaN(ccIdNum) && ccIdNum) {
        this.employeeForm.patchValue({ contractor_company_id: String(ccIdNum) });
        this.loadContractorBlocksForBusiness(ccIdNum, () => {
          const cbId = this.getId(emp, 'contractor_block_id', 'contractorBlockId', 'contractorBlock');
          const cbIdNum = Number(cbId);
          if (!isNaN(cbIdNum) && cbIdNum) {
            this.employeeForm.patchValue({ contractor_block_id: String(cbIdNum) });
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar empresas contratistas:', error);
      this.contractorCompanies = [];
      this.availableContractorBlocks = [];
    }
  }

  onContractorCompanyChange(): void {
    const contractorCompanyId = this.employeeForm.get('contractor_company_id')?.value;
    this.employeeForm.patchValue({ contractor_block_id: '' });
    this.availableContractorBlocks = [];
    const idNum = Number(contractorCompanyId);
    if (!isNaN(idNum) && idNum) {
      this.loadContractorBlocksForBusiness(idNum);
    }
  }

  private loadContractorBlocksForBusiness(contractorCompanyId: number, afterLoad?: () => void): void {
    if (!contractorCompanyId) {
      this.availableContractorBlocks = [];
      if (afterLoad) afterLoad();
      return;
    }
    // Obtener la empresa y filtrar bloques asociados a la empresa contratista
    this.businessService.getById(this.businessId).subscribe({
      next: (business: any) => {
        const configuredBlocks = business?.contractor_blocks || business?.contractorBlocks || [];
        const blocksForSelectedCompany = configuredBlocks.filter((block: any) => {
          let blockContractorId = null;
          if (block.contractor_company_id) blockContractorId = Number(block.contractor_company_id);
          else if (block.contractorCompany?.id) blockContractorId = Number(block.contractorCompany.id);
          else if (block.contractor_company?.id) blockContractorId = Number(block.contractor_company.id);
          return blockContractorId === Number(contractorCompanyId);
        });
        this.availableContractorBlocks = blocksForSelectedCompany;
        if (afterLoad) afterLoad();
      },
      error: (err) => {
        console.error('Error al cargar bloques de contratista:', err);
        this.availableContractorBlocks = [];
        if (afterLoad) afterLoad();
      }
    });
  }
}