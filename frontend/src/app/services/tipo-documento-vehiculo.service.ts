import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoDocumentoVehiculo } from '../models/tipo-documento-vehiculo.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoVehiculoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/tipo-documento-vehiculos');
  }

  getAll(): Observable<TipoDocumentoVehiculo[]> {
    return this.http.get<TipoDocumentoVehiculo[]>(this.apiUrl);
  }

  getById(id: number): Observable<TipoDocumentoVehiculo> {
    return this.http.get<TipoDocumentoVehiculo>(`${this.apiUrl}/${id}`);
  }

  create(entity: TipoDocumentoVehiculo): Observable<TipoDocumentoVehiculo> {
    return this.http.post<TipoDocumentoVehiculo>(this.apiUrl, entity);
  }

  update(id: number, entity: TipoDocumentoVehiculo): Observable<TipoDocumentoVehiculo> {
    return this.http.put<TipoDocumentoVehiculo>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
