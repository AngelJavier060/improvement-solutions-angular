import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeResponse } from '../models/employee.model';

// Página de Spring
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // página actual (0-based)
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = '/api'; // Usar ruta relativa para que funcione con proxy/interceptor

  constructor(private http: HttpClient) {}

  

  // Obtener todos los empleados de una empresa por ID
  getEmployeesByBusiness(businessId: number): Observable<EmployeeResponse[]> {
    const url = `${this.apiUrl}/businesses/${businessId}/employees`;
    console.log('EmployeeService.getEmployeesByBusiness - URL:', url);
    return this.http.get<EmployeeResponse[]>(url);
  }

  // Obtener todos los empleados de una empresa por RUC específico
  getEmployeesByBusinessRuc(businessRuc: string): Observable<EmployeeResponse[]> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}`;
    console.log('EmployeeService.getEmployeesByBusinessRuc - URL:', url);
    return this.http.get<EmployeeResponse[]>(url);
  }

  // Obtener empleados paginados/filtrados por RUC
  getEmployeesByBusinessRucPaginated(
    businessRuc: string,
    opts: {
      page?: number; size?: number; sortBy?: string; sortDir?: 'asc' | 'desc';
      cedula?: string; nombres?: string; apellidos?: string; codigo?: string;
    }
  ): Observable<Page<EmployeeResponse>> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}/paginated`;
    let params = new HttpParams();
    if (opts.page != null) params = params.set('page', String(opts.page));
    if (opts.size != null) params = params.set('size', String(opts.size));
    if (opts.sortBy) params = params.set('sortBy', opts.sortBy);
    if (opts.sortDir) params = params.set('sortDir', opts.sortDir);
    if (opts.cedula) params = params.set('cedula', opts.cedula);
    if (opts.nombres) params = params.set('nombres', opts.nombres);
    if (opts.apellidos) params = params.set('apellidos', opts.apellidos);
    if (opts.codigo) params = params.set('codigo', opts.codigo);
    return this.http.get<Page<EmployeeResponse>>(url, { params });
  }

  // Obtener estadísticas de empleados de una empresa por RUC
  getEmployeeStatsByBusinessRuc(businessRuc: string): Observable<any> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}/stats`;
    console.log('EmployeeService.getEmployeeStatsByBusinessRuc - URL:', url);
    return this.http.get<any>(url);
  }

  // Obtener rangos de edad por RUC (<18, 19-30, 31-50, >50)
  getEmployeeAgeRangesByBusinessRuc(businessRuc: string): Observable<{ under18: number; from19To30: number; from31To50: number; over50: number; total: number; }> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}/age-ranges`;
    console.log('EmployeeService.getEmployeeAgeRangesByBusinessRuc - URL:', url);
    return this.http.get<{ under18: number; from19To30: number; from31To50: number; over50: number; total: number; }>(url);
  }

  // Crear nuevo empleado
  createEmployee(employeeData: CreateEmployeeRequest): Observable<EmployeeResponse> {
    console.log('EmployeeService.createEmployee - Datos recibidos:', employeeData);
    console.log('EmployeeService.createEmployee - Tipo de profile_picture:', typeof employeeData.profile_picture);
    console.log('EmployeeService.createEmployee - profile_picture instanceof File:', employeeData.profile_picture instanceof File);
    console.log('EmployeeService.createEmployee - profile_picture valor:', employeeData.profile_picture);

    // Verificar si hay imagen ANTES de limpiar datos
    const hasImage = employeeData.profile_picture && employeeData.profile_picture instanceof File;
    console.log('EmployeeService.createEmployee - hasImage (antes de limpiar):', hasImage);
    console.log('🚨 DEBUGGING CRÍTICO:');
    console.log('   - employeeData.profile_picture existe?:', !!employeeData.profile_picture);
    console.log('   - Tipo:', typeof employeeData.profile_picture);
    console.log('   - instanceof File?:', employeeData.profile_picture instanceof File);
    console.log('   - Constructor name:', employeeData.profile_picture?.constructor?.name);
    console.log('   - hasImage resultado final:', hasImage);

    // Limpiar datos - convertir strings vacíos a null y filtrar campos undefined
    // PERO NO ELIMINAR profile_picture si es un File
    const cleanData = { ...employeeData };
    Object.keys(cleanData).forEach(key => {
      const value = (cleanData as any)[key];
      // No eliminar profile_picture si es un File object
      if (key === 'profile_picture' && value instanceof File) {
        return; // Mantener el File object
      }
      // Para otros campos, eliminar si están vacíos o undefined
      if (value === '' || value === undefined) {
        delete (cleanData as any)[key];
      }
    });

    console.log('EmployeeService.createEmployee - Datos limpios:', cleanData);
    console.log('EmployeeService.createEmployee - cleanData.profile_picture:', cleanData.profile_picture);
    console.log('EmployeeService.createEmployee - Tipo de cleanData.profile_picture:', typeof cleanData.profile_picture);
    console.log('EmployeeService.createEmployee - profile_picture instanceof File DESPUÉS de limpiar:', cleanData.profile_picture instanceof File);

    // Si hay una imagen, usar el endpoint multipart
    if (hasImage) {
      console.log('🟢 USANDO ENDPOINT CON IMAGEN (multipart/form-data)');
      const url = `${this.apiUrl}/business-employees/with-image`;
      console.log('EmployeeService.createEmployee - URL con imagen:', url);
      
      const formData = new FormData();
      
      // Crear objeto JSON con todos los datos excepto la imagen
      const jsonData = { ...cleanData };
      delete jsonData.profile_picture;
      
      // Agregar los datos del empleado como JSON string
      formData.append('employeeData', JSON.stringify(jsonData));
      
      // Agregar la imagen como archivo
      formData.append('image', cleanData.profile_picture!);
      
      console.log('Enviando FormData con imagen');
      console.log('Datos JSON:', JSON.stringify(jsonData));
      console.log('Archivo de imagen:', cleanData.profile_picture);
      
      // No establecer Content-Type manualmente - el navegador lo hará automáticamente con el boundary correcto
      return this.http.post<EmployeeResponse>(url, formData);
    } else {
      console.log('🔴 USANDO ENDPOINT SIN IMAGEN (application/json)');
      console.log('Razón: profile_picture = ', cleanData.profile_picture);
      console.log('instanceof File = ', cleanData.profile_picture ? ((cleanData.profile_picture as any) instanceof File) : 'profile_picture is null/undefined');
      // Sin imagen, usar el endpoint JSON normal
      const url = `${this.apiUrl}/business-employees`;
      console.log('EmployeeService.createEmployee - URL sin imagen:', url);
      
      const jsonData = { ...cleanData };
      delete jsonData.profile_picture; // Asegurar que no se envíe la imagen
      
      console.log('Datos limpiados a enviar:', jsonData);
      return this.http.post<EmployeeResponse>(url, jsonData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Actualizar empleado
  updateEmployee(id: number, employeeData: UpdateEmployeeRequest): Observable<EmployeeResponse> {
    const putUrl = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.updateEmployee - URL base:', putUrl);

    // Si hay una foto, usar endpoint compatible con multipart del backend
    if (employeeData.profile_picture && employeeData.profile_picture instanceof File) {
      const postUrl = `${this.apiUrl}/employee/${id}`; // Controller: @PostMapping("/employee/{id}")
      console.log('EmployeeService.updateEmployee - usando MULTIPART:', postUrl);
      const formData = new FormData();

      // Imagen: el backend espera el campo 'file'
      formData.append('file', employeeData.profile_picture);

      // Campo requerido por backend: employee_cedula
      const employeeCedula = (employeeData as any).cedula;
      if (employeeCedula) {
        formData.append('employee_cedula', String(employeeCedula));
      }

      // Agregar el resto de campos como formulario (UpdateBusinessEmployeeDto - camelCase)
      const toAppend = { ...employeeData } as any;
      delete toAppend.profile_picture;
      Object.keys(toAppend).forEach(key => {
        const value = toAppend[key];
        if (value === null || value === undefined || value === '') {
          return;
        }
        let strVal = String(value);
        // Ajustar formatos que espera Spring cuando se usa @ModelAttribute
        if (key === 'dateBirth') {
          // LocalDateTime: usar ISO con 'T'
          if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            strVal = `${strVal}T00:00:00`;
          } else {
            strVal = strVal.replace(' ', 'T');
          }
        }
        if (key === 'fechaIngreso') {
          // LocalDate: asegurar solo la parte de fecha
          if (!/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
            strVal = strVal.split('T')[0].split(' ')[0];
          }
        }
        formData.append(key, strVal);
      });

      return this.http.post<EmployeeResponse>(postUrl, formData);
    } else {
      // Sin foto, enviar JSON normal al endpoint PUT
      const jsonData = { ...employeeData };
      delete jsonData.profile_picture;
      return this.http.put<EmployeeResponse>(putUrl, jsonData);
    }
  }

  // Eliminar empleado
  deleteEmployee(id: number): Observable<any> {
    const url = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.deleteEmployee - URL:', url);
    return this.http.delete(url);
  }

  // Activar/Desactivar empleado
  setEmployeeActive(id: number, value: boolean): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${id}/active?value=${value}`;
    console.log('EmployeeService.setEmployeeActive - URL:', url, 'value:', value);
    return this.http.patch<EmployeeResponse>(url, {});
  }

  // Desvincular (inactivar) con motivo y fecha efectiva
  deactivateEmployee(id: number, body: { reason?: string; effectiveDate: string }): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${id}/deactivate`;
    console.log('EmployeeService.deactivateEmployee - URL:', url, 'body:', body);
    return this.http.post<EmployeeResponse>(url, body);
  }

  // Reingresar (activar) con fecha efectiva
  reactivateEmployee(id: number, body: { effectiveDate: string }): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${id}/reactivate`;
    console.log('EmployeeService.reactivateEmployee - URL:', url, 'body:', body);
    return this.http.post<EmployeeResponse>(url, body);
  }

  // Obtener empleado por ID
  getEmployeeById(id: number): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.getEmployeeById - URL:', url);
    return this.http.get<EmployeeResponse>(url);
  }

  // Obtener empleado por cédula (Angular endpoint compatible)
  getEmployeeByCedula(cedula: string): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/business-employees/cedula/${cedula}`;
    console.log('EmployeeService.getEmployeeByCedula - URL:', url);
    return this.http.get<EmployeeResponse>(url);
  }

  // Obtener empleado por cédula delimitado por empresa (RUC)
  getEmployeeByCedulaScopedByRuc(businessRuc: string, cedula: string): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}/cedula/${cedula}`;
    console.log('EmployeeService.getEmployeeByCedulaScopedByRuc - URL:', url);
    return this.http.get<EmployeeResponse>(url);
  }

  // Obtener empleado por cédula delimitado por empresa (businessId)
  getEmployeeByCedulaScopedByBusinessId(businessId: number, cedula: string): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/businesses/${businessId}/employees/cedula/${cedula}`;
    console.log('EmployeeService.getEmployeeByCedulaScopedByBusinessId - URL:', url);
    return this.http.get<EmployeeResponse>(url);
  }

  // Subir foto de empleado (método dedicado)
  uploadEmployeePhoto(employeeId: number, file: File): Observable<any> {
    const url = `${this.apiUrl}/files/employee/${employeeId}/photo`;
    const formData = new FormData();
    formData.append('file', file);
    console.log('EmployeeService.uploadEmployeePhoto - URL:', url);
    return this.http.post(url, formData);
  }

  // Obtener foto de empleado
  getEmployeePhotoUrl(photoFileName: string): string {
    return `${this.apiUrl}/files/employee/photo/${photoFileName}`;
  }

  // Eliminar foto de empleado
  deleteEmployeePhoto(employeeId: number): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${employeeId}/profile-picture`;
    console.log('EmployeeService.deleteEmployeePhoto - URL:', url);
    return this.http.delete<EmployeeResponse>(url);
  }
}