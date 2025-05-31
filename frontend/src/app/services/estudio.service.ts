import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Estudio } from '../models/estudio.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class EstudioService {  // URL estandarizada usando ApiUrlService
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/estudios');
    console.log('URL del servicio de estudio (actualizado con /api/):', this.apiUrl);
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