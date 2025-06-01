import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Department } from '../models/department.model';
import { ApiUrlService } from '../core/services/api-url.service'; // Asegúrate que la ruta sea correcta

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/departments'); // Usando ApiUrlService
    console.log('DepartmentService API URL:', this.apiUrl);
  }

  getAllDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  getDepartmentById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  createDepartment(department: Department): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  updateDepartment(id: number, department: Department): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${id}`, department);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
