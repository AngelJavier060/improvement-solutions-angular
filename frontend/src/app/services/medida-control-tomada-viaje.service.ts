import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedidaControlTomadaViaje } from '../models/medida-control-tomada-viaje.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({ providedIn: 'root' })
export class MedidaControlTomadaViajeService {
  private readonly apiUrl: string;

  constructor(private http: HttpClient, apiUrlService: ApiUrlService) {
    this.apiUrl = apiUrlService.getUrl('/api/public/medidas-control-tomadas-viaje');
  }

  getAll(): Observable<MedidaControlTomadaViaje[]> {
    return this.http.get<MedidaControlTomadaViaje[]>(this.apiUrl);
  }

  getById(id: number): Observable<MedidaControlTomadaViaje> {
    return this.http.get<MedidaControlTomadaViaje>(`${this.apiUrl}/${id}`);
  }

  create(entity: MedidaControlTomadaViaje): Observable<MedidaControlTomadaViaje> {
    return this.http.post<MedidaControlTomadaViaje>(this.apiUrl, entity);
  }

  update(id: number, entity: MedidaControlTomadaViaje): Observable<MedidaControlTomadaViaje> {
    return this.http.put<MedidaControlTomadaViaje>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
