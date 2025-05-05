import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

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
    'api/v1/generos'
  ];

  constructor(private authService: AuthService) {}

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
    
    return next.handle(request);
  }
}