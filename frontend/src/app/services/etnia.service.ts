import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Etnia } from '../models/etnia.model';

@Injectable({
  providedIn: 'root'
})
export class EtniaService {
  private apiUrl = `${environment.apiUrl}/api/v1/public/etnias`;

  constructor(private http: HttpClient) {
    console.log('URL del servicio de etnias (estandarizada):', this.apiUrl);
  }

  getEtnias(): Observable<Etnia[]> {
    console.log('Solicitando etnias desde:', this.apiUrl);
    return this.http.get<Etnia[]>(this.apiUrl);
  }

  getEtnia(id: number): Observable<Etnia> {
    return this.http.get<Etnia>(`${this.apiUrl}/${id}`);
  }

  createEtnia(etnia: Etnia): Observable<Etnia> {
    console.log('Enviando etnia al backend:', etnia);
    console.log('URL de envío:', this.apiUrl);
    return this.http.post<Etnia>(this.apiUrl, etnia);
  }

  updateEtnia(id: number, etnia: Etnia): Observable<Etnia> {
    return this.http.put<Etnia>(`${this.apiUrl}/${id}`, etnia);
  }

  deleteEtnia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
