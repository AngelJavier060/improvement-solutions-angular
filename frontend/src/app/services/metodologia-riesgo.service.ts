import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MetodologiaRiesgo } from '../models/metodologia-riesgo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class MetodologiaRiesgoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/metodologia-riesgo');
  }

  getAll(): Observable<MetodologiaRiesgo[]> {
    return this.http.get<MetodologiaRiesgo[]>(this.apiUrl);
  }

  getById(id: number): Observable<MetodologiaRiesgo> {
    return this.http.get<MetodologiaRiesgo>(`${this.apiUrl}/${id}`);
  }

  create(entity: MetodologiaRiesgo): Observable<MetodologiaRiesgo> {
    return this.http.post<MetodologiaRiesgo>(this.apiUrl, entity);
  }

  update(id: number, entity: MetodologiaRiesgo): Observable<MetodologiaRiesgo> {
    return this.http.put<MetodologiaRiesgo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
