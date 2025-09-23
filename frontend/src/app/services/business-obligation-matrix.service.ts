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
    const url = `${this.baseUrl}/business/${businessId}`;
    return this.http.get<any[]>(`${url}?_=${Date.now()}`);
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

  // Crear relación por empresa y catálogo con datos opcionales
  createForBusinessAndCatalog(businessId: number, catalogId: number, payload?: any): Observable<any> {
    const body = payload ?? {};
    return this.http.post<any>(`${this.baseUrl}/business/${businessId}/catalog/${catalogId}`, body);
  }

  // Marcar cumplimiento
  markCompletion(id: number, completed: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/complete?completed=${completed}`, {});
  }

  // === Archivos adjuntos ===
  listFiles(matrixId: number, opts?: { version?: number; currentOnly?: boolean }): Observable<any[]> {
    let url = `${this.baseUrl}/${matrixId}/files`;
    const params: string[] = [];
    if (opts?.version != null) params.push(`version=${encodeURIComponent(String(opts.version))}`);
    if (opts?.currentOnly) params.push(`currentOnly=true`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.http.get<any[]>(url);
  }

  uploadFile(matrixId: number, file: File, description?: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    if (description) {
      form.append('description', description);
    }
    return this.http.post<any>(`${this.baseUrl}/${matrixId}/files`, form);
  }

  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/${fileId}/download`, { responseType: 'blob' });
  }

  updateFile(fileId: number, description: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/files/${fileId}`, { description });
  }

  deleteFile(fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${fileId}`);
  }

  // === Versioning / Renewal ===
  renew(id: number, payload?: any): Observable<any> {
    const body = payload ?? {};
    return this.http.post<any>(`${this.baseUrl}/${id}/renew`, body);
  }

  listVersions(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${id}/versions`);
  }

  // === Compliance summary (for gauge) ===
  getComplianceSummaryByBusiness(businessId: number): Observable<{ total: number; completed: number; percentage: number }>{
    const url = `${this.baseUrl}/business/${businessId}/compliance-summary`;
    return this.http.get<{ total: number; completed: number; percentage: number }>(`${url}?_=${Date.now()}`);
  }
}
