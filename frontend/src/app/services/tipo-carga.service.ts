import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoCarga } from '../models/tipo-carga.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TipoCargaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/tipo-cargas');
  }

  getAll(): Observable<TipoCarga[]> {
    return this.http.get<TipoCarga[]>(this.apiUrl);
  }

  getById(id: number): Observable<TipoCarga> {
    return this.http.get<TipoCarga>(`${this.apiUrl}/${id}`);
  }

  create(entity: TipoCarga): Observable<TipoCarga> {
    return this.http.post<TipoCarga>(this.apiUrl, entity);
  }

  update(id: number, entity: TipoCarga): Observable<TipoCarga> {
    return this.http.put<TipoCarga>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
