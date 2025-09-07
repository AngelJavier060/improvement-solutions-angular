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
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  private readonly baseUrl = environment.apiUrl;
  
  constructor() {
    console.log('[ApiUrlInterceptor] Inicializado con baseUrl:', this.baseUrl);
  }
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Si la URL ya es absoluta, no la modificamos
    if (request.url.startsWith('http')) {
      return next.handle(request);
    }

    // Procesar la URL relativa
    let url = request.url;
    
    // Si no empieza con /api, añadirlo
    if (!url.startsWith('/api')) {
      url = '/api' + (url.startsWith('/') ? '' : '/') + url;
    }
    
    // Construir la URL completa
    const apiUrl = `${this.baseUrl}${url}`;
    console.log(`[ApiUrlInterceptor] URL transformada: ${url}`);
    
    const apiRequest = request.clone({
      url: apiUrl
    });

    return next.handle(apiRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Solo loggear errores reales (no status 200)
        if (error.status !== 200) {
          console.log(`[ApiUrlInterceptor] Error ${error.status}: ${error.message || 'Unknown error'}`);
        }
        return throwError(() => error);
      })
    );
  }
}
