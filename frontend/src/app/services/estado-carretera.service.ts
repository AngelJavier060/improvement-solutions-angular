import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoCarretera } from '../models/estado-carretera.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class EstadoCarreteraService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/estado-carreteras');
  }

  getAll(): Observable<EstadoCarretera[]> {
    return this.http.get<EstadoCarretera[]>(this.apiUrl);
  }

  getById(id: number): Observable<EstadoCarretera> {
    return this.http.get<EstadoCarretera>(`${this.apiUrl}/${id}`);
  }

  create(entity: EstadoCarretera): Observable<EstadoCarretera> {
    return this.http.post<EstadoCarretera>(this.apiUrl, entity);
  }

  update(id: number, entity: EstadoCarretera): Observable<EstadoCarretera> {
    return this.http.put<EstadoCarretera>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
