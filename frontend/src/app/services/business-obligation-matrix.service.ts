import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({ providedIn: 'root' })
export class BusinessObligationMatrixService {
  private baseUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.baseUrl = this.apiUrlService.getUrl('api/obligation-matrices');
  }

  // Obtener por empresa (lista de relaciones)
  getByBusiness(businessId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/business/${businessId}`);
    }

  // Obtener por ID de relación
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // Actualizar relación por ID
  update(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
  }

  // Eliminar relación por ID (soft delete en backend)
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
