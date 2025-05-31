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
export class CorsInterceptor implements HttpInterceptor {  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Solo modificar solicitudes que van al backend
    if (request.url.includes(environment.apiUrl)) {
      // Para solicitudes multipart/form-data (subida de archivos), no modificar el Content-Type
      // El navegador lo configurará automáticamente con el boundary correcto
      if (request.body instanceof FormData) {
        request = request.clone({
          setHeaders: {
            'Accept': 'application/json'
          },
          withCredentials: true
        });
      } else {
        // Para solicitudes JSON normales
        request = request.clone({
          setHeaders: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        });
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          console.error('Error CORS o de red:', error);
        }
        return throwError(() => error);
      })
    );
  }
}
