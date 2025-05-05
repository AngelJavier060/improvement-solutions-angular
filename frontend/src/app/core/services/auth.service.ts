import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

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
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth/login`;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Intentando iniciar sesión con el backend real en:', this.apiUrl);
    return this.http.post<AuthResponse>(this.apiUrl, credentials).pipe(
      tap(response => {
        console.log('Respuesta de autenticación:', response);
        this.setSession(response);
      }),
      catchError(error => {
        console.error('Error de autenticación:', error);
        // Si falla la autenticación con el backend, usar credenciales simuladas como fallback
        if (credentials.username === 'javier' && credentials.password === '12345') {
          console.log('Usando autenticación simulada como fallback');
          const mockResponse: AuthResponse = {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphdmllciBBZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            refreshToken: 'mock-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 86400,
            userDetail: {
              id: 1,
              name: 'Javier Admin',
              username: 'javier',
              email: 'javier@example.com',
              roles: ['ROLE_ADMIN'],
              permissions: []
            }
          };
          
          this.setSession(mockResponse);
          return of(mockResponse);
        }
        return throwError(() => new Error('Credenciales incorrectas. Por favor, inténtelo nuevamente.'));
      })
    );
  }

  loginWithFixedCredentials(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Usando credenciales fijas para iniciar sesión');
    if (credentials.username === 'javier' && credentials.password === '12345') {
      const mockResponse: AuthResponse = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphdmllciBBZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 86400,
        userDetail: {
          id: 1,
          name: 'Javier Admin',
          username: 'javier',
          email: 'javier@example.com',
          roles: ['ROLE_ADMIN'],
          permissions: []
        }
      };
      
      this.setSession(mockResponse);
      return of(mockResponse);
    }
    
    return throwError(() => new Error('Credenciales incorrectas. Por favor, inténtelo nuevamente.'));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    return !!token;
  }

  getUserRoles(): string[] {
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      const user = JSON.parse(userData);
      return user.roles || [];
    }
    return [];
  }

  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles.includes(role);
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResult.token);
    localStorage.setItem(this.refreshTokenKey, authResult.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(authResult.userDetail));
  }
}