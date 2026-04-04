import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfiguracionEje } from '../models/configuracion-eje.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({ providedIn: 'root' })
export class ConfiguracionEjeService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/configuracion-ejes');
  }

  getAll(): Observable<ConfiguracionEje[]> {
    return this.http.get<ConfiguracionEje[]>(this.apiUrl);
  }

  getById(id: number): Observable<ConfiguracionEje> {
    return this.http.get<ConfiguracionEje>(`${this.apiUrl}/${id}`);
  }

  create(entity: ConfiguracionEje): Observable<ConfiguracionEje> {
    return this.http.post<ConfiguracionEje>(this.apiUrl, entity);
  }

  update(id: number, entity: ConfiguracionEje): Observable<ConfiguracionEje> {
    return this.http.put<ConfiguracionEje>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
