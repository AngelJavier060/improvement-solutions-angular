import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeResponse } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = 'http://localhost:8080/api'; // URL directa al backend

  constructor(private http: HttpClient) {}

  // Obtener todos los empleados de una empresa por RUC
  getEmployeesByBusiness(businessId: number): Observable<EmployeeResponse[]> {
    // Usar el endpoint con RUC para obtener empleados
    const url = `${this.apiUrl}/business-employees/company/${businessId}`;
    console.log('EmployeeService.getEmployeesByBusiness - URL:', url);
    return this.http.get<EmployeeResponse[]>(url);
  }

  // Obtener todos los empleados de una empresa por RUC específico
  getEmployeesByBusinessRuc(businessRuc: string): Observable<EmployeeResponse[]> {
    const url = `${this.apiUrl}/business-employees/company/${businessRuc}`;
    console.log('EmployeeService.getEmployeesByBusinessRuc - URL:', url);
    return this.http.get<EmployeeResponse[]>(url);
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
    const url = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.updateEmployee - URL:', url);

    // Si hay una foto, usar FormData
    if (employeeData.profile_picture) {
      const formData = new FormData();
      
      Object.keys(employeeData).forEach(key => {
        if (key === 'profile_picture') {
          if (employeeData.profile_picture) {
            formData.append('profile_picture', employeeData.profile_picture);
          }
        } else {
          const value = (employeeData as any)[key];
          if (value !== null && value !== undefined && value !== '') {
            formData.append(key, value.toString());
          }
        }
      });

      return this.http.put<EmployeeResponse>(url, formData);
    } else {
      // Sin foto, enviar JSON normal
      const jsonData = { ...employeeData };
      delete jsonData.profile_picture;
      return this.http.put<EmployeeResponse>(url, jsonData);
    }
  }

  // Eliminar empleado
  deleteEmployee(id: number): Observable<any> {
    const url = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.deleteEmployee - URL:', url);
    return this.http.delete(url);
  }

  // Obtener empleado por ID
  getEmployeeById(id: number): Observable<EmployeeResponse> {
    const url = `${this.apiUrl}/employees/${id}`;
    console.log('EmployeeService.getEmployeeById - URL:', url);
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
  deleteEmployeePhoto(employeeId: number): Observable<any> {
    const url = `${this.apiUrl}/files/employee/${employeeId}/photo`;
    console.log('EmployeeService.deleteEmployeePhoto - URL:', url);
    return this.http.delete(url);
  }
}