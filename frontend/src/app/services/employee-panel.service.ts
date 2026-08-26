import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeeDashboard {
  employeeName: string;
  position: string;
  businessName: string;
  businesses?: Array<{ id: number; name: string; ruc?: string }>;
  cedula: string;
  active: boolean;
  totalDocuments: number;
  documentsVigentes: number;
  documentsPorVencer: number;
  documentsVencidos: number;
  totalCourses: number;
  coursesCompleted: number;
  coursesPending: number;
  alerts: Array<{ type: string; message: string }>;
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
  businesses?: Array<{ id: number; name: string; ruc?: string }>;
  imagePath: string | null;
}

export interface EmployeePanelFile {
  id?: number;
  file?: string;
  file_name?: string;
  file_type?: string;
}

export interface EmployeePanelDocument {
  id: number;
  name: string;
  type: string;
  description?: string;
  issueDate?: string;
  expirationDate?: string;
  status: string;
  businessId?: number;
  businessName?: string;
  files?: EmployeePanelFile[];
}

export interface EmployeePanelCourse {
  id: number;
  name: string;
  date?: string;
  expirationDate?: string;
  duration?: string;
  score?: string;
  status?: string;
  completed?: boolean;
  businessId?: number;
  businessName?: string;
  files?: EmployeePanelFile[];
}

export interface EmployeePanelCard {
  id: number;
  name: string;
  cardNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  status: string;
  businessId?: number;
  businessName?: string;
  files?: EmployeePanelFile[];
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

  getMyDocuments(): Observable<EmployeePanelDocument[]> {
    return this.http.get<EmployeePanelDocument[]>(`${this.baseUrl}/my-documents`);
  }

  getMyCourses(): Observable<EmployeePanelCourse[]> {
    return this.http.get<EmployeePanelCourse[]>(`${this.baseUrl}/my-courses`);
  }

  getMyCards(): Observable<EmployeePanelCard[]> {
    return this.http.get<EmployeePanelCard[]>(`${this.baseUrl}/my-cards`);
  }

  /** Descarga autenticada (Bearer) de un archivo propio del trabajador */
  downloadMyFile(publicFileUrl: string | undefined | null): Observable<Blob> | null {
    if (!publicFileUrl) return null;
    const path = this.extractStoragePath(publicFileUrl);
    if (!path) return null;
    return this.http.get(`${this.baseUrl}/my-file`, {
      params: { path },
      responseType: 'blob'
    });
  }

  /** URL segura (requiere Authorization; preferir downloadMyFile) */
  buildSecureFileUrl(publicFileUrl: string | undefined | null): string | null {
    if (!publicFileUrl) return null;
    const path = this.extractStoragePath(publicFileUrl);
    if (!path) return null;
    return `${this.baseUrl}/my-file?path=${encodeURIComponent(path)}`;
  }

  private extractStoragePath(publicUrl: string): string | null {
    let rel = publicUrl;
    if (rel.includes('/api/files/download/')) {
      rel = rel.substring(rel.indexOf('/api/files/download/') + '/api/files/download/'.length);
    } else if (rel.includes('/api/files/')) {
      rel = rel.substring(rel.indexOf('/api/files/') + '/api/files/'.length);
      if (rel.startsWith('download/')) {
        rel = rel.substring('download/'.length);
      }
    } else {
      return null;
    }
    return rel || null;
  }
}
