import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoCivil } from '../models/estado-civil.model';

@Injectable({
  providedIn: 'root'
})
export class EstadoCivilService {
  // URL actualizada para usar la ruta pública (sin autenticación)
  private apiUrl = 'http://localhost:8080/api/v1/public/estado-civil';

  constructor(private http: HttpClient) { 
    console.log('URL del servicio de estado civil actualizado:', this.apiUrl);
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