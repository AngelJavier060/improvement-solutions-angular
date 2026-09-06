import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CalidadDocumentoDto {
  id: number;
  parentId: number | null;
  procesoCatalogItemId?: number | null;
  procesoName: string;
  procesoCode: string;
  tipoCatalogItemId?: number | null;
  tipoName: string;
  tipoCode: string;
  codigo: string;
  nombre: string;
  fechaElaboracion?: string | null;
  fechaRevision?: string | null;
  version?: string;
  fechaProxRevision?: string | null;
  diasVigencia?: number | null;
  estado?: string;
  almacenamiento?: string | null;
  responsable?: string | null;
  vigencia?: string | null;
  disposicionFinal?: string | null;
  observaciones?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalidadDocumentoPayload {
  parentId?: number | null;
  procesoCatalogItemId?: number | null;
  tipoCatalogItemId?: number | null;
  procesoName?: string;
  procesoCode?: string;
  tipoName?: string;
  tipoCode?: string;
  nombre: string;
  fechaElaboracion?: string;
  fechaRevision?: string;
  version?: string;
  fechaProxRevision?: string;
  diasVigencia?: number | null;
  estado?: string;
  almacenamiento?: string;
  responsable?: string;
  vigencia?: string;
  disposicionFinal?: string;
  observaciones?: string;
}

@Injectable({ providedIn: 'root' })
export class CalidadDocumentosService {
  constructor(private readonly http: HttpClient) {}

  private base(ruc: string): string {
    return `${environment.apiUrl}/api/calidad/${encodeURIComponent(ruc)}/documentos`;
  }

  list(ruc: string): Observable<CalidadDocumentoDto[]> {
    return this.http.get<CalidadDocumentoDto[]>(this.base(ruc));
  }

  create(ruc: string, data: CalidadDocumentoPayload, file?: File | null): Observable<CalidadDocumentoDto> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (file) {
      form.append('file', file, file.name);
    }
    return this.http.post<CalidadDocumentoDto>(this.base(ruc), form);
  }

  delete(ruc: string, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base(ruc)}/${id}`);
  }

  /** Obtiene el archivo como Blob (con JWT) para vista previa en modal. */
  getFileBlob(ruc: string, id: number): Observable<Blob> {
    return this.http.get(`${this.base(ruc)}/${id}/file`, { responseType: 'blob' });
  }

  fileUrl(ruc: string, id: number): string {
    return `${this.base(ruc)}/${id}/file`;
  }
}
