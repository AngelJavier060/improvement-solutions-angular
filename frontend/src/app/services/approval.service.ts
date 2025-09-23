import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiUrlService } from '../core/services/api-url.service';

export interface CreateApprovalPayload {
  businessId: number;
  type: 'MATRIX_UPDATE' | 'FILE_UPLOAD' | 'FILE_DELETE';
  targetType: 'BUSINESS_OBLIGATION_MATRIX' | 'MATRIX_FILE';
  targetId: number;
  payload?: any;
}

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private baseUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.baseUrl = this.apiUrlService.getUrl('api/approvals');
  }

  createApproval(data: CreateApprovalPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, data);
    }

  listByBusiness(businessId: number, status?: string): Observable<any[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    const primaryUrl = `${this.baseUrl}/business/${businessId}${q}`;
    const fallbackQuery = `${this.baseUrl}?businessId=${encodeURIComponent(String(businessId))}${status ? `&status=${encodeURIComponent(status)}` : ''}`;
    return this.http.get<any[]>(primaryUrl).pipe(
      catchError((err) => {
        console.warn('ApprovalService.listByBusiness primary endpoint failed, trying fallback', err);
        return this.http.get<any[]>(fallbackQuery);
      })
    );
  }

  approve(id: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/approve`, { reason });
  }

  reject(id: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/reject`, { reason });
  }

  // Staging upload for obligation matrix files (PDF only)
  uploadStagingObligationFile(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    const stagingUrl = this.apiUrlService.getUrl('api/files/staging/obligation-matrix');
    return this.http.post<any>(stagingUrl, form).pipe(
      // Sin fallback: si falla staging, propagamos el error para que el caller degrade a solicitud sin adjunto
      catchError((err) => {
        console.warn('uploadStagingObligationFile: staging endpoint failed', err);
        return throwError(() => err);
      }),
      // Normalizar respuesta a { stagingPath, originalName }
      switchMap((resp) => {
        const normalized = {
          stagingPath: resp?.stagingPath || resp?.path || resp?.storedPath || resp?.filePath || resp?.url || '',
          originalName: resp?.originalName || resp?.name || file.name
        };
        return of(normalized);
      })
    );
  }
}
