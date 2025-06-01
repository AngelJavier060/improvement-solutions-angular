import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Position } from '../models/position.model';

@Injectable({
  providedIn: 'root'
})
export class CargoService {
  private apiUrl = `${environment.apiUrl}/api/master-data/positions`;

  constructor(private http: HttpClient) { }
  getCargos(): Observable<Position[]> {
    return this.http.get<Position[]>(this.apiUrl);
  }

  getCargo(id: number): Observable<Position> {
    return this.http.get<Position>(`${this.apiUrl}/${id}`);
  }

  createCargo(cargo: Position): Observable<Position> {
    // Convertir departmentId a department objeto para el backend
    if (cargo.departmentId) {
      cargo = {
        ...cargo,
        department: { id: Number(cargo.departmentId) } as any
      };
      delete cargo.departmentId; // Eliminar departmentId ya que enviamos department
    }
    return this.http.post<Position>(this.apiUrl, cargo);
  }

  updateCargo(id: number, cargo: Position): Observable<Position> {
    // Convertir departmentId a department objeto para el backend
    if (cargo.departmentId) {
      cargo = {
        ...cargo,
        department: { id: Number(cargo.departmentId) } as any
      };
      delete cargo.departmentId; // Eliminar departmentId ya que enviamos department
    }
    return this.http.put<Position>(`${this.apiUrl}/${id}`, cargo);
  }

  deleteCargo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
} 