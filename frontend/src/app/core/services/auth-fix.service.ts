// Archivo para solucionar problemas de autenticación
// Copiar este código en el servicio auth.service.ts o importarlo

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.development';

// Interfaces existentes
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userDetail: {
    id: number;
    name: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthFixService {
  private apiUrl: string;
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Ruta alternativa para autenticación
    this.apiUrl = `${environment.apiUrl}/auth-simple`;
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Intentando login con ruta alternativa:', `${this.apiUrl}/login`);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response?.token) {
            localStorage.setItem(this.tokenKey, response.token);
            if (response.userDetail) {
              localStorage.setItem(this.userKey, JSON.stringify(response.userDetail));
            }
            console.log('Login exitoso con servicio alternativo, token almacenado');
          }
        }),
        catchError(error => {
          console.error('Error en login alternativo:', error);
          return throwError(() => error);
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
  
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error al parsear datos del usuario:', e);
        return null;
      }
    }
    return null;
  }
}
