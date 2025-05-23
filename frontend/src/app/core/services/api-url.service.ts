import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  private baseUrl = environment.apiUrl;

  constructor() {
    console.log('ApiUrlService inicializado con URL base:', this.baseUrl);
  }
  /**
   * Construye una URL de API correcta, evitando la duplicación de /api/v1
   * @param endpoint El endpoint sin el prefijo /api/v1
   * @returns URL completa para la API
   */
  getUrl(endpoint: string): string {
    // Asegurar que el endpoint comienza con /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    // Eliminar cualquier /api/v1 duplicado
    if (endpoint.startsWith('/api/v1')) {
      console.warn(`Endpoint "${endpoint}" ya contiene /api/v1, esto podría causar problemas. Se recomienda usar solo "${endpoint.substring(7)}"`);
      // Mantenemos el endpoint tal como está, con /api/v1 incluido
    } else {
      // Si no incluye el prefijo, agregarlo
      endpoint = '/api/v1' + endpoint;
    }

    // Asegurarse de que no haya doble // entre baseUrl y endpoint
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    
    return `${baseUrl}${endpoint}`;
  }
}
