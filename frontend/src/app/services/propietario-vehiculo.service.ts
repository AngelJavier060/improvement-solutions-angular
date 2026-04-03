import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PropietarioVehiculo } from '../models/propietario-vehiculo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class PropietarioVehiculoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/propietario-vehiculos');
  }

  getAll(): Observable<PropietarioVehiculo[]> {
    return this.http.get<PropietarioVehiculo[]>(this.apiUrl);
  }

  getById(id: number): Observable<PropietarioVehiculo> {
    return this.http.get<PropietarioVehiculo>(`${this.apiUrl}/${id}`);
  }

  create(entity: PropietarioVehiculo): Observable<PropietarioVehiculo> {
    return this.http.post<PropietarioVehiculo>(this.apiUrl, entity);
  }

  update(id: number, entity: PropietarioVehiculo): Observable<PropietarioVehiculo> {
    return this.http.put<PropietarioVehiculo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
