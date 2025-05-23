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

/**
 * Interceptor para manejar problemas de URL y CORS.
 * Asegura que no se dupliquen los prefijos /api/v1 en las solicitudes.
 */
@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  constructor() {}

  /**
   * Extrae la ruta de una URL completa, removiendo el dominio y los parámetros de consulta
   */
  private extractPath(url: string): string {
    try {
      if (url.startsWith('http')) {
        return new URL(url).pathname;
      }
      return url.split('?')[0];
    } catch (e) {
      console.error('Error al extraer path de URL:', e);
      return url;
    }
  }
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Si la URL ya tiene el prefijo adecuado, no hacemos nada
    const url = request.url;
    const apiUrl = environment.apiUrl;
    const contextPath = '/api/v1';
    
    console.log(`[ApiUrlInterceptor] Procesando URL: ${url}`);    // Comprobar si la URL es absoluta y ya contiene el host definido en environment.apiUrl
    if (url.startsWith('http')) {
      const path = this.extractPath(url);
      
      // No modificar URLs que apuntan a la autenticación o endpoints públicos
      if (path.includes('/auth/') || path.includes('/public/') || path.includes('/master-data/')) {
        console.log(`[ApiUrlInterceptor] URL de autenticación o pública, no se modifica: ${url}`);
      }
      // Si la URL apunta a localhost:8080 directamente pero no incluye /api/v1
      else if (url.includes('localhost:8080') && !path.startsWith(contextPath)) {
        // Añadir el prefijo /api/v1 para que sea compatible con la configuración del servidor
        const newUrl = url.replace(/(localhost:8080)/, '$1/api/v1');
        console.log(`[ApiUrlInterceptor] Corrigiendo URL para añadir prefijo: ${newUrl} (Original: ${url})`);
        request = request.clone({ url: newUrl });
      } else {
        console.log('[ApiUrlInterceptor] URL ya tiene formato correcto:', url);
      }
      
      return next.handle(request).pipe(
        catchError(this.handleError.bind(this))
      );
    }

    // Para URLs relativas, asegurarnos de que incluyan /api/v1
    const path = this.extractPath(url);
    
    // Asegurar que todas las rutas comiencen con /api/v1
    let finalUrl = url;
    if (!path.startsWith(contextPath)) {
      console.log(`[ApiUrlInterceptor] Añadiendo prefijo ${contextPath}`);
      finalUrl = `${apiUrl}${contextPath}${path.startsWith('/') ? path : '/' + path}`;
    } else {
      finalUrl = `${apiUrl}${path}`;
    }
    
    if (finalUrl !== url) {
      console.log(`[ApiUrlInterceptor] URL corregida: ${finalUrl}`);
      request = request.clone({
        url: finalUrl
      });
    }

    return next.handle(request).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      // Un error de cliente o de red ha ocurrido. Manejarlo de acuerdo.
      console.error('[ApiUrlInterceptor] Error de red o cliente:', error.error);
    } else {
      // El backend devolvió un código de respuesta no exitoso.
      console.error(
        `[ApiUrlInterceptor] Backend devolvió código ${error.status}, ` +
        `cuerpo: ${JSON.stringify(error.error)}`);
    }
    // Retorna un observable con un error orientado al usuario
    return throwError(() => error);
  }
}
