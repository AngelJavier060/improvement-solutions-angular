import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ColorVehiculo } from '../models/color-vehiculo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ColorVehiculoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/color-vehiculos');
  }

  getAll(): Observable<ColorVehiculo[]> {
    return this.http.get<ColorVehiculo[]>(this.apiUrl);
  }

  getById(id: number): Observable<ColorVehiculo> {
    return this.http.get<ColorVehiculo>(`${this.apiUrl}/${id}`);
  }

  create(entity: ColorVehiculo): Observable<ColorVehiculo> {
    return this.http.post<ColorVehiculo>(this.apiUrl, entity);
  }

  update(id: number, entity: ColorVehiculo): Observable<ColorVehiculo> {
    return this.http.put<ColorVehiculo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
