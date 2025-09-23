import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeeCardFile {
  id: number;
  file: string; // public URL
  file_name?: string;
  file_type?: string;
}

export interface EmployeeCardResponse {
  id: number;
  business_employee_id: number;
  card: { id: number; name: string };
  card_number?: string;
  issue_date?: string; // yyyy-MM-dd
  expiry_date?: string; // yyyy-MM-dd
  observations?: string;
  active?: boolean;
  files: EmployeeCardFile[];
}

export interface CreateEmployeeCardRequest {
  business_employee_id: number;
  card_id: number;
  card_number?: string;
  issue_date?: string; // yyyy-MM-dd
  expiry_date?: string; // yyyy-MM-dd
  observations?: string;
  files?: File[];
}

@Injectable({ providedIn: 'root' })
export class EmployeeCardService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getByBusinessEmployeeId(businessEmployeeId: number, includeHistory: boolean = false): Observable<EmployeeCardResponse[]> {
    const url = `${this.apiUrl}/employee_card/by-business-employee/${businessEmployeeId}?includeHistory=${includeHistory}`;
    return this.http.get<EmployeeCardResponse[]>(url);
  }

  create(req: CreateEmployeeCardRequest): Observable<EmployeeCardResponse> {
    const url = `${this.apiUrl}/employee_card`;
    const form = new FormData();
    form.append('business_employee_id', String(req.business_employee_id));
    form.append('card_id', String(req.card_id));
    if (req.card_number) form.append('card_number', req.card_number);
    if (req.issue_date) form.append('issue_date', req.issue_date);
    if (req.expiry_date) form.append('expiry_date', req.expiry_date);
    if (req.observations) form.append('observations', req.observations);
    if (req.files && req.files.length) {
      req.files.forEach(f => form.append('files[]', f));
    }
    return this.http.post<EmployeeCardResponse>(url, form);
  }

  delete(id: number): Observable<void> {
    const url = `${this.apiUrl}/employee_card/${id}`;
    return this.http.delete<void>(url);
  }
}
