import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {  // Lista de rutas públicas que no necesitan token
  private readonly publicRoutes: string[] = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/validate-reset-token',
    '/api/auth/reset-password',
    '/api/v1/public',
    '/api/v1/master-data',
    '/api/v1/public/test',
    '/api/v1/public/validacion',
    '/api/v1/public/generos',
    '/api/v1/public/estado-civil',
    '/api/files/logos',
    '/api/files/upload/logos',
    // Health check endpoint used by dev diagnostics script; must not trigger auth flows
    '/api/health'
  ];

  constructor(private authService: AuthService, private router: Router) {}
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    const isPublicRoute = this.publicRoutes.some((url: string) => request.url.includes(url));
    // Detectar subida de archivos de forma genérica: si el body es FormData no forzar Content-Type JSON
    const isFileUpload = request.body instanceof FormData;
    // Detectar descargas de archivos o respuestas binarias: no forzar headers JSON
    const isFileEndpoint = request.url.includes('/api/files/');
    const expectsBlob = (request as any).responseType === 'blob' || isFileEndpoint;
    
    console.log(`[AuthInterceptor] URL: ${request.url}, Es ruta pública: ${isPublicRoute}, Es subida de archivo: ${isFileUpload}`);
    
    // Si es una ruta pública no añadimos el token
    if (!isPublicRoute) {
      if (token) {
        console.log('[AuthInterceptor] Añadiendo token a la solicitud');
        
        // Preparar los headers según el tipo de petición
        let headers: { [key: string]: string } = {
          'Authorization': `Bearer ${token}`
        };
        
        // Para peticiones que no son de archivos, añadimos los headers de contenido
        if (!isFileUpload && !expectsBlob) {
          headers['Content-Type'] = 'application/json';
          headers['Accept'] = 'application/json';
        }
        
        // Clonar la petición con los headers correspondientes
        request = request.clone({
          setHeaders: headers
        });
      }
    } else {
      console.log('[AuthInterceptor] Ruta pública, no se requiere token');
      
      // Para peticiones que no son de archivos en rutas públicas
      if (!isFileUpload && !expectsBlob) {
        request = request.clone({
          setHeaders: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Solo loggear errores reales (no status 200)
        if (error.status !== 200) {
          console.error('[AuthInterceptor] Error:', error.status, 'URL:', request.url);
        }
        
        if (error.status === 403) {
          console.error('[AuthInterceptor] Error de permisos:', error.error?.message || 'Acceso denegado');
          if (isFileUpload) {
            console.error('[AuthInterceptor] Error al subir archivo: Permisos insuficientes');
          }
        }
        
        if (error.status === 401) {
          if (!isPublicRoute) {
            console.log('[AuthInterceptor] Error 401 en ruta protegida - redirigiendo a login');
            this.authService.clearSession();
            this.router.navigate(['/auth/usuario-login']);
          } else {
            console.log('[AuthInterceptor] Error 401 en ruta pública - continuando...');
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}
