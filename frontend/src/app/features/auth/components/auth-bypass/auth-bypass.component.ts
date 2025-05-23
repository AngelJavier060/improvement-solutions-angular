import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-auth-bypass',
  template: `
    <div class="auth-bypass-container">
      <div class="auth-bypass-card">
        <h2>Autenticación directa (Modo de emergencia)</h2>
        <p>Este modo permite autenticarse directamente sin pasar por el interceptor Auth.</p>
        
        <form [formGroup]="bypassForm" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label for="username">Usuario</label>
            <input 
              type="text" 
              id="username" 
              formControlName="username"
              class="form-control" 
              placeholder="Nombre de usuario"
            >
            <div *ngIf="bypassForm.get('username')?.invalid && bypassForm.get('username')?.touched" class="error-message">
              El nombre de usuario es obligatorio
            </div>
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              class="form-control" 
              placeholder="Contraseña"
            >
            <div *ngIf="bypassForm.get('password')?.invalid && bypassForm.get('password')?.touched" class="error-message">
              La contraseña es obligatoria
            </div>
          </div>
          
          <div class="action-bar">
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="bypassForm.invalid || isLoading"
            >
              {{ isLoading ? 'Autenticando...' : 'Iniciar sesión' }}
            </button>
            
            <button 
              type="button" 
              class="btn btn-link"
              (click)="runDiagnostics()"
            >
              Ejecutar diagnóstico
            </button>
          </div>
          
          <div *ngIf="loginError" class="alert alert-danger mt-3">
            {{ loginError }}
          </div>
          
          <div *ngIf="loginSuccess" class="alert alert-success mt-3">
            {{ loginSuccess }}
          </div>
        </form>
        
        <div *ngIf="diagnosticResult" class="diagnostic-results mt-4">
          <h3>Resultados del diagnóstico</h3>
          <pre>{{ diagnosticResult | json }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-bypass-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      background-color: #f5f5f5;
    }
    
    .auth-bypass-card {
      width: 100%;
      max-width: 500px;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    h2 {
      margin-bottom: 20px;
      color: #333;
      text-align: center;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }
    
    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    
    .btn-primary {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-primary:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .btn-link {
      color: #007bff;
      text-decoration: underline;
      background: none;
      border: none;
      cursor: pointer;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.85rem;
      margin-top: 5px;
    }
    
    .diagnostic-results {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    pre {
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
})
export class AuthBypassComponent implements OnInit {
  bypassForm: FormGroup;
  isLoading = false;
  loginError: string | null = null;
  loginSuccess: string | null = null;
  diagnosticResult: any = null;
  
  private baseUrl = environment.apiUrl || 'http://localhost:8080/api/v1';
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.bypassForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('AuthBypassComponent inicializado');
    console.log('Base URL:', this.baseUrl);
  }
  
  onLogin(): void {
    if (this.bypassForm.invalid) {
      return;
    }
    
    this.isLoading = true;
    this.loginError = null;
    this.loginSuccess = null;
    
    const credentials = this.bypassForm.value;
    
    // Usar la ruta especial de bypass que saltará los problemas de CORS e interceptores
    this.http.post<any>(`${this.baseUrl}/public/diagnostic/auth-bypass`, credentials)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Autenticación exitosa', response);
          
          if (response && response.token) {
            // Guardar token en localStorage
            localStorage.setItem('auth_token', response.token);
            
            // Guardar información de usuario
            if (response.userDetail) {
              localStorage.setItem('current_user', JSON.stringify(response.userDetail));
            }
            
            this.loginSuccess = 'Autenticación exitosa. Redireccionando...';
            
            // Redireccionar después de 2 segundos
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 2000);
          } else {
            this.loginError = 'Respuesta inválida del servidor';
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error de autenticación', err);
          
          if (err.status === 0) {
            this.loginError = 'No se pudo conectar con el servidor. Verifique su conexión.';
          } else if (err.status === 401) {
            this.loginError = 'Credenciales incorrectas. Intente nuevamente.';
          } else {
            this.loginError = `Error del servidor: ${err.status} - ${err.statusText || 'Desconocido'}`;
          }
          
          // Intentar mostrar más detalles si están disponibles
          if (err.error && typeof err.error === 'object') {
            this.loginError += ` (${err.error.message || JSON.stringify(err.error)})`;
          }
        }
      });
  }
  
  runDiagnostics(): void {
    this.isLoading = true;
    this.diagnosticResult = null;
    
    // Ejecutar una serie de pruebas diagnósticas
    Promise.all([
      // 1. Verificar salud del servidor
      this.http.get<any>(`${this.baseUrl}/public/diagnostic/health`).toPromise().catch(err => ({ error: err })),
      
      // 2. Verificar configuración CORS
      this.http.get<any>(`${this.baseUrl}/public/diagnostic/cors`).toPromise().catch(err => ({ error: err })),
      
      // 3. Verificar información de autenticación actual (si hay alguna)
      this.http.get<any>(`${this.baseUrl}/public/diagnostic/auth-info`).toPromise().catch(err => ({ error: err }))
    ]).then(results => {
      this.isLoading = false;
      
      this.diagnosticResult = {
        serverHealth: results[0],
        corsConfiguration: results[1],
        authInfo: results[2],
        browserInfo: {
          userAgent: navigator.userAgent,
          localStorage: localStorage.getItem('auth_token') ? 'Token presente' : 'Token ausente'
        }
      };
    }).catch(error => {
      this.isLoading = false;
      this.diagnosticResult = {
        error: 'Error al ejecutar diagnóstico',
        details: error.message
      };
    });
  }
}
