import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  private baseUrl = environment.apiUrl;

  constructor() {
    console.log('ApiUrlService inicializado con URL base:', this.baseUrl);
  }  /**
   * Construye una URL de API correcta
   * @param endpoint El endpoint (puede incluir o no /api/)
   * @returns URL completa para la API
   */
  getUrl(endpoint: string): string {
    // Asegurar que el endpoint comienza con /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    // Eliminar barras duplicadas
    endpoint = endpoint.replace(/\/+/g, '/'); // Reemplazar múltiples barras con una sola
    
    // Si baseUrl está vacío (para usar proxy), devolver solo el endpoint
    if (!this.baseUrl || this.baseUrl.trim() === '') {
      console.log('ApiUrlService: Usando proxy, devolviendo endpoint relativo:', endpoint);
      return endpoint;
    }

    // Asegurarse de que no haya doble // entre baseUrl y endpoint
    const baseUrl = this.baseUrl.endsWith('/') 
      ? this.baseUrl.slice(0, -1) 
      : this.baseUrl;
    
    const finalUrl = `${baseUrl}${endpoint}`;
    console.log('ApiUrlService: URL completa construida:', finalUrl);
    return finalUrl;
  }
}
