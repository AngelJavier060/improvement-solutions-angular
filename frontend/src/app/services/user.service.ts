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
  private apiUrl: string; // Base proxy-friendly

  constructor(
    private http: HttpClient,
    private apiUrlService: ApiUrlService
  ) {
    this.apiUrl = this.apiUrlService.getUrl('api');
    console.log('UserService inicializado con apiUrl:', this.apiUrl);
  }

  createUser(userData: CreateUserRequest): Observable<UserResponse> {
    const url = `${this.apiUrl}/users`;
    console.log('UserService.createUser - URL:', url);
    return this.http.post<UserResponse>(url, userData);
  }

  updateUser(userData: CreateUserRequest): Observable<UserResponse> {
    const url = `${this.apiUrl}/users/${userData.id}`;
    console.log('UserService.updateUser - URL:', url);
    return this.http.put<UserResponse>(url, userData);
  }

  deleteUser(id: number): Observable<any> {
    const url = `${this.apiUrl}/users/${id}`;
    console.log('UserService.deleteUser - URL:', url);
    console.log('UserService.deleteUser - Eliminando usuario con ID:', id);
    
    // Verificar token antes de la petición
    const token = localStorage.getItem('authToken');
    console.log('UserService.deleteUser - Token presente:', !!token);
    if (token) {
      console.log('UserService.deleteUser - Token (primeros 50 chars):', token.substring(0, 50));
    }
    
    return this.http.delete(url);
  }

  getUsersByBusiness(businessId: number): Observable<UserResponse[]> {
    const url = `${this.apiUrl}/businesses/${businessId}/users`;
    console.log('UserService.getUsersByBusiness - URL:', url);
    return this.http.get<UserResponse[]>(url);
  }

  getUserPermissions(): Observable<any[]> {
    const url = `${this.apiUrl}/permissions`;
    console.log('UserService.getUserPermissions - URL:', url);
    return this.http.get<any[]>(url);
  }

  getRoles(): Observable<Role[]> {
    const url = `${this.apiUrl}/users/roles`;
    console.log('UserService.getRoles - URL:', url);
    return this.http.get<Role[]>(url);
  }

  // Nuevos métodos para asociar usuarios existentes con empresas
  getAvailableUsers(): Observable<UserResponse[]> {
    const url = `${this.apiUrl}/businesses/available-users`;
    console.log('UserService.getAvailableUsers - URL:', url);
    return this.http.get<UserResponse[]>(url);
  }

  associateUserWithBusiness(businessRuc: string, userId: number): Observable<any> {
    const url = `${this.apiUrl}/businesses/ruc/${businessRuc}/users/${userId}`;
    console.log('UserService.associateUserWithBusiness - URL:', url);
    return this.http.post(url, {});
  }
}
