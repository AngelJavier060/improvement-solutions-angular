import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ObligationMatrix } from '../models/obligation-matrix.model';

@Injectable({
  providedIn: 'root'
})
export class ObligationMatrixService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl + '/api/master-data/obligation-matrices';
  }

  // Obtener todas las matrices de obligación del catálogo
  getObligationMatrices(): Observable<ObligationMatrix[]> {
    return this.http.get<ObligationMatrix[]>(this.apiUrl);
  }

  // Obtener una matriz de obligación por su ID
  getObligationMatrix(id: number): Observable<ObligationMatrix> {
    return this.http.get<ObligationMatrix>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva matriz de obligación
  createObligationMatrix(matrix: ObligationMatrix): Observable<ObligationMatrix> {
    return this.http.post<ObligationMatrix>(this.apiUrl, matrix);
  }

  // Actualizar una matriz de obligación existente
  updateObligationMatrix(id: number, matrix: ObligationMatrix): Observable<ObligationMatrix> {
    return this.http.put<ObligationMatrix>(`${this.apiUrl}/${id}`, matrix);
  }

  // Eliminar una matriz de obligación
  deleteObligationMatrix(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}