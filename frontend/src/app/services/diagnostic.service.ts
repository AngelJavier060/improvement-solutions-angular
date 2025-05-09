import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }
  /**
   * Prueba un endpoint público específico sin token
   * @param endpoint La parte de la URL después de /public/
   * @returns Observable con la respuesta
   */
  testPublicEndpoint(endpoint: string): Observable<any> {
    const url = `${this.apiUrl}/public/${endpoint}`;
    console.log(`Probando endpoint público: ${url}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
      // Sin token de autorización
    });
    
    return this.http.get(url, { headers }).pipe(
      tap(
        response => console.log('Respuesta exitosa:', response),
        error => console.error('Error en endpoint público:', error)
      )
    );
  }
  /**
   * Prueba un endpoint protegido utilizando el token
   * @param endpoint La parte de la URL a probar
   * @returns Observable con la respuesta
   */
  testProtectedEndpoint(endpoint: string, token: string): Observable<any> {
    const url = `${this.apiUrl}/${endpoint}`;
    console.log(`Probando endpoint protegido: ${url}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get(url, { headers }).pipe(
      tap(
        response => console.log('Respuesta exitosa:', response),
        error => console.error('Error en endpoint protegido:', error)
      )
    );
  }

  /**
   * Verifica si los endpoints principales están accesibles
   * @returns Observable con un objeto que indica el estado de cada endpoint
   */
  checkEndpointsHealth(): Observable<any> {
    // Este endpoint debe ser absolutamente público
    const testUrl = `${this.apiUrl}/public/test`;
    console.log('Verificando salud del sistema en:', testUrl);
    
    return this.http.get(testUrl).pipe(
      tap(
        response => console.log('Sistema en funcionamiento:', response),
        error => console.error('Problemas con el sistema:', error)
      )
    );
  }
}
