import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DiagnosticService } from '../../services/diagnostic.service';
import { GeneroService } from '../../services/genero.service';

@Component({
  selector: 'app-test-public',  template: `
    <div class="container mt-5">
      <h1>Diagnóstico de Endpoints Públicos</h1>
      <p class="lead">Esta herramienta ayuda a verificar el acceso a endpoints públicos sin autenticación</p>
      
      <div class="alert alert-info">
        <strong>Nota:</strong> Esta página es solo para diagnóstico y no debe estar accesible en producción.
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">1. Test Directo (HttpClient)</div>
            <div class="card-body">
              <button (click)="testDirectRequest()" class="btn btn-primary">Probar acceso directo a géneros</button>
              <div class="mt-3" *ngIf="directResult">
                <h5>Resultado:</h5>
                <pre class="bg-light p-2">{{ directResult | json }}</pre>
              </div>
              <div class="mt-3 text-danger" *ngIf="directError">
                <h5>Error:</h5>
                <pre class="bg-light p-2">{{ directError }}</pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-success text-white">2. Test con Servicio</div>
            <div class="card-body">
              <button (click)="testWithService()" class="btn btn-success">Probar con GeneroService</button>
              <div class="mt-3" *ngIf="serviceResult">
                <h5>Resultado:</h5>
                <pre class="bg-light p-2">{{ serviceResult | json }}</pre>
              </div>
              <div class="mt-3 text-danger" *ngIf="serviceError">
                <h5>Error:</h5>
                <pre class="bg-light p-2">{{ serviceError }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card mb-4">
            <div class="card-header bg-warning">3. Test de Health</div>
            <div class="card-body">
              <button (click)="testHealth()" class="btn btn-warning">Verificar salud del sistema</button>
              <div class="mt-3" *ngIf="healthResult">
                <h5>Resultado:</h5>
                <pre class="bg-light p-2">{{ healthResult | json }}</pre>
              </div>
              <div class="mt-3 text-danger" *ngIf="healthError">
                <h5>Error:</h5>
                <pre class="bg-light p-2">{{ healthError }}</pre>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-info text-white">Detalles técnicos</div>
            <div class="card-body">
              <p><strong>URL base API:</strong> {{ environment.apiUrl }}</p>
              <p><strong>URL de géneros:</strong> {{ testUrl }}</p>
              <p><strong>URL de health:</strong> {{ environment.apiUrl }}/public/test</p>
              <p><strong>Último intento:</strong> {{ lastAttempt | date:'medium' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TestPublicComponent implements OnInit {  environment = environment;
  testUrl = environment.apiUrl + '/public/generos';
  directResult: any = null;
  directError: string = '';
  serviceResult: any = null;
  serviceError: string = '';
  healthResult: any = null;
  healthError: string = '';
  lastAttempt: Date | null = null;

  constructor(
    private http: HttpClient, 
    private diagnosticService: DiagnosticService,
    private generoService: GeneroService
  ) { }

  ngOnInit(): void {
    console.log('Componente de prueba inicializado');
    console.log('URL de prueba:', this.testUrl);
  }

  testDirectRequest(): void {
    this.lastAttempt = new Date();
    this.directResult = null;
    this.directError = '';
    
    console.log('Realizando solicitud directa a:', this.testUrl);
    
    // Hacer una solicitud HTTP directa sin usar el servicio de género
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
      // Sin token de autorización
    });
    
    this.http.get(this.testUrl, { headers }).subscribe({
      next: (response) => {
        console.log('Respuesta exitosa:', response);
        this.directResult = response;
      },
      error: (error) => {
        console.error('Error en la solicitud:', error);
        this.directError = `Error ${error.status}: ${error.statusText || 'Desconocido'}
        
Detalles: ${JSON.stringify(error.error, null, 2)}`;
      }
    });
  }
  
  testWithService(): void {
    this.lastAttempt = new Date();
    this.serviceResult = null;
    this.serviceError = '';
    
    console.log('Realizando solicitud usando GeneroService');
    
    this.generoService.getGeneros().subscribe({
      next: (response) => {
        console.log('Respuesta exitosa del servicio:', response);
        this.serviceResult = response;
      },
      error: (error) => {
        console.error('Error en el servicio:', error);
        this.serviceError = `Error ${error.status}: ${error.statusText || 'Desconocido'}
        
Detalles: ${JSON.stringify(error.error, null, 2)}`;
      }
    });
  }
  
  testHealth(): void {
    this.lastAttempt = new Date();
    this.healthResult = null;
    this.healthError = '';
    
    console.log('Verificando salud del sistema');
    
    this.diagnosticService.checkEndpointsHealth().subscribe({
      next: (response) => {
        console.log('Respuesta de health check:', response);
        this.healthResult = response;
      },
      error: (error) => {
        console.error('Error en health check:', error);
        this.healthError = `Error ${error.status}: ${error.statusText || 'Desconocido'}
        
Detalles: ${JSON.stringify(error.error, null, 2)}`;
      }
    });
  }
}
