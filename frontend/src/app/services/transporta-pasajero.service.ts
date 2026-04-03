import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransportaPasajero } from '../models/transporta-pasajero.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TransportaPasajeroService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/transporta-pasajeros');
  }

  getAll(): Observable<TransportaPasajero[]> {
    return this.http.get<TransportaPasajero[]>(this.apiUrl);
  }

  getById(id: number): Observable<TransportaPasajero> {
    return this.http.get<TransportaPasajero>(`${this.apiUrl}/${id}`);
  }

  create(entity: TransportaPasajero): Observable<TransportaPasajero> {
    return this.http.post<TransportaPasajero>(this.apiUrl, entity);
  }

  update(id: number, entity: TransportaPasajero): Observable<TransportaPasajero> {
    return this.http.put<TransportaPasajero>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
