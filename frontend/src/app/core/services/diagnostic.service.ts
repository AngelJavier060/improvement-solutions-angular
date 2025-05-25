import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DiagnosticReport {
  timestamp: string;
  serverStatus: {
    isReachable: boolean;
    responseTime: number;
    error?: string;
  };
  corsStatus: {
    isConfigured: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    error?: string;
  };
  authStatus: {
    publicEndpointsAccessible: boolean;
    privateEndpointsAccessible: boolean;
    tokenValid: boolean;
    error?: string;
  };
  routingStatus: {
    currentUrl: string;
    baseApiUrl: string;
    interceptorsActive: boolean;
    error?: string;
  };
  networkStatus: {
    hasInternetConnection: boolean;
    error?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  runFullDiagnostic(): Observable<DiagnosticReport> {
    console.log('Iniciando diagnóstico completo...');
    
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      serverStatus: {
        isReachable: false,
        responseTime: 0
      },
      corsStatus: {
        isConfigured: false,
        allowedOrigins: [],
        allowedMethods: []
      },
      authStatus: {
        publicEndpointsAccessible: false,
        privateEndpointsAccessible: false,
        tokenValid: false
      },
      routingStatus: {
        currentUrl: window.location.href,
        baseApiUrl: this.apiUrl,
        interceptorsActive: false
      },
      networkStatus: {
        hasInternetConnection: navigator.onLine
      }
    };

    return this.checkServerStatus()
      .pipe(
        map(serverResult => {
          report.serverStatus = serverResult;
          return report;
        }),
        catchError(error => {
          report.serverStatus.error = error.message;
          return of(report);
        })
      );
  }

  private checkServerStatus(): Observable<any> {
    const startTime = performance.now();
    
    return this.http.get(`${this.apiUrl}/public/diagnostic/health`)
      .pipe(
        timeout(5000),
        map(response => ({
          isReachable: true,
          responseTime: Math.round(performance.now() - startTime),
          details: response
        })),
        catchError(error => {
          console.error('Error en diagnóstico del servidor:', error);
          return throwError(() => ({
            isReachable: false,
            responseTime: Math.round(performance.now() - startTime),
            error: this.getDetailedErrorMessage(error)
          }));
        })
      );
  }

  private getDetailedErrorMessage(error: any): string {
    if (error.name === 'TimeoutError') {
      return 'El servidor no respondió en el tiempo esperado (timeout)';
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Posibles causas:\n' +
             '- El servidor no está ejecutándose\n' +
             '- Hay un problema de CORS\n' +
             '- Existe un problema de red';
    }

    if (error.status === 404) {
      return 'El endpoint de diagnóstico no existe en el servidor.\n' +
             'Ruta intentada: ' + error.url;
    }

    if (error.status === 401) {
      return 'No autorizado. El token puede ser inválido o haber expirado';
    }

    if (error.status === 403) {
      return 'Acceso prohibido. No tienes permisos para esta operación';
    }

    return `Error ${error.status}: ${error.message || 'Error desconocido'}`;
  }

  testEndpoint(url: string): Observable<any> {
    console.log(`Probando endpoint: ${url}`);
    const startTime = performance.now();

    return this.http.get(url)
      .pipe(
        timeout(5000),
        map(response => ({
          success: true,
          responseTime: Math.round(performance.now() - startTime),
          data: response
        })),
        catchError(error => {
          console.error(`Error probando ${url}:`, error);
          return throwError(() => ({
            success: false,
            responseTime: Math.round(performance.now() - startTime),
            error: this.getDetailedErrorMessage(error)
          }));
        })
      );
  }
}
