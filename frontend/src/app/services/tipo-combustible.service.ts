import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoCombustible } from '../models/tipo-combustible.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TipoCombustibleService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/tipo-combustibles');
  }

  getAll(): Observable<TipoCombustible[]> {
    return this.http.get<TipoCombustible[]>(this.apiUrl);
  }

  getById(id: number): Observable<TipoCombustible> {
    return this.http.get<TipoCombustible>(`${this.apiUrl}/${id}`);
  }

  create(entity: TipoCombustible): Observable<TipoCombustible> {
    return this.http.post<TipoCombustible>(this.apiUrl, entity);
  }

  update(id: number, entity: TipoCombustible): Observable<TipoCombustible> {
    return this.http.put<TipoCombustible>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
