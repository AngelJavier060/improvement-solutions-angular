import { Component, OnInit } from '@angular/core';
import { DiagnosticService, DiagnosticReport } from '../../core/services/diagnostic.service';

@Component({
  selector: 'app-diagnostic',
  template: `
    <div class="diagnostic-container p-4">
      <h2>Diagnóstico del Sistema</h2>
      
      <div class="mb-3">
        <button class="btn btn-primary" (click)="runDiagnostic()" [disabled]="loading">
          {{ loading ? 'Ejecutando diagnóstico...' : 'Ejecutar diagnóstico' }}
        </button>
      </div>

      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div *ngIf="report" class="diagnostic-results">
        <!-- Estado del Servidor -->
        <div class="card mb-3">
          <div class="card-header" [ngClass]="{
            'bg-success text-white': report.serverStatus.isReachable,
            'bg-danger text-white': !report.serverStatus.isReachable
          }">
            Estado del Servidor
          </div>
          <div class="card-body">
            <p><strong>Alcanzable:</strong> {{ report.serverStatus.isReachable ? 'Sí' : 'No' }}</p>
            <p><strong>Tiempo de respuesta:</strong> {{ report.serverStatus.responseTime }}ms</p>
            <p *ngIf="report.serverStatus.error" class="text-danger">
              <strong>Error:</strong> {{ report.serverStatus.error }}
            </p>
          </div>
        </div>

        <!-- Estado de CORS -->
        <div class="card mb-3">
          <div class="card-header" [ngClass]="{
            'bg-success text-white': report.corsStatus.isConfigured,
            'bg-danger text-white': !report.corsStatus.isConfigured
          }">
            Configuración CORS
          </div>
          <div class="card-body">
            <p><strong>Configurado:</strong> {{ report.corsStatus.isConfigured ? 'Sí' : 'No' }}</p>
            <div *ngIf="report.corsStatus.allowedOrigins?.length">
              <strong>Orígenes permitidos:</strong>
              <ul>
                <li *ngFor="let origin of report.corsStatus.allowedOrigins">{{ origin }}</li>
              </ul>
            </div>
            <p *ngIf="report.corsStatus.error" class="text-danger">
              <strong>Error:</strong> {{ report.corsStatus.error }}
            </p>
          </div>
        </div>

        <!-- Estado de Autenticación -->
        <div class="card mb-3">
          <div class="card-header" [ngClass]="{
            'bg-success text-white': report.authStatus.publicEndpointsAccessible,
            'bg-warning': !report.authStatus.privateEndpointsAccessible,
            'bg-danger text-white': !report.authStatus.publicEndpointsAccessible
          }">
            Estado de Autenticación
          </div>
          <div class="card-body">
            <p><strong>Endpoints públicos accesibles:</strong> 
              {{ report.authStatus.publicEndpointsAccessible ? 'Sí' : 'No' }}
            </p>
            <p><strong>Endpoints privados accesibles:</strong> 
              {{ report.authStatus.privateEndpointsAccessible ? 'Sí' : 'No' }}
            </p>
            <p><strong>Token válido:</strong> {{ report.authStatus.tokenValid ? 'Sí' : 'No' }}</p>
            <p *ngIf="report.authStatus.error" class="text-danger">
              <strong>Error:</strong> {{ report.authStatus.error }}
            </p>
          </div>
        </div>

        <!-- Estado del Enrutamiento -->
        <div class="card mb-3">
          <div class="card-header">
            Información de Enrutamiento
          </div>
          <div class="card-body">
            <p><strong>URL actual:</strong> {{ report.routingStatus.currentUrl }}</p>
            <p><strong>URL base de la API:</strong> {{ report.routingStatus.baseApiUrl }}</p>
            <p><strong>Interceptores activos:</strong> 
              {{ report.routingStatus.interceptorsActive ? 'Sí' : 'No' }}
            </p>
            <p *ngIf="report.routingStatus.error" class="text-danger">
              <strong>Error:</strong> {{ report.routingStatus.error }}
            </p>
          </div>
        </div>

        <!-- Estado de la Red -->
        <div class="card mb-3">
          <div class="card-header" [ngClass]="{
            'bg-success text-white': report.networkStatus.hasInternetConnection,
            'bg-danger text-white': !report.networkStatus.hasInternetConnection
          }">
            Estado de la Red
          </div>
          <div class="card-body">
            <p><strong>Conexión a Internet:</strong> 
              {{ report.networkStatus.hasInternetConnection ? 'Sí' : 'No' }}
            </p>
            <p *ngIf="report.networkStatus.error" class="text-danger">
              <strong>Error:</strong> {{ report.networkStatus.error }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .diagnostic-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .diagnostic-results {
      margin-top: 20px;
    }
    .card {
      margin-bottom: 15px;
    }
    .card-header {
      font-weight: bold;
    }
  `]
})
export class DiagnosticComponent implements OnInit {
  report: DiagnosticReport | null = null;
  loading = false;
  error = '';

  constructor(private diagnosticService: DiagnosticService) {}

  ngOnInit() {
    this.runDiagnostic();
  }

  runDiagnostic() {
    this.loading = true;
    this.error = '';

    this.diagnosticService.runFullDiagnostic()
      .subscribe({
        next: (result) => {
          this.report = result;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al ejecutar el diagnóstico: ' + err.message;
          this.loading = false;
        }
      });
  }
}
