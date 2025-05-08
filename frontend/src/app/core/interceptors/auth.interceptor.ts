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
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/api/v1/generos',
    '/generos',
    'localhost:8080/api/v1/generos',
    'api/v1/generos',
    'api/v1/estudios',
    'http://localhost:8080/api/v1/estudios',
    'api/v1/estado-civil',
    'http://localhost:8080/api/v1/estado-civil',
    'api/v1/public/estado-civil',
    'http://localhost:8080/api/v1/public/estado-civil'
  ];

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Verificar si la URL de la solicitud está en la lista de rutas públicas
    const isPublicRoute = this.publicRoutes.some(url => request.url.includes(url));
    
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
      console.log('No se añadió token (ruta pública o no hay token)');
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si recibimos un 401 Unauthorized, redirigir al login
        if (error.status === 401) {
          console.log('Error 401: Sesión expirada o no autorizada');
          this.authService.logout();
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => error);
      })
    );
  }
}