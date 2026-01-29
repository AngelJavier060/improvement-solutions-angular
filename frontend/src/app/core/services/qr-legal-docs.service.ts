import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QrLegalDocsService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  issueToken(ruc: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/qr/legal-docs/token`, { ruc });
  }

  rotateToken(ruc: string): Observable<{ token: string; version: number }> {
    return this.http.post<{ token: string; version: number }>(`${this.apiUrl}/qr/legal-docs/rotate`, { ruc });
  }

  getPublicDocs(ruc: string, token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/public/qr/legal-docs/${encodeURIComponent(ruc)}?token=${encodeURIComponent(token)}`);
  }

  getPublicFileUrl(ruc: string, fileId: number, token: string): string {
    return `${this.apiUrl}/public/qr/legal-docs/${encodeURIComponent(ruc)}/files/${fileId}?token=${encodeURIComponent(token)}`;
  }
}
