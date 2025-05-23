import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';

@Component({
  selector: 'app-debug',
  template: `
    <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px;">
      <h2>Depuración de TipoDocumentoModule</h2>
      <p>Esta es una página de diagnóstico para el módulo TipoDocumento</p>
      
      <div style="margin-top: 20px;">
        <h3>Información de rutas:</h3>
        <p>URL actual: {{ currentUrl }}</p>
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Información del servicio:</h3>
        <p>API URL: {{ apiUrl }}</p>
        <button (click)="testService()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Probar servicio
        </button>
        <div *ngIf="serviceResult" style="margin-top: 10px; padding: 10px; background: #e9ecef; border-radius: 4px;">
          {{ serviceResult | json }}
        </div>
        <div *ngIf="serviceError" style="margin-top: 10px; padding: 10px; background: #f8d7da; color: #721c24; border-radius: 4px;">
          {{ serviceError }}
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Navegación:</h3>
        <button (click)="navigateToConfig()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          Ir a Configuración
        </button>
        <button (click)="navigateToList()" style="padding: 8px 16px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Ir a Lista
        </button>
      </div>
    </div>
  `
})
export class DebugComponent implements OnInit {
  currentUrl: string;
  apiUrl: string;
  serviceResult: any;
  serviceError: string | null = null;

  constructor(
    private router: Router,
    private tipoDocumentoService: TipoDocumentoService
  ) {
    this.currentUrl = this.router.url;
    this.apiUrl = this.tipoDocumentoService['apiUrl'];
  }

  ngOnInit(): void {
    console.log('Debug Component initialized for TipoDocumentoModule');
    console.log('Current URL:', this.currentUrl);
    console.log('API URL from service:', this.apiUrl);
  }

  testService(): void {
    this.serviceResult = null;
    this.serviceError = null;
    
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => {
        console.log('Service response:', data);
        this.serviceResult = data;
      },
      error: (err) => {
        console.error('Service error:', err);
        this.serviceError = `Error: ${err.status} ${err.statusText}. Revisa la consola para más detalles.`;
      }
    });
  }

  navigateToConfig(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }

  navigateToList(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-documento']);
  }
}
