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
  private baseUrl = `${environment.apiUrl}/api/files`;

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
    
    // Asegurarse de que no se incluyan cabeceras Content-Type para que el navegador establezca
    // automáticamente el boundary correcto para multipart/form-data
    return this.http.post<FileResponse>(`${this.baseUrl}/upload/${directory}`, formData);
  }
  /**
   * Obtiene la URL de descarga de un archivo
   */
  getFileUrl(filename: string): string {
    const token = localStorage.getItem('auth_token');
    return `${this.baseUrl}/${filename}${token ? '?token=' + token : ''}`;
  }
  /**
   * Obtiene la URL de descarga de un archivo en una carpeta específica
   * @param directory Directorio donde se encuentra el archivo
   * @param filename Nombre del archivo
   * @param preventCache Añadir timestamp para evitar caché (por defecto true)
   * @returns URL completa para acceder al archivo
   */
  getFileUrlFromDirectory(directory: string, filename: string, preventCache: boolean = true): string {
    // Limpieza del nombre de archivo (eliminamos parámetros de consulta si existen)
    const cleanFilename = filename?.split('?')[0]?.split('#')[0] || '';
    
    // Si ya es una ruta completa que incluye el directorio, extraer solo el nombre del archivo
    const actualFilename = cleanFilename.includes('/') ? cleanFilename.split('/').pop() || cleanFilename : cleanFilename;
    
    if (!actualFilename) {
      console.warn('Nombre de archivo vacío al construir URL');
      return '';
    }
    
    // Obtener token para autenticación
    const token = localStorage.getItem('auth_token');
    
    // Construir URL base
    let url = `${this.baseUrl}/${directory}/${actualFilename}`;
    
    // Añadir token si existe
    if (token) {
      url += `?token=${token}`;
    }
    
    // Añadir parámetro para prevenir caché, si se solicita
    if (preventCache) {
      url += `${token ? '&' : '?'}v=${new Date().getTime()}`;
    }
    
    console.log(`URL generada para archivo ${actualFilename} en ${directory}: ${url}`);
    return url;
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