import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-test-upload',
  templateUrl: './test-upload.component.html',
  styleUrls: ['./test-upload.component.scss']
})
export class TestUploadComponent {
  selectedFile: File | null = null;
  uploadResponse: any = null;
  corsInfo: string = '';
  isUploading: boolean = false;
  error: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }
  async uploadFile(): Promise<void> {
    if (!this.selectedFile) {
      this.error = 'Por favor selecciona un archivo primero';
      return;
    }

    this.isUploading = true;
    this.error = null;
    this.uploadResponse = null;
    this.corsInfo = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    const apiUrl = `${environment.apiUrl}/files/upload/logos`;
    this.corsInfo += `URL: ${apiUrl}\n`;

    try {
      // Comprobar CORS con una solicitud preflight
      this.corsInfo = 'Realizando solicitud preflight OPTIONS...\n';
      
      const preflightHeaders = new HttpHeaders({
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      });

      // No podemos hacer solicitudes OPTIONS directamente con HttpClient,
      // así que usamos fetch para la solicitud preflight
      const preflightResponse = await fetch(apiUrl, {
        method: 'OPTIONS',
        headers: preflightHeaders as any
      });      // Mostrar información sobre la respuesta preflight
      this.corsInfo += `Respuesta preflight: ${preflightResponse.status} ${preflightResponse.statusText}\n\n`;
      this.corsInfo += 'Cabeceras de respuesta preflight:\n';
      
      // Obtener las cabeceras de la respuesta de una manera compatible con diferentes navegadores
      const headers = preflightResponse.headers;
      const corsHeaders = [
        'Access-Control-Allow-Origin', 
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Credentials',
        'Access-Control-Max-Age'
      ];
      
      corsHeaders.forEach(headerName => {
        const headerValue = headers.get(headerName);
        if (headerValue) {
          this.corsInfo += `${headerName}: ${headerValue}\n`;
        }
      });

      if (preflightResponse.ok) {
        // Si el preflight fue exitoso, hacer la carga del archivo
        const token = this.authService.getToken();
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        this.http.post(apiUrl, formData, { headers })
          .subscribe({
            next: (response) => {
              this.uploadResponse = response;
              this.isUploading = false;
            },            error: (error) => {
              this.error = `Error al cargar el archivo: ${error.message}`;
              if (error.error) {
                try {
                  const errorDetail = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
                  this.error += `\nDetalles: ${errorDetail}`;
                } catch (e) {
                  this.error += `\nNo se pudo procesar el detalle del error.`;
                }
              }
              this.isUploading = false;
              
              // Información adicional de CORS en caso de error
              this.corsInfo += '\n\nCabeceras de respuesta de error:\n';
              if (error.headers) {
                corsHeaders.forEach(headerName => {
                  const headerValue = error.headers.get(headerName);
                  if (headerValue) {
                    this.corsInfo += `${headerName}: ${headerValue}\n`;
                  }
                });
              }
            }
          });
      } else {
        this.error = 'La solicitud preflight CORS falló. No se puede cargar el archivo.';
        this.isUploading = false;
      }
    } catch (err: any) {
      this.error = `Error durante la solicitud: ${err.message}`;
      this.isUploading = false;
    }
  }
}
