import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeeWithAccount {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  active: boolean;
  status: string;
  hasAccount: boolean;
  username: string | null;
  userId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeAccountService {

  private baseUrl = `${environment.apiUrl}/api/employee-accounts`;

  constructor(private http: HttpClient) {}

  getEmployeesWithAccountStatus(businessId: number): Observable<EmployeeWithAccount[]> {
    return this.http.get<EmployeeWithAccount[]>(`${this.baseUrl}/business/${businessId}`);
  }

  createAccount(businessEmployeeId: number, payload: { username: string; password: string; email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${businessEmployeeId}/create-account`, payload);
  }

  hasAccount(businessEmployeeId: number): Observable<{ hasAccount: boolean; username: string; userId: number }> {
    return this.http.get<any>(`${this.baseUrl}/${businessEmployeeId}/has-account`);
  }
}
