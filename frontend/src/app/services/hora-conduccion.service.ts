import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HoraConduccion } from '../models/hora-conduccion.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class HoraConduccionService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/hora-conducciones');
  }

  getAll(): Observable<HoraConduccion[]> {
    return this.http.get<HoraConduccion[]>(this.apiUrl);
  }

  getById(id: number): Observable<HoraConduccion> {
    return this.http.get<HoraConduccion>(`${this.apiUrl}/${id}`);
  }

  create(entity: HoraConduccion): Observable<HoraConduccion> {
    return this.http.post<HoraConduccion>(this.apiUrl, entity);
  }

  update(id: number, entity: HoraConduccion): Observable<HoraConduccion> {
    return this.http.put<HoraConduccion>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
