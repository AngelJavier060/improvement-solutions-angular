import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { retry } from 'rxjs/operators';

/**
 * Reintenta llamadas al API cuando el gateway/backend está caído o reiniciando
 * (0, 502, 503, 504). No toca POST de negocio para no duplicar escrituras.
 */
@Injectable()
export class GatewayRetryInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const maxRetries = this.isRetryableRequest(req) ? 2 : 0;
    if (maxRetries === 0) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      retry({
        count: maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          if (!this.isTransient(error)) {
            return throwError(() => error);
          }
          return timer(retryCount * 1600);
        }
      })
    );
  }

  private isRetryableRequest(req: HttpRequest<unknown>): boolean {
    const url = req.url || '';
    if (!url.includes('/api/')) {
      return false;
    }
    // ZIP y blobs: reintentar duplica RAM y puede tumbar el backend (502).
    if (url.includes('/documents/zip') || req.responseType === 'blob') {
      return false;
    }
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }
    return method === 'POST' && (
      url.includes('/api/auth/login') ||
      url.includes('/api/public/site-visits') ||
      url.includes('/api/health')
    );
  }

  private isTransient(error: HttpErrorResponse | unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return true;
    }
    return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
  }
}
