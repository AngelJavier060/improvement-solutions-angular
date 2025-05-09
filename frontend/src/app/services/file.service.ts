import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FileResponse {
  url: string;
  temporaryUrl: string;
  filename: string;
  contentType: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private baseUrl = `${environment.apiUrl}/api/v1/files`;

  constructor(private http: HttpClient) { }

  /**
   * Sube un archivo al almacenamiento general
   */
  uploadFile(file: File): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<FileResponse>(`${this.baseUrl}/upload`, formData);
  }

  /**
   * Sube un archivo a una carpeta específica
   */
  uploadFileToDirectory(directory: string, file: File): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<FileResponse>(`${this.baseUrl}/upload/${directory}`, formData);
  }

  /**
   * Obtiene la URL de descarga de un archivo
   */
  getFileUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`;
  }

  /**
   * Obtiene la URL de descarga de un archivo en una carpeta específica
   */
  getFileUrlFromDirectory(directory: string, filename: string): string {
    return `${this.baseUrl}/${directory}/${filename}`;
  }

  /**
   * Genera una URL temporal para acceder a un archivo
   */
  getTemporaryUrl(path: string, minutes = 5): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/temp/${path}`, {
      params: { minutes: minutes.toString() }
    });
  }

  /**
   * Descarga un archivo
   */
  downloadFile(filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${filename}`, {
      responseType: 'blob'
    });
  }

  /**
   * Descarga un archivo de una carpeta específica
   */
  downloadFileFromDirectory(directory: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${directory}/${filename}`, {
      responseType: 'blob'
    });
  }

  /**
   * Elimina un archivo
   */
  deleteFile(filename: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${filename}`);
  }

  /**
   * Elimina un archivo de una carpeta específica
   */
  deleteFileFromDirectory(directory: string, filename: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${directory}/${filename}`);
  }
}