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
export class AuthInterceptor implements HttpInterceptor {
  // Lista de rutas públicas que no necesitan token
  private publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/v1/public',
    '/api/v1/master-data',
    '/api/v1/public/test',
    '/api/v1/public/validacion',
    '/api/v1/public/generos',
    '/api/v1/public/estado-civil'
  ];

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    const isPublicRoute = this.publicRoutes.some(url => request.url.includes(url));
    
    console.log(`[AuthInterceptor] URL: ${request.url}, Es ruta pública: ${isPublicRoute}`);    // Evitamos añadir headers de Content-Type para solicitudes multipart
    const isFileUpload = request.url.includes('/upload') && request.method === 'POST';
    
    if (!isPublicRoute && token) {
      console.log('[AuthInterceptor] Añadiendo token a la solicitud');
      
      const headers: any = {
        Authorization: `Bearer ${token}`
      };
      
      // No añadimos Content-Type para subidas de archivos
      if (!isFileUpload) {
        headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json';
      }
      
      request = request.clone({ setHeaders: headers });
    } else {
      console.log('[AuthInterceptor] Ruta pública o no hay token disponible');
      
      if (!isFileUpload) {
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
        console.error('[AuthInterceptor] Error:', error.status, 'URL:', request.url);
        
        if (error.status === 401) {
          if (!isPublicRoute) {
            console.log('[AuthInterceptor] Error 401 en ruta protegida - redirigiendo a login');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else {
            console.log('[AuthInterceptor] Error 401 en ruta pública - continuando...');
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}
