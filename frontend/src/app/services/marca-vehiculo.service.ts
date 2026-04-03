import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarcaVehiculo } from '../models/marca-vehiculo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class MarcaVehiculoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/marca-vehiculos');
  }

  getAll(): Observable<MarcaVehiculo[]> {
    return this.http.get<MarcaVehiculo[]>(this.apiUrl);
  }

  getById(id: number): Observable<MarcaVehiculo> {
    return this.http.get<MarcaVehiculo>(`${this.apiUrl}/${id}`);
  }

  create(entity: MarcaVehiculo): Observable<MarcaVehiculo> {
    return this.http.post<MarcaVehiculo>(this.apiUrl, entity);
  }

  update(id: number, entity: MarcaVehiculo): Observable<MarcaVehiculo> {
    return this.http.put<MarcaVehiculo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
