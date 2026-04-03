import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaisOrigen } from '../models/pais-origen.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class PaisOrigenService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/pais-origenes');
  }

  getAll(): Observable<PaisOrigen[]> {
    return this.http.get<PaisOrigen[]>(this.apiUrl);
  }

  getById(id: number): Observable<PaisOrigen> {
    return this.http.get<PaisOrigen>(`${this.apiUrl}/${id}`);
  }

  create(entity: PaisOrigen): Observable<PaisOrigen> {
    return this.http.post<PaisOrigen>(this.apiUrl, entity);
  }

  update(id: number, entity: PaisOrigen): Observable<PaisOrigen> {
    return this.http.put<PaisOrigen>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
