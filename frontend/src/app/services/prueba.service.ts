import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {
  // Actualizado para incluir el prefijo /v1
  private apiUrl = `${environment.apiUrl}/api/v1/prueba`;

  constructor(private http: HttpClient) { }

  getPrueba(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}