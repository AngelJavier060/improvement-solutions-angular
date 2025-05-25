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
   */  getUrl(endpoint: string): string {
    // Asegurar que el endpoint comienza con /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }    // Eliminar barras duplicadas y ajustar el prefijo /api
    endpoint = endpoint.replace(/^\/+/, ''); // Eliminar barras al inicio
    
    // Si no empieza con 'api/', añadirlo
    if (!endpoint.startsWith('api/')) {
      endpoint = 'api/' + endpoint;
    }

    // Asegurarse de que la ruta esté bien formada
    endpoint = endpoint.replace(/\/+/g, '/'); // Reemplazar múltiples barras con una sola
    
    // Asegurarse de que empiece con /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    // Asegurarse de que no haya doble // entre baseUrl y endpoint
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    
    return `${baseUrl}${endpoint}`;
  }
}
