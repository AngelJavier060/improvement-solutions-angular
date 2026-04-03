import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DistanciaRecorrer } from '../models/distancia-recorrer.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class DistanciaRecorrerService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/distancia-recorrer');
  }

  getAll(): Observable<DistanciaRecorrer[]> {
    return this.http.get<DistanciaRecorrer[]>(this.apiUrl);
  }

  getById(id: number): Observable<DistanciaRecorrer> {
    return this.http.get<DistanciaRecorrer>(`${this.apiUrl}/${id}`);
  }

  create(entity: DistanciaRecorrer): Observable<DistanciaRecorrer> {
    return this.http.post<DistanciaRecorrer>(this.apiUrl, entity);
  }

  update(id: number, entity: DistanciaRecorrer): Observable<DistanciaRecorrer> {
    return this.http.put<DistanciaRecorrer>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
