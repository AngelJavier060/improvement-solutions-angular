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
export class AuthInterceptor implements HttpInterceptor {  private publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/public',
    '/api/v1/master-data',
    '/api/auth/login'
  ];

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isPublicRoute = this.publicRoutes.some(route => request.url.includes(route));
    
    // Clonar la solicitud y agregar headers básicos
    let modifiedRequest = request.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Agregar el token de autorización si no es una ruta pública
    if (!isPublicRoute && this.authService.getToken()) {
      modifiedRequest = modifiedRequest.clone({
        setHeaders: {
          ...modifiedRequest.headers,
          Authorization: `Bearer ${this.authService.getToken()}`
        }
      });
    }    return next.handle(modifiedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error en interceptor:', error.status, 'URL:', request.url);
        console.error('Response error:', error);
        
        if (error.status === 401) {
          if (!isPublicRoute) {
            console.log('Error 401 en ruta protegida - redirigiendo a login');
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          } else {
            console.log('Error 401 en ruta pública - continuando...');
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}
