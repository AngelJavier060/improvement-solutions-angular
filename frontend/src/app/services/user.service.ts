import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export interface CreateUserRequest {
  id?: number;
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  business_id: number;
  role_ids?: number[];
  // Mantener permission_ids para compatibilidad temporal
  permission_ids?: number[];
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  username: string;
  business_id: number;
  permissions: any[];
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private apiUrlService: ApiUrlService
  ) {
    this.apiUrl = this.apiUrlService.getUrl('/api');
  }

  createUser(userData: CreateUserRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/users`, userData);
  }

  updateUser(userData: CreateUserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/users/${userData.id}`, userData);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  getUsersByBusiness(businessId: number): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/businesses/${businessId}/users`);
  }

  getUserPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/permissions`);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/users/roles`);
  }

  // Nuevos métodos para asociar usuarios existentes con empresas
  getAvailableUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/businesses/available-users`);
  }

  associateUserWithBusiness(businessRuc: string, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/businesses/ruc/${businessRuc}/users/${userId}`, {});
  }
}
