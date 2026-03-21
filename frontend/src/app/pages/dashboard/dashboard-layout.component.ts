import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IdleTimeoutService } from '../../core/services/idle-timeout.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <!-- Logo y empresa -->
            <div class="flex items-center space-x-4">
              <h1 class="text-xl font-semibold text-gray-900">
                Improvement Solutions
              </h1>
              <div *ngIf="businessInfo" class="text-sm text-gray-500">
                <span class="font-medium">{{ businessInfo.name }}</span>
                <span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  RUC: {{ businessInfo.ruc }}
                </span>
              </div>
            </div>

            <!-- Usuario y logout -->
            <div class="flex items-center space-x-4">
              <div *ngIf="currentUser" class="text-right">
                <p class="text-sm font-medium text-gray-900">{{ currentUser.name }}</p>
                <p class="text-xs text-gray-500">{{ currentUser.email }}</p>
              </div>
              <button
                (click)="logout()"
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Contenido Principal -->
      <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>
    </div>

    <!-- Banner de Inactividad -->
    <div *ngIf="idleTimeout.showWarning"
         style="position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1a1b21;color:#fff;
                display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;
                box-shadow:0 -4px 24px rgba(0,0,0,0.3);">
      <div style="display:flex;align-items:center;gap:1rem;">
        <span style="font-size:1.5rem;">⚠️</span>
        <div>
          <p style="margin:0;font-weight:700;font-size:0.95rem;">Sesión por expirar</p>
          <p style="margin:0;font-size:0.8rem;opacity:0.8;">
            Su sesión se cerrará en <strong>{{ idleTimeout.secondsRemaining }}</strong> segundos por inactividad.
          </p>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;">
        <button (click)="idleTimeout.continueSession()"
                style="background:#002b7d;color:#fff;border:none;padding:0.625rem 1.5rem;
                       border-radius:0.5rem;font-weight:700;cursor:pointer;font-size:0.875rem;">
          Continuar sesión
        </button>
        <button (click)="logout()"
                style="background:#6c0008;color:#fff;border:none;padding:0.625rem 1.5rem;
                       border-radius:0.5rem;font-weight:700;cursor:pointer;font-size:0.875rem;">
          Cerrar sesión ahora
        </button>
      </div>
    </div>
  `
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  businessInfo: any = null;
  ruc: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public idleTimeout: IdleTimeoutService
  ) {}

  ngOnInit(): void {
    // Obtener RUC de la ruta
    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
    });

    // Obtener información del usuario
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser?.business) {
      this.businessInfo = this.currentUser.business;
    }

    // Iniciar vigilancia de inactividad (15 minutos)
    this.idleTimeout.start();
  }

  ngOnDestroy(): void {
    this.idleTimeout.stop();
  }

  logout(): void {
    this.idleTimeout.stop();
    this.authService.logout();
  }
}
