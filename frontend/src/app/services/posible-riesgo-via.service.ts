import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PosibleRiesgoVia } from '../models/posible-riesgo-via.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class PosibleRiesgoViaService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/posibles-riesgos-via');
  }

  getAll(): Observable<PosibleRiesgoVia[]> {
    return this.http.get<PosibleRiesgoVia[]>(this.apiUrl);
  }

  getById(id: number): Observable<PosibleRiesgoVia> {
    return this.http.get<PosibleRiesgoVia>(`${this.apiUrl}/${id}`);
  }

  create(entity: PosibleRiesgoVia): Observable<PosibleRiesgoVia> {
    return this.http.post<PosibleRiesgoVia>(this.apiUrl, entity);
  }

  update(id: number, entity: PosibleRiesgoVia): Observable<PosibleRiesgoVia> {
    return this.http.put<PosibleRiesgoVia>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
