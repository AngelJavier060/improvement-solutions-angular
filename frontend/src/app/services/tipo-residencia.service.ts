import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TipoResidencia } from '../models/tipo-residencia.model';

@Injectable({
  providedIn: 'root'
})
export class TipoResidenciaService {
  // URL estandarizada usando environment.apiUrl y el context-path
  private apiUrl = `${environment.apiUrl}/api/v1/public/residencias`;

  constructor(private http: HttpClient) { 
    console.log('URL del servicio de tipo residencia (estandarizada):', this.apiUrl);
  }

  getTiposResidencia(): Observable<TipoResidencia[]> {
    console.log('Solicitando tipos de residencia desde:', this.apiUrl);
    return this.http.get<TipoResidencia[]>(this.apiUrl);
  }
  getTipoResidencia(id: number): Observable<TipoResidencia> {
    return this.http.get<TipoResidencia>(`${this.apiUrl}/${id}`);
  }

  createTipoResidencia(tipoResidencia: TipoResidencia): Observable<TipoResidencia> {
    console.log('Enviando tipo de residencia al backend:', tipoResidencia);
    console.log('URL de envío:', this.apiUrl);
    return this.http.post<TipoResidencia>(this.apiUrl, tipoResidencia);
  }

  updateTipoResidencia(id: number, tipoResidencia: TipoResidencia): Observable<TipoResidencia> {
    return this.http.put<TipoResidencia>(`${this.apiUrl}/${id}`, tipoResidencia);
  }

  deleteTipoResidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
