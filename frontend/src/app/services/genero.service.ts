import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Genero } from '../models/genero.model';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeneroService {  // URL estandarizada usando environment.apiUrl
  private apiUrl = `${environment.apiUrl}/api/v1/public/generos`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
    console.log('URL del servicio de género (estandarizada):', this.apiUrl);
  }

  // Método para obtener los headers con el token JWT
  private getHttpOptions() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };  }
  getGeneros(): Observable<Genero[]> {
    console.log('Obteniendo géneros desde:', this.apiUrl);
    // Hacemos la solicitud con configuración explícita sin autorización
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
      // Sin token de autorización
    });
    return this.http.get<Genero[]>(this.apiUrl, { headers });
  }

  getGenero(id: number): Observable<Genero> {
    return this.http.get<Genero>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }

  createGenero(genero: Genero): Observable<Genero> {
    console.log('Creando género en:', this.apiUrl);
    return this.http.post<Genero>(this.apiUrl, genero, this.getHttpOptions());
  }

  updateGenero(id: number, genero: Genero): Observable<Genero> {
    return this.http.put<Genero>(`${this.apiUrl}/${id}`, genero, this.getHttpOptions());
  }

  deleteGenero(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getHttpOptions());
  }
}