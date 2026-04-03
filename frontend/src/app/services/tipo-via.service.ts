import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoVia } from '../models/tipo-via.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TipoViaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/tipo-vias');
  }

  getAll(): Observable<TipoVia[]> {
    return this.http.get<TipoVia[]>(this.apiUrl);
  }

  getById(id: number): Observable<TipoVia> {
    return this.http.get<TipoVia>(`${this.apiUrl}/${id}`);
  }

  create(entity: TipoVia): Observable<TipoVia> {
    return this.http.post<TipoVia>(this.apiUrl, entity);
  }

  update(id: number, entity: TipoVia): Observable<TipoVia> {
    return this.http.put<TipoVia>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
