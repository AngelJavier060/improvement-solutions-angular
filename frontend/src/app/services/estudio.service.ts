import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Estudio } from '../models/estudio.model';

@Injectable({
  providedIn: 'root'
})
export class EstudioService {
  // URL corregida para usar el context-path configurado en el backend
  private apiUrl = 'http://localhost:8080/api/v1/estudios';

  constructor(private http: HttpClient) {
    console.log('URL del servicio de estudio (corregida):', this.apiUrl);
  }

  getEstudios(): Observable<Estudio[]> {
    console.log('Solicitando estudios desde:', this.apiUrl);
    return this.http.get<Estudio[]>(this.apiUrl);
  }

  getEstudio(id: number): Observable<Estudio> {
    return this.http.get<Estudio>(`${this.apiUrl}/${id}`);
  }

  createEstudio(estudio: Estudio): Observable<Estudio> {
    console.log('Enviando estudio al backend:', estudio);
    console.log('URL de envío:', this.apiUrl);
    return this.http.post<Estudio>(this.apiUrl, estudio);
  }

  updateEstudio(id: number, estudio: Estudio): Observable<Estudio> {
    return this.http.put<Estudio>(`${this.apiUrl}/${id}`, estudio);
  }

  deleteEstudio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}