import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl: string;
  private tokenKey = 'auth_token';
  private userKey = 'current_user';  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.apiUrl = `${environment.apiUrl}/auth`;
    console.log('AuthService initialized with API URL:', this.apiUrl);
  }
    login(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Intentando iniciar sesión en:', `${this.apiUrl}/login`);
    
    // Definir el objeto de solicitud con tipado adecuado
    const loginRequest: {username?: string; email?: string; password: string} = {
      password: credentials.password
    };
    
    // Determinar si parece ser un correo electrónico o un nombre de usuario
    const isEmail = credentials.username.includes('@');
    
    // Asignar el identificador al campo apropiado (username o email)
    if (isEmail) {
      loginRequest.email = credentials.username;
    } else {
      loginRequest.username = credentials.username;
    }
    
    console.log('Enviando login request:', JSON.stringify(loginRequest));
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, loginRequest, { headers })
      .pipe(
        tap(response => {
          if (response?.token) {
            localStorage.setItem(this.tokenKey, response.token);
            if (response.userDetail) {
              localStorage.setItem(this.userKey, JSON.stringify(response.userDetail));
            }
            console.log('Login exitoso, token almacenado');
          }
        }),
        catchError(error => {
          console.error('Error en login:', error);
          if (error.status === 401) {
            console.error('Credenciales inválidas');
          }
          return throwError(() => error);
        })
      );
  }

  // Método para login con credenciales predeterminadas (para desarrollo)
  loginWithFixedCredentials(credentials: LoginCredentials): Observable<AuthResponse> {
    console.log('Usando login con credenciales fijas para desarrollo local');
    return this.login(credentials);
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
  
  // Obtiene los datos del usuario autenticado
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

  // Solicita un token de restablecimiento de contraseña
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email })
      .pipe(
        catchError(error => {
          console.error('Error al solicitar restablecimiento de contraseña:', error);
          return throwError(() => new Error('Error al solicitar restablecimiento de contraseña. Por favor, intente nuevamente.'));
        })
      );
  }

  // Valida un token de restablecimiento
  validateResetToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reset-password/validate`, { params: { token } })
      .pipe(
        catchError(error => {
          console.error('Error al validar token:', error);
          return throwError(() => new Error('El token no es válido o ha expirado.'));
        })
      );
  }

  // Restablece la contraseña con un nuevo valor
  resetPassword(resetData: PasswordReset): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, resetData)
      .pipe(
        catchError(error => {
          console.error('Error al restablecer contraseña:', error);
          return throwError(() => new Error('Error al restablecer contraseña. Por favor, intente nuevamente.'));
        })
      );
  }
}
