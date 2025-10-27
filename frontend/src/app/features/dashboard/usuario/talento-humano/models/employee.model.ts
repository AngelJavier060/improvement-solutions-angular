export interface Employee {
  id?: number;
  cedula: string;
  name: string;
  status: boolean;
  phone: string;
  birthdate: string;
  address: string;
  email: string;
  contact_kinship: string;
  contact_name: string;
  contact_phone: string;
  position_id?: number;
  gender_id?: number;
  ethnicity_id?: number;
  civil_status_id?: number;
  resident_address_id?: number;
  iess_id?: number;
  degree_id?: number;
  profile_picture?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmployeeRequest {
  // Campos básicos requeridos (mapeados al backend)
  cedula: string;
  apellidos: string; // Apellidos
  nombres: string;   // Nombres
  phone: string;
  email: string;
  dateBirth: string; // Fecha nacimiento en formato ISO
  
  // Direcciones
  address: string;
  direccionDomiciliaria?: string;
  
  // Lugar de nacimiento
  lugarNacimientoProvincia?: string;
  lugarNacimientoCiudad?: string;
  lugarNacimientoParroquia?: string;
  
  // Contacto de emergencia
  contactKinship: string;
  contactName: string;
  contactPhone: string;
  
  // Información laboral
  fechaIngreso?: string; // Fecha de ingreso
  codigoEmpresa: string; // RUC de la empresa
  positionId?: number;
  departmentId?: number;
  typeContractId?: number;
  
  // Información personal
  tipoSangre?: string;
  genderId?: number;
  civilStatusId?: number;
  etniaId?: number;
  degreeId?: number;
  nivelEducacion?: string;
  discapacidad?: string;
  codigoIess?: string;
  
  // Estado
  active?: boolean;
  status?: string;
  
  // Imagen
  imagePath?: string;
  profile_picture?: File;
}

export interface UpdateEmployeeRequest {
  // Compatibilidad anterior (snake_case y campos UI)
  cedula?: string;
  name?: string;
  status?: boolean;
  phone?: string;
  birthdate?: string;
  address?: string;
  email?: string;
  contact_kinship?: string;
  contact_name?: string;
  contact_phone?: string;
  position_id?: number | string;
  gender_id?: number | string;
  ethnicity_id?: number | string;
  civil_status_id?: number | string;
  resident_address_id?: number | string;
  iess_id?: number | string;
  degree_id?: number | string;
  profile_picture?: File;

  // Nuevos campos esperados por backend (camelCase)
  apellidos?: string;
  nombres?: string;
  dateBirth?: string; // yyyy-MM-dd HH:mm:ss
  direccionDomiciliaria?: string;
  residentAddress?: string;
  lugarNacimientoProvincia?: string;
  lugarNacimientoCiudad?: string;
  lugarNacimientoParroquia?: string;
  contactKinship?: string;
  contactName?: string;
  contactPhone?: string;
  fechaIngreso?: string; // yyyy-MM-dd
  tipoSangre?: string;
  discapacidad?: string;
  codigoIess?: string;
  positionId?: number;
  departmentId?: number;
  typeContractId?: number;
  genderId?: number;
  civilStatusId?: number;
  etniaId?: number;
  degreeId?: number;
  contractorCompanyId?: number;
  contractorBlockId?: number;
  codigoEmpresa?: string;
}

export interface EmployeeResponse {
  id: number;
  cedula: string;
  name: string;
  nombres?: string;
  apellidos?: string;
  status: boolean;
  phone: string;
  birthdate: string;
  address: string;
  email: string;
  contact_kinship: string;
  contact_name: string;
  contact_phone: string;
  position: any;
  gender: any;
  ethnicity: any;
  civil_status: any;
  resident_address: any;
  iess: any;
  degree: any;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
  
  // Nuevas propiedades desde el backend
  dateBirth?: string;
  lugarNacimientoProvincia?: string;
  lugarNacimientoCiudad?: string;
  lugarNacimientoParroquia?: string;
  direccionDomiciliaria?: string;
  residentAddress?: string;
  fechaIngreso?: string;
  codigoEmpresa?: string;
  codigoTrabajador?: string; // Código único del trabajador (expuesto por backend)
  businessId?: number;
  positionId?: number;
  departmentId?: number;
  typeContractId?: number;
  genderId?: number;
  civilStatusId?: number;
  etniaId?: number;
  degreeId?: number;
  businessName?: string;
  positionName?: string;
  departmentName?: string;
  contractTypeName?: string;
  genderName?: string;
  civilStatusName?: string;
  etniaName?: string;
  degreeName?: string;
  tipoSangre?: string;
  salario?: number;
  nivelEducacion?: string;
  discapacidad?: string;
  codigoIess?: string;
  active?: boolean;
  imagePath?: string;
  contractorCompanyId?: number;
  contractorCompanyName?: string;
  contractorBlockId?: number;
  contractorBlockName?: string;
}