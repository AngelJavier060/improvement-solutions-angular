import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OtrosPeligrosViaje } from '../models/otros-peligros-viaje.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({ providedIn: 'root' })
export class OtrosPeligrosViajeService {
  private readonly apiUrl: string;

  constructor(private http: HttpClient, apiUrlService: ApiUrlService) {
    this.apiUrl = apiUrlService.getUrl('/api/public/otros-peligros-viaje');
  }

  getAll(): Observable<OtrosPeligrosViaje[]> {
    return this.http.get<OtrosPeligrosViaje[]>(this.apiUrl);
  }

  getById(id: number): Observable<OtrosPeligrosViaje> {
    return this.http.get<OtrosPeligrosViaje>(`${this.apiUrl}/${id}`);
  }

  create(entity: OtrosPeligrosViaje): Observable<OtrosPeligrosViaje> {
    return this.http.post<OtrosPeligrosViaje>(this.apiUrl, entity);
  }

  update(id: number, entity: OtrosPeligrosViaje): Observable<OtrosPeligrosViaje> {
    return this.http.put<OtrosPeligrosViaje>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
