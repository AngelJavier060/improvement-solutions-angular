import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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
    operationalCapabilities?: {
      canView: boolean;
      canDownload: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canUpload: boolean;
      canOvertime: boolean;
      canVacations: boolean;
      canTimeOff: boolean;
      canWriteOps: boolean;
      writeLockedByRole: boolean;
    };
    businesses?: {
      id: number;
      name: string;
      ruc: string;
      email: string;
      phone: string;
    }[];
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

export interface PasswordResetRequestResult {
  success: boolean;
  link?: string; // dev helper link if backend includes it in SuccessResponse.data
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
    this.apiUrl = `${environment.apiUrl}/api/auth`;
    console.log('AuthService inicializado con URL de API:', this.apiUrl);
  }

  loginWithFixedCredentials(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.login(credentials);
  }

  login(username: string, password: string): Observable<AuthResponse>;
  login(credentials: LoginCredentials): Observable<AuthResponse>;
  login(usernameOrCredentials: string | LoginCredentials, password?: string): Observable<AuthResponse> {
    const url = `${this.apiUrl}/login`;
    console.log('Intentando iniciar sesión en:', url);
    
    // Manejar sobrecarga de métodos
    let credentials: LoginCredentials;
    if (typeof usernameOrCredentials === 'string') {
      credentials = { username: usernameOrCredentials, password: password! };
    } else {
      credentials = usernameOrCredentials;
    }
    
    // Determinar si el username es realmente un email
    const isEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(credentials.username);
    
    // Preparar la solicitud según si es email o username
    const loginRequest = isEmail 
      ? {
          email: credentials.username,
          password: credentials.password
        }
      : {
          username: credentials.username,
          password: credentials.password
        };
    
    console.log('Enviando login request para usuario:', credentials.username);
    
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
            errorMessage = error.error?.message || 'Usuario o contraseña incorrectos';
          } else if (error.status === 403) {
            errorMessage = error.error?.message || 'Usuario inactivo o sin permisos';
          } else if (error.status === 404) {
            errorMessage = error.error?.message
              || 'Usuario no encontrado. Si es trabajador, cree primero su cuenta portal en Talento Humano (candado).';
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
    this.router.navigate(['/']);
  }

  /**
   * Clear session without navigation. Useful when entering login views
   * to ensure a clean state without bouncing the user to Home.
   */
  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAuthenticated(): boolean {
    return this.isLoggedIn();
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
    return this.http.post<any>(`${this.apiUrl}/reset-password`, resetData)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error al restablecer contraseña:', error);
          return throwError(() => error);
        })
      );
  }

  requestPasswordReset(email: string): Observable<PasswordResetRequestResult> {
    const request: PasswordResetRequest = { email };
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, request)
      .pipe(
        map((resp: any) => ({
          success: true,
          link: typeof resp?.data === 'string' ? resp.data : undefined
        })),
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
        return this.normalizeRoles(user.roles || []);
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

  /**
   * Puede crear/editar/eliminar en módulos /usuario/{ruc}/...
   * Usa la matriz de capacidades del login (Super siempre; Admin/Gestor/Supervisor según flags).
   */
  canWrite(): boolean {
    const roles = this.getUserRoles();
    if (roles.includes('ROLE_SUPER_ADMIN')) {
      return true;
    }
    const caps = this.getCurrentUser()?.operationalCapabilities;
    if (caps && typeof caps.canWriteOps === 'boolean') {
      return !!caps.canWriteOps;
    }
    // Fallback si sesión antigua sin matriz
    return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_MANAGER');
  }

  /** Registrar solicitudes de horas extras (matriz). */
  canOvertime(): boolean {
    const roles = this.getUserRoles();
    if (roles.includes('ROLE_SUPER_ADMIN')) return true;
    const caps = this.getCurrentUser()?.operationalCapabilities;
    if (caps && typeof caps.canOvertime === 'boolean') return !!caps.canOvertime;
    return this.canWrite();
  }

  /** Registrar solicitudes de vacaciones (matriz). */
  canVacations(): boolean {
    const roles = this.getUserRoles();
    if (roles.includes('ROLE_SUPER_ADMIN')) return true;
    const caps = this.getCurrentUser()?.operationalCapabilities;
    if (caps && typeof caps.canVacations === 'boolean') return !!caps.canVacations;
    return this.canWrite();
  }

  /** Registrar solicitudes de permisos (matriz). */
  canTimeOff(): boolean {
    const roles = this.getUserRoles();
    if (roles.includes('ROLE_SUPER_ADMIN')) return true;
    const caps = this.getCurrentUser()?.operationalCapabilities;
    if (caps && typeof caps.canTimeOff === 'boolean') return !!caps.canTimeOff;
    return this.canWrite();
  }

  /**
   * Puede consultar módulos de empresa (incluye Supervisor y Gestor).
   * Trabajador (ROLE_EMPLOYEE) usa su portal propio, no esto.
   */
  canReadCompany(): boolean {
    const roles = this.getUserRoles();
    return this.canWrite()
      || roles.includes('ROLE_USER')
      || roles.includes('ROLE_MANAGER');
  }

  /** Supervisor: solo ver/descargar (ROLE_USER sin escritura). */
  isConsultaUser(): boolean {
    return this.hasRole('ROLE_USER') && !this.canWrite();
  }

  /** Gestor operativo (escritura sin ser Admin de parámetros). */
  isGestor(): boolean {
    return this.hasRole('ROLE_MANAGER') && !this.hasRole('ROLE_ADMIN') && !this.hasRole('ROLE_SUPER_ADMIN');
  }

  /**
   * Destino post-login según rol Y puerta de acceso (intranet).
   * - entry 'admin'  → panel de parámetros / plataforma (NO welcome)
   * - entry 'user'   → módulos operativos /usuario/{ruc}/welcome
   */
  resolvePostLoginUrl(
    rolesInput?: string[] | null,
    businessesInput?: Array<{ id?: number; ruc?: string }> | null,
    entry: 'admin' | 'user' = 'user'
  ): string {
    const roles = this.normalizeRoles(rolesInput ?? this.getUserRoles());
    const user = this.getCurrentUser();
    const businesses = businessesInput ?? user?.businesses ?? [];
    const ruc = businesses?.[0]?.ruc ? String(businesses[0].ruc) : null;
    const companyId = businesses?.[0]?.id != null ? Number(businesses[0].id) : null;

    const isSuper = roles.includes('ROLE_SUPER_ADMIN');
    const isAdmin = roles.includes('ROLE_ADMIN');
    const isEmployee = roles.includes('ROLE_EMPLOYEE') && !isAdmin && !isSuper;

    if (entry === 'admin') {
      // Puerta Administrador: parámetros / plataforma
      if (isSuper) {
        return '/dashboard/admin';
      }
      if (isAdmin && companyId) {
        return `/dashboard/admin/empresas/admin/${companyId}`;
      }
      if (isAdmin) {
        return '/dashboard/admin';
      }
      // Cuenta sin privilegio admin: no pertenece a esta puerta
      return '__FORBIDDEN_ADMIN_ENTRY__';
    }

    // Puerta Usuario: módulos operativos de la empresa
    if (isEmployee) {
      return '/dashboard/empleado';
    }
    if (isSuper) {
      // Super no opera por esta puerta
      return '/dashboard/admin';
    }
    if (ruc) {
      return `/usuario/${ruc}/welcome`;
    }
    return '/';
  }

  /** true si la cuenta puede usar la puerta Administrador de la intranet */
  canUseAdminEntry(rolesInput?: string[] | null): boolean {
    const roles = this.normalizeRoles(rolesInput ?? this.getUserRoles());
    return roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_ADMIN');
  }

  normalizeRoles(roles: any[] | null | undefined): string[] {
    if (!Array.isArray(roles)) return [];
    return roles
      .map(r => (typeof r === 'string' ? r : r?.name || r?.authority || ''))
      .filter((r: string) => !!r);
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
