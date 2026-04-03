import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HorarioCirculacion } from '../models/horario-circulacion.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class HorarioCirculacionService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/horario-circulaciones');
  }

  getAll(): Observable<HorarioCirculacion[]> {
    return this.http.get<HorarioCirculacion[]>(this.apiUrl);
  }

  getById(id: number): Observable<HorarioCirculacion> {
    return this.http.get<HorarioCirculacion>(`${this.apiUrl}/${id}`);
  }

  create(entity: HorarioCirculacion): Observable<HorarioCirculacion> {
    return this.http.post<HorarioCirculacion>(this.apiUrl, entity);
  }

  update(id: number, entity: HorarioCirculacion): Observable<HorarioCirculacion> {
    return this.http.put<HorarioCirculacion>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
