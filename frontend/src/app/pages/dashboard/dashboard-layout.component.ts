import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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
  `
})
export class DashboardLayoutComponent implements OnInit {
  currentUser: any = null;
  businessInfo: any = null;
  ruc: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener RUC de la ruta
    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      console.log('RUC actual:', this.ruc);
    });

    // Obtener información del usuario
    this.currentUser = this.authService.getCurrentUser();
    console.log('Usuario actual:', this.currentUser);

    if (this.currentUser?.business) {
      this.businessInfo = this.currentUser.business;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
