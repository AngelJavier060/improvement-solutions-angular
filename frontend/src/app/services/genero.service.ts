import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Genero } from '../models/genero.model';
import { AuthService } from '../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GeneroService {
  // URL corregida usando el context-path /api/v1 configurado en el backend
  private apiUrl = 'http://localhost:8080/api/v1/generos';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { 
    console.log('URL del servicio de género (corregida):', this.apiUrl);
  }

  // Método para obtener los headers con el token JWT
  private getHttpOptions() {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  getGeneros(): Observable<Genero[]> {
    console.log('Obteniendo géneros desde:', this.apiUrl);
    return this.http.get<Genero[]>(this.apiUrl, this.getHttpOptions());
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