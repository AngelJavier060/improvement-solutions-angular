import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Business } from '../models/business.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    // Asegurarse de que la ruta incluya el prefijo /api/
    this.apiUrl = this.apiUrlService.getUrl('api/businesses');
  }

  getAll(): Observable<Business[]> {
    return this.http.get<Business[]>(this.apiUrl);
  }

  getById(id: number): Observable<Business> {
    return this.http.get<Business>(`${this.apiUrl}/${id}`);
  }

  getByUserId(userId: number): Observable<Business[]> {
    return this.http.get<Business[]>(`${this.apiUrl}/byUser/${userId}`);
  }

  create(business: Business): Observable<Business> {
    return this.http.post<Business>(this.apiUrl, business);
  }

  update(id: number, business: Business): Observable<Business> {
    return this.http.put<Business>(`${this.apiUrl}/${id}`, business);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Métodos para manejar la asociación de usuarios a empresas
  addUserToBusiness(businessId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${businessId}/users/${userId}`, {});
  }

  removeUserFromBusiness(businessId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${businessId}/users/${userId}`);
  }

  // Métodos públicos
  searchByName(name: string): Observable<Business[]> {
    return this.http.get<Business[]>(`${this.apiUrl}/public/search?name=${name}`);
  }

  getByRuc(ruc: string): Observable<Business> {
    return this.http.get<Business>(`${this.apiUrl}/public/ruc/${ruc}`);
  }
}
