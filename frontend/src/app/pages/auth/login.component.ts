import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Logo y Header -->
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
            Improvement Solutions
          </h2>
          <p class="mt-2 text-sm text-gray-600">
            Accede a tu plataforma empresarial
          </p>
        </div>

        <!-- Formulario de Login -->
        <div class="bg-white py-8 px-6 shadow-xl rounded-lg">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <!-- Campo Usuario -->
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  formControlName="username"
                  type="text"
                  autocomplete="username"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingresa tu usuario"
                />
                <div *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" 
                     class="mt-1 text-sm text-red-600">
                  Usuario es requerido
                </div>
              </div>
            </div>

            <!-- Campo Contraseña -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  formControlName="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingresa tu contraseña"
                />
                <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" 
                     class="mt-1 text-sm text-red-600">
                  Contraseña es requerida
                </div>
              </div>
            </div>

            <!-- Mensaje de Error -->
            <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-3">
              <p class="text-sm text-red-600">{{ errorMessage }}</p>
            </div>

            <!-- Botón Submit -->
            <div>
              <button
                type="submit"
                [disabled]="loginForm.invalid || isLoading"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span *ngIf="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
                {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="text-center text-sm text-gray-500">
          <p>&copy; 2025 Improvement Solutions. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Si ya está autenticado, redirigir
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user?.business?.ruc) {
        this.router.navigate([`/${user.business.ruc}/dashboard`]);
      }
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Obtener información del usuario
          const user = this.authService.getCurrentUser();
          
          if (user?.business?.ruc) {
            // Redirigir al dashboard de la empresa
            this.router.navigate([`/${user.business.ruc}/dashboard`]);
          } else {
            this.errorMessage = 'No se encontró información de empresa asociada';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error al iniciar sesión';
        }
      });
    }
  }
}
