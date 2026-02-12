import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeeDashboard {
  employeeName: string;
  position: string;
  businessName: string;
  cedula: string;
  active: boolean;
  totalDocuments: number;
  documentsVigentes: number;
  documentsPorVencer: number;
  documentsVencidos: number;
  totalCourses: number;
  coursesCompleted: number;
  coursesPending: number;
  alerts: any[];
}

export interface EmployeeProfile {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string | null;
  fechaIngreso: string | null;
  tipoSangre: string | null;
  active: boolean;
  status: string;
  businessName: string | null;
  imagePath: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeePanelService {

  private baseUrl = `${environment.apiUrl}/api/employee-panel`;

  constructor(private http: HttpClient) {}

  getMyDashboard(): Observable<EmployeeDashboard> {
    return this.http.get<EmployeeDashboard>(`${this.baseUrl}/my-dashboard`);
  }

  getMyProfile(): Observable<EmployeeProfile> {
    return this.http.get<EmployeeProfile>(`${this.baseUrl}/my-profile`);
  }

  getMyDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my-documents`);
  }

  getMyCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my-courses`);
  }
}
