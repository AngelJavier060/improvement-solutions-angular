import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CondicionClimatica } from '../models/condicion-climatica.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class CondicionClimaticaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/condicion-climaticas');
  }

  getAll(): Observable<CondicionClimatica[]> {
    return this.http.get<CondicionClimatica[]>(this.apiUrl);
  }

  getById(id: number): Observable<CondicionClimatica> {
    return this.http.get<CondicionClimatica>(`${this.apiUrl}/${id}`);
  }

  create(entity: CondicionClimatica): Observable<CondicionClimatica> {
    return this.http.post<CondicionClimatica>(this.apiUrl, entity);
  }

  update(id: number, entity: CondicionClimatica): Observable<CondicionClimatica> {
    return this.http.put<CondicionClimatica>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
