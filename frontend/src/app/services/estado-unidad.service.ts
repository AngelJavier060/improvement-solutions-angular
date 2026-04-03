import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoUnidad } from '../models/estado-unidad.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class EstadoUnidadService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/estado-unidades');
  }

  getAll(): Observable<EstadoUnidad[]> {
    return this.http.get<EstadoUnidad[]>(this.apiUrl);
  }

  getById(id: number): Observable<EstadoUnidad> {
    return this.http.get<EstadoUnidad>(`${this.apiUrl}/${id}`);
  }

  create(entity: EstadoUnidad): Observable<EstadoUnidad> {
    return this.http.post<EstadoUnidad>(this.apiUrl, entity);
  }

  update(id: number, entity: EstadoUnidad): Observable<EstadoUnidad> {
    return this.http.put<EstadoUnidad>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
