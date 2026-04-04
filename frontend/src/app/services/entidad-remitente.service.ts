import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EntidadRemitente } from '../models/entidad-remitente.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class EntidadRemitenteService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/entidades-remitente');
  }

  getAll(): Observable<EntidadRemitente[]> {
    return this.http.get<EntidadRemitente[]>(this.apiUrl);
  }

  getById(id: number): Observable<EntidadRemitente> {
    return this.http.get<EntidadRemitente>(`${this.apiUrl}/${id}`);
  }

  create(entity: EntidadRemitente): Observable<EntidadRemitente> {
    return this.http.post<EntidadRemitente>(this.apiUrl, entity);
  }

  update(id: number, entity: EntidadRemitente): Observable<EntidadRemitente> {
    return this.http.put<EntidadRemitente>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
