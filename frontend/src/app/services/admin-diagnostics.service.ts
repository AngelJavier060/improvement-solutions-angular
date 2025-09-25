import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface DbDiagnostics {
  datasourceUrl?: string;
  database?: any;
  businessesCount?: number;
  businesses?: Array<{ id: number; name: string }>;
}

@Injectable({ providedIn: 'root' })
export class AdminDiagnosticsService {
  private readonly endpoint = '/api/admin/db/diagnostics';

  constructor(private http: HttpClient) {}

  getDiagnostics(): Observable<DbDiagnostics> {
    return this.http.get<DbDiagnostics>(this.endpoint).pipe(
      catchError((err) => {
        if (err?.status === 401) {
          return throwError(() => new Error('No autorizado (401). Inicie sesión nuevamente.'));
        }
        if (err?.status === 403) {
          return throwError(() => new Error('Acceso denegado (403). Se requiere rol ADMIN.'));
        }
        return throwError(() => err);
      })
    );
  }
}
