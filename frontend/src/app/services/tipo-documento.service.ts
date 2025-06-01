import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TipoDocumento } from '../models/tipo-documento.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/document-types');
    console.log('URL del servicio de tipos de documento (actualizado con /api/):', this.apiUrl);
  }

  getTiposDocumento(): Observable<TipoDocumento[]> {
    console.log('Solicitando tipos de documento desde:', this.apiUrl);
    return this.http.get<TipoDocumento[]>(this.apiUrl).pipe(
      tap(data => console.log('Datos de tipos de documento recibidos:', data)),
      catchError(this.handleError)
    );
  }

  getTipoDocumento(id: number): Observable<TipoDocumento> {
    console.log(`Obteniendo tipo de documento con ID: ${id}`);
    return this.http.get<TipoDocumento>(`${this.apiUrl}/${id}`).pipe(
      tap(data => console.log('Detalle de tipo de documento:', data)),
      catchError(this.handleError)
    );
  }

  createTipoDocumento(tipoDocumento: TipoDocumento): Observable<TipoDocumento> {
    console.log('Enviando tipo de documento al backend:', tipoDocumento);
    console.log('URL de envío:', this.apiUrl);
    return this.http.post<TipoDocumento>(this.apiUrl, tipoDocumento).pipe(
      tap(data => console.log('Tipo de documento creado:', data)),
      catchError(this.handleError)
    );
  }

  updateTipoDocumento(id: number, tipoDocumento: TipoDocumento): Observable<TipoDocumento> {
    console.log(`Actualizando tipo de documento con ID: ${id}`, tipoDocumento);
    return this.http.put<TipoDocumento>(`${this.apiUrl}/${id}`, tipoDocumento).pipe(
      tap(data => console.log('Tipo de documento actualizado:', data)),
      catchError(this.handleError)
    );
  }

  deleteTipoDocumento(id: number): Observable<any> {
    console.log(`Eliminando tipo de documento con ID: ${id}`);
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => console.log('Tipo de documento eliminado correctamente')),
      catchError(this.handleError)
    );
  }

  // Método para manejar errores HTTP
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error HTTP en servicio TipoDocumento:', error);
    
    let errorMessage = 'Ha ocurrido un error en el servidor.';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
    } else if (error.status === 403) {
      errorMessage = 'No tiene permisos para realizar esta acción.';
    } else if (error.status === 404) {
      errorMessage = 'El recurso solicitado no existe.';
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
