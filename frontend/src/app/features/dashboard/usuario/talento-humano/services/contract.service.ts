import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContractFile {
  id: number;
  file: string; // public URL
  file_name?: string;
  file_type?: string;
}

export interface EmployeeContractResponse {
  id: number;
  business_employee: any;
  type_contract: any;
  position?: any;
  department?: any;
  start_date: string; // yyyy-MM-dd
  end_date?: string;   // yyyy-MM-dd
  salary?: number;
  description?: string;
  files?: ContractFile[];
}

export interface CreateEmployeeContractRequest {
  business_employee_id: number;
  type_contract_id: number;
  position_id?: number;
  department_id?: number;
  start_date: string; // yyyy-MM-dd
  end_date?: string;   // yyyy-MM-dd
  salary?: number;
  description?: string;
  files?: File[];
}

@Injectable({ providedIn: 'root' })
export class ContractService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getByEmployeeCedula(cedula: string): Observable<EmployeeContractResponse[]> {
    const url = `${this.apiUrl}/contract/${cedula}/cedula`;
    return this.http.get<EmployeeContractResponse[]>(url);
  }

  create(req: CreateEmployeeContractRequest): Observable<EmployeeContractResponse> {
    const url = `${this.apiUrl}/employee_contract`;
    const form = new FormData();
    form.append('business_employee_id', String(req.business_employee_id));
    form.append('type_contract_id', String(req.type_contract_id));
    if (req.position_id != null) form.append('position_id', String(req.position_id));
    if (req.department_id != null) form.append('department_id', String(req.department_id));
    form.append('start_date', req.start_date);
    if (req.end_date) form.append('end_date', req.end_date);
    if (req.salary != null) form.append('salary', String(req.salary));
    if (req.description) form.append('description', req.description);
    if (req.files && req.files.length) {
      req.files.forEach(f => form.append('files[]', f));
    }
    return this.http.post<EmployeeContractResponse>(url, form);
  }

  delete(id: number): Observable<void> {
    const url = `${this.apiUrl}/employee_contract/${id}`;
    return this.http.delete<void>(url);
  }
}
