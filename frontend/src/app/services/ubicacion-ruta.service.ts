import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UbicacionRuta } from '../models/ubicacion-ruta.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class UbicacionRutaService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/ubicacion-rutas');
  }

  getAll(): Observable<UbicacionRuta[]> {
    return this.http.get<UbicacionRuta[]>(this.apiUrl);
  }

  getById(id: number): Observable<UbicacionRuta> {
    return this.http.get<UbicacionRuta>(`${this.apiUrl}/${id}`);
  }

  create(entity: UbicacionRuta): Observable<UbicacionRuta> {
    return this.http.post<UbicacionRuta>(this.apiUrl, entity);
  }

  update(id: number, entity: UbicacionRuta): Observable<UbicacionRuta> {
    return this.http.put<UbicacionRuta>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
