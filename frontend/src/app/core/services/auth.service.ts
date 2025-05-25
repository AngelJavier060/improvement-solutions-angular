import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

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

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl: string;
  private tokenKey = 'auth_token';
  private userKey = 'current_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.apiUrl = '/api/auth';
    console.log('AuthService inicializado con URL de API:', this.apiUrl);
  }

  loginWithFixedCredentials(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.login(credentials);
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const url = `${this.apiUrl}/login`;
    console.log('Intentando iniciar sesión en:', url);
    
    // Definir el objeto de solicitud con tipado adecuado
    const loginRequest: {username?: string; email?: string; password: string} = {
      password: credentials.password
    };
    
    // Determinar si parece ser un correo electrónico o un nombre de usuario
    if (credentials.username.includes('@')) {
      loginRequest.email = credentials.username;
    } else {
      loginRequest.username = credentials.username;
    }
    
    console.log('Enviando login request:', JSON.stringify(loginRequest));
    
    return this.http.post<AuthResponse>(url, loginRequest)
      .pipe(
        tap(response => {
          if (response?.token) {
            localStorage.setItem(this.tokenKey, response.token);
            if (response.userDetail) {
              localStorage.setItem(this.userKey, JSON.stringify(response.userDetail));
            }
          }
        }),
        catchError((error: any) => {
          console.error('Error en autenticación:', error);
          let errorMessage = 'Error de autenticación';
          
          if (error.status === 0) {
            errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet o que el servidor esté activo.';
          } else if (error.status === 401) {
            errorMessage = 'Usuario o contraseña incorrectos';
          } else if (error.status === 403) {
            errorMessage = 'Usuario inactivo o sin permisos';
          } else if (error.status === 404) {
            errorMessage = 'Servicio de autenticación no encontrado';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          return throwError(() => errorMessage);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  validateResetToken(token: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/validate-reset-token`, { token })
      .pipe(
        catchError(error => {
          console.error('Error validando token de reset:', error);
          return throwError(() => error);
        })
      );
  }

  resetPassword(resetData: PasswordReset): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/reset-password`, resetData)
      .pipe(
        catchError(error => {
          console.error('Error al restablecer contraseña:', error);
          return throwError(() => error);
        })
      );
  }

  requestPasswordReset(email: string): Observable<boolean> {
    const request: PasswordResetRequest = { email };
    return this.http.post<boolean>(`${this.apiUrl}/forgot-password`, request)
      .pipe(
        catchError(error => {
          console.error('Error al solicitar restablecimiento de contraseña:', error);
          return throwError(() => error);
        })
      );
  }
  
  getUserRoles(): string[] {
    const userData = localStorage.getItem(this.userKey);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.roles || [];
      } catch (e) {
        console.error('Error al parsear datos del usuario:', e);
        return [];
      }
    }
    return [];
  }

  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    return roles.includes(role);
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
