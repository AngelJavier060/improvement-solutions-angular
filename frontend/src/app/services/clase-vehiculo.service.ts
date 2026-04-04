import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClaseVehiculo } from '../models/clase-vehiculo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ClaseVehiculoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/clase-vehiculos');
  }

  getAll(): Observable<ClaseVehiculo[]> {
    return this.http.get<ClaseVehiculo[]>(this.apiUrl);
  }

  getById(id: number): Observable<ClaseVehiculo> {
    return this.http.get<ClaseVehiculo>(`${this.apiUrl}/${id}`);
  }

  create(entity: ClaseVehiculo): Observable<ClaseVehiculo> {
    return this.http.post<ClaseVehiculo>(this.apiUrl, entity);
  }

  update(id: number, entity: ClaseVehiculo): Observable<ClaseVehiculo> {
    return this.http.put<ClaseVehiculo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
