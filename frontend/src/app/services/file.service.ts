import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FileResponse {
  url: string;
  temporaryUrl: string | null;
  filename: string;
  contentType: string | null;
  size: number | null;
  message: string | null;
}

export interface TemporaryUrlResponse {
  url: string;
  expiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private baseUrl = `${environment.apiUrl}/api/files`;
  constructor(private http: HttpClient) { }

  private getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Sube un archivo al almacenamiento general
   */
  uploadFile(file: File): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = this.getAuthHeaders();
    return this.http.post<FileResponse>(`${this.baseUrl}/upload`, formData, { headers }).pipe(
      map(response => ({
        url: response.url,
        temporaryUrl: response.temporaryUrl || null,
        filename: response.filename,
        contentType: response.contentType || null,
        size: response.size || null,
        message: response.message || null
      }))
    );
  }

  /**
   * Lista todos los archivos disponibles
   */
  getFiles(): Observable<FileResponse[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<FileResponse[]>(`${this.baseUrl}/list`, { headers });
  }

  /**
   * Sube un archivo a una carpeta específica
   */  uploadFileToDirectory(directory: string, file: File): Observable<FileResponse> {
    console.log(`[FileService] Iniciando carga de archivo a directorio: ${directory}`);
    console.log(`[FileService] Tipo de archivo: ${file.type}, Tamaño: ${file.size} bytes`);

    const formData = new FormData();
    formData.append('file', file);

    const headers = this.getAuthHeaders();
    return this.http.post<FileResponse>(`${this.baseUrl}/upload/${directory}`, formData, { headers }).pipe(
      map(response => {
        console.log('[FileService] Respuesta del servidor:', response);
        return {
          url: response.url,
          temporaryUrl: response.temporaryUrl || null,
          filename: response.filename,
          contentType: response.contentType || null,
          size: response.size || null,
          message: response.message || null
        };
      }),
      catchError(error => {
        console.error('[FileService] Error al subir archivo:', error);
        if (error.status === 403) {
          return throwError(() => new Error('No tiene permisos para subir archivos. Por favor, inicie sesión nuevamente.'));
        } else if (error.status === 413) {
          return throwError(() => new Error('El archivo es demasiado grande. El tamaño máximo permitido es 2MB.'));
        } else if (error.status === 415) {
          return throwError(() => new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPG y PNG.'));
        } else if (error.status === 400) {
          const msg = (error?.error && typeof error.error === 'object' && 'message' in error.error)
            ? (error.error as any).message
            : (typeof error?.error === 'string' ? error.error : (error?.message || 'Solicitud inválida al subir archivo'));
          return throwError(() => new Error(msg));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene una URL temporal para acceder a un archivo
   */
  getTemporaryUrl(fileUrl: string, expirationMinutes: number): Observable<{ url: string }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ url: string }>(`${this.baseUrl}/temp-url`, {
      fileUrl,
      expirationMinutes
    }, { headers });
  }

  /**
   * Descarga un archivo
   */
  downloadFile(fileUrl: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(fileUrl, {
      headers,
      responseType: 'blob'
    });
  }

  /**
   * Elimina un archivo
   */
  deleteFile(fileUrl: string): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.baseUrl}/${fileUrl}`, { headers });
  }

  /**
   * Obtiene la URL de descarga de un archivo
   */
  getFileUrl(filename: string): string {
    const cleanFile = String(filename || '').replace(/^\/+/, '');
    return `${this.baseUrl}/${cleanFile}`;
  }

  /**
   * Obtiene la URL de descarga de un archivo en una carpeta específica
   */
  getFileDirectoryUrl(directory: string, filename: string, preventCache: boolean = true): string {
    // Normalizar: quitar barras extra y si filename viene con 'logos/...', usar solo el nombre
    const cleanDir = String(directory || '').replace(/^\/+|\/+$/g, '');
    const cleanFile = String(filename || '').split('/').pop() || '';
    if (!cleanFile) {
      return '';
    }
    const url = `${this.baseUrl}/${cleanDir}/${cleanFile}`;
    return preventCache ? `${url}?v=${Date.now()}` : url;
  }

  /**
   * Compatibilidad hacia atrás: alias de getFileDirectoryUrl
   */
  getFileUrlFromDirectory(directory: string, filename: string, preventCache: boolean = true): string {
    return this.getFileDirectoryUrl(directory, filename, preventCache);
  }

}