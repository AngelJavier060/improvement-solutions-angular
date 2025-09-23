import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeeDocumentFile {
  id: number;
  file: string; // public URL
  file_name?: string;
  file_type?: string;
}

export interface EmployeeDocumentResponse {
  id: number;
  business_employee_id: number;
  type_document: { id: number; name: string };
  start_date?: string; // yyyy-MM-dd
  end_date?: string;   // yyyy-MM-dd
  description?: string;
  active?: boolean;
  files: EmployeeDocumentFile[];
}

export interface CreateEmployeeDocumentRequest {
  business_employee_id: number;
  type_document_id: number;
  start_date?: string; // yyyy-MM-dd
  end_date?: string;   // yyyy-MM-dd
  description?: string;
  files?: File[];
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getByEmployeeCedula(cedula: string, includeHistory: boolean = false): Observable<EmployeeDocumentResponse[]> {
    const url = `${this.apiUrl}/document/${cedula}/cedula?includeHistory=${includeHistory}`;
    return this.http.get<EmployeeDocumentResponse[]>(url);
  }

  getByBusinessEmployeeId(businessEmployeeId: number, includeHistory: boolean = false): Observable<EmployeeDocumentResponse[]> {
    const url = `${this.apiUrl}/employee_document/by-business-employee/${businessEmployeeId}?includeHistory=${includeHistory}`;
    return this.http.get<EmployeeDocumentResponse[]>(url);
  }

  create(req: CreateEmployeeDocumentRequest): Observable<EmployeeDocumentResponse> {
    const url = `${this.apiUrl}/employee_document`;
    const form = new FormData();
    form.append('business_employee_id', String(req.business_employee_id));
    form.append('type_document_id', String(req.type_document_id));
    if (req.start_date) form.append('start_date', req.start_date);
    if (req.end_date) form.append('end_date', req.end_date);
    if (req.description) form.append('description', req.description);
    if (req.files && req.files.length) {
      req.files.forEach(f => form.append('files[]', f));
    }
    return this.http.post<EmployeeDocumentResponse>(url, form);
  }

  delete(id: number): Observable<void> {
    const url = `${this.apiUrl}/employee_document/${id}`;
    return this.http.delete<void>(url);
  }
}
