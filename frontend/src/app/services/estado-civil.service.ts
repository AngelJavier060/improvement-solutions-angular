import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoCivil } from '../models/estado-civil.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class EstadoCivilService {  // URL estandarizada usando ApiUrlService
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) { 
    this.apiUrl = this.apiUrlService.getUrl('/api/public/estado-civil');
    console.log('URL del servicio de estado civil (actualizado con /api/):', this.apiUrl);
  }

  getEstadosCiviles(): Observable<EstadoCivil[]> {
    console.log('Solicitando estados civiles desde:', this.apiUrl);
    return this.http.get<EstadoCivil[]>(this.apiUrl);
  }

  getEstadoCivil(id: number): Observable<EstadoCivil> {
    return this.http.get<EstadoCivil>(`${this.apiUrl}/${id}`);
  }

  createEstadoCivil(estadoCivil: EstadoCivil): Observable<EstadoCivil> {
    console.log('Enviando estado civil al backend:', estadoCivil);
    console.log('URL de envío:', this.apiUrl);
    return this.http.post<EstadoCivil>(this.apiUrl, estadoCivil);
  }

  updateEstadoCivil(id: number, estadoCivil: EstadoCivil): Observable<EstadoCivil> {
    return this.http.put<EstadoCivil>(`${this.apiUrl}/${id}`, estadoCivil);
  }

  deleteEstadoCivil(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}