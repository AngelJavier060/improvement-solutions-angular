import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BusinessEmployee {
  id?: number;
  cedula: string;
  name: string;
  phone?: string;
  dateBirth?: string;
  address?: string;
  email?: string;
  position?: string;
  residentAddress?: string;
  active?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactKinship?: string;
  iess?: string;
  status?: string;
  image?: string;
  businessId: number;
  genderId?: number;
  civilStatusId?: number;
  ethniaId?: number;
  degreeId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  cedula: string;
  name: string;
  phone?: string;
  email?: string;
  businessId: number;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessEmployeeService {
  private readonly baseUrl = `${environment.apiUrl}/api/business-employees`;

  constructor(private http: HttpClient) {}

  private getHttpOptions(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getEmployeesByBusiness(businessId: number): Observable<BusinessEmployee[]> {
    return this.http.get<BusinessEmployee[]>(
      `${this.baseUrl}/business/${businessId}`,
      this.getHttpOptions()
    );
  }

  getEmployeeById(id: number): Observable<BusinessEmployee> {
    return this.http.get<BusinessEmployee>(
      `${this.baseUrl}/${id}`,
      this.getHttpOptions()
    );
  }

  createEmployee(employee: CreateEmployeeRequest): Observable<BusinessEmployee> {
    const employeeData = {
      cedula: employee.cedula,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      business: {
        id: employee.businessId
      }
    };

    return this.http.post<BusinessEmployee>(
      this.baseUrl,
      employeeData,
      this.getHttpOptions()
    );
  }

  updateEmployee(id: number, employee: BusinessEmployee): Observable<BusinessEmployee> {
    return this.http.put<BusinessEmployee>(
      `${this.baseUrl}/${id}`,
      employee,
      this.getHttpOptions()
    );
  }

  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      this.getHttpOptions()
    );
  }

  updateEmployeeStatus(id: number, status: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/${id}/status?status=${status}`,
      {},
      this.getHttpOptions()
    );
  }

  searchEmployees(businessId: number, searchTerm: string): Observable<BusinessEmployee[]> {
    return this.http.get<BusinessEmployee[]>(
      `${this.baseUrl}/business/${businessId}/search?searchTerm=${searchTerm}`,
      this.getHttpOptions()
    );
  }

  getEmployeeByCedula(businessId: number, cedula: string): Observable<BusinessEmployee> {
    return this.http.get<BusinessEmployee>(
      `${this.baseUrl}/business/${businessId}/cedula/${cedula}`,
      this.getHttpOptions()
    );
  }
}
