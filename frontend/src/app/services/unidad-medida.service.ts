import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UnidadMedida } from '../models/unidad-medida.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class UnidadMedidaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/unidad-medidas');
  }

  getAll(): Observable<UnidadMedida[]> {
    return this.http.get<UnidadMedida[]>(this.apiUrl);
  }

  getById(id: number): Observable<UnidadMedida> {
    return this.http.get<UnidadMedida>(`${this.apiUrl}/${id}`);
  }

  create(entity: UnidadMedida): Observable<UnidadMedida> {
    return this.http.post<UnidadMedida>(this.apiUrl, entity);
  }

  update(id: number, entity: UnidadMedida): Observable<UnidadMedida> {
    return this.http.put<UnidadMedida>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
