import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ParametroMetodologia } from '../models/parametro-metodologia.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ParametroMetodologiaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/parametro-metodologia');
  }

  getAll(): Observable<ParametroMetodologia[]> {
    return this.http.get<ParametroMetodologia[]>(this.apiUrl);
  }

  getById(id: number): Observable<ParametroMetodologia> {
    return this.http.get<ParametroMetodologia>(`${this.apiUrl}/${id}`);
  }

  getByMetodologia(metodologiaId: number): Observable<ParametroMetodologia[]> {
    return this.http.get<ParametroMetodologia[]>(`${this.apiUrl}/by-metodologia/${metodologiaId}`);
  }

  create(entity: ParametroMetodologia): Observable<ParametroMetodologia> {
    return this.http.post<ParametroMetodologia>(this.apiUrl, entity);
  }

  update(id: number, entity: ParametroMetodologia): Observable<ParametroMetodologia> {
    return this.http.put<ParametroMetodologia>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
