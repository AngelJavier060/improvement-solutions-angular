import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Department } from '../models/department.model';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private apiUrl = `${environment.apiUrl}/api/departments`;

  constructor(private http: HttpClient) { }

  getDepartamentos(): Observable<Department[]> {
    return this.http.get<Department[]>(this.apiUrl);
  }

  getDepartamento(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  createDepartamento(departamento: Department): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, departamento);
  }

  updateDepartamento(id: number, departamento: Department): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${id}`, departamento);
  }

  deleteDepartamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 