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
  private publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/api/v1/public',
    '/api/v1/auth'
  ];

  constructor(private authService: AuthService, private router: Router) {}
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {    // Verificar si la URL de la solicitud está en la lista de rutas públicas o contiene /public/
    const isPublicRoute = this.publicRoutes.some(url => request.url.includes(url)) || 
                         request.url.includes('/public/') || 
                         request.url.includes('/api/v1/public/');
    
    console.log(`Solicitud a: ${request.url}, ¿Es ruta pública?: ${isPublicRoute}`);
    
    // Solo añadir el token si no es una ruta pública y hay un token disponible
    if (!isPublicRoute && this.authService.getToken()) {
      const token = this.authService.getToken();
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Token añadido a la solicitud');
    } else {
      console.log('No se añadió token a ruta pública: ' + request.url);
      // Para rutas públicas, asegurar que no se envíe ningún header de autorización
      // Esto es importante para evitar enviar tokens parciales o inválidos
      request = request.clone({
        headers: request.headers.delete('Authorization')
      });
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('Error en interceptor:', error.status, 'URL:', request.url);
        
        // Solo manejar errores 401 si no es una ruta pública
        if (error.status === 401 && !isPublicRoute) {
          console.log('Error 401 en ruta protegida');
          // No redirigir automáticamente, dejar que el guard maneje la redirección
          this.authService.logout();
        } else if (error.status === 401 && isPublicRoute) {
          console.log('Error 401 en ruta pública - ignorando autenticación');
          // Ignorar errores de autenticación en rutas públicas
        }
        return throwError(() => error);
      })
    );
  }
}