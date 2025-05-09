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

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetResponse {
  mensaje: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // URL estandarizada usando environment.apiUrl
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'current_user';

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Intentando iniciar sesión con el backend en:', `${this.apiUrl}/login`);
    
    // Determina si es correo o nombre de usuario
    const isEmail = credentials.username.includes('@');
    
    // Prepara el cuerpo de la solicitud según el tipo de identificación
    const requestBody = isEmail 
      ? { email: credentials.username, password: credentials.password } 
      : { username: credentials.username, password: credentials.password };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, requestBody).pipe(
      tap(response => {
        console.log('Respuesta de autenticación:', response);
        this.setSession(response);
      }),
      catchError(error => {
        console.error('Error de autenticación:', error);
        
        // Fallback para credenciales específicas (eliminar en producción)
        if ((credentials.username === 'javier' || credentials.username === 'javierangelmsn@outlook.es') 
            && credentials.password === '12345') {
          console.log('Usando autenticación simulada como fallback');
          const mockResponse: AuthResponse = {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphdmllciBBZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            refreshToken: 'mock-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 86400,
            userDetail: {
              id: 1,
              name: 'Javier',
              username: 'javier',
              email: 'javierangelmsn@outlook.es',
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
    console.log('Intentando iniciar sesión con el backend en:', `${this.apiUrl}/login`);
    
    // Primero intenta con el backend real
    return this.login(credentials).pipe(
      catchError(error => {
        console.log('Error al iniciar sesión con el backend, usando credenciales fijas:', error);
        
        // Fallback para credenciales específicas
        if ((credentials.username === 'javier' || credentials.username === 'javierangelmsn@outlook.es') 
            && credentials.password === '12345') {
          const mockResponse: AuthResponse = {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphdmllciBBZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            refreshToken: 'mock-refresh-token',
            tokenType: 'Bearer',
            expiresIn: 86400,
            userDetail: {
              id: 1,
              name: 'Javier',
              username: 'javier',
              email: 'javierangelmsn@outlook.es',
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

  changePassword(passwordData: PasswordChangeRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, passwordData).pipe(
      catchError(error => {
        console.error('Error al cambiar la contraseña:', error);
        let errorMsg = 'Error al cambiar la contraseña';
        
        // Si hay un mensaje de error desde el servidor, usarlo
        if (error.error && typeof error.error === 'string') {
          errorMsg = error.error;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  /**
   * Solicita un token para restablecer la contraseña
   * @param email Correo electrónico del usuario
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      catchError(error => {
        console.error('Error al solicitar restablecimiento de contraseña:', error);
        let errorMsg = 'Error al solicitar restablecimiento de contraseña';
        
        if (error.error && typeof error.error === 'string') {
          errorMsg = error.error;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  /**
   * Valida si un token de restablecimiento es válido
   * @param token Token a validar
   */
  validateResetToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reset-password/validate?token=${token}`).pipe(
      catchError(error => {
        console.error('Error al validar token:', error);
        return throwError(() => new Error('Token no válido o expirado'));
      })
    );
  }

  /**
   * Restablece la contraseña usando un token
   * @param passwordReset Datos para el restablecimiento
   */
  resetPassword(passwordReset: PasswordReset): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, passwordReset).pipe(
      catchError(error => {
        console.error('Error al restablecer la contraseña:', error);
        let errorMsg = 'Error al restablecer la contraseña';
        
        if (error.error && typeof error.error === 'string') {
          errorMsg = error.error;
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // Resto del código sin cambios
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      console.log('No hay token almacenado');
      return false;
    }
    
    // Verificar si el token está expirado
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convertir a milisegundos
      if (Date.now() >= expirationTime) {
        console.log('Token expirado');
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error al validar token:', error);
      this.logout();
      return false;
    }
  }

  getUserRoles(): string[] {
    try {
      const userData = localStorage.getItem(this.userKey);
      if (!userData) {
        console.log('No hay datos de usuario almacenados');
        return [];
      }
      const user = JSON.parse(userData);
      return user.roles || [];
    } catch (error) {
      console.error('Error al obtener roles:', error);
      return [];
    }
  }

  hasRole(role: string): boolean {
    const roles = this.getUserRoles();
    const hasRole = roles.includes(role);
    console.log(`Verificando rol ${role}: ${hasRole}`);
    return hasRole;
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