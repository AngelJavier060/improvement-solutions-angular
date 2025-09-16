import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

interface Service {
  id: string;
  title: string;
  icon: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <!-- Hero Section -->
      <div class="text-center py-12 px-4">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          IMPROVEMENT SOLUTIONS AGRADECE LA CONFIANZA DE ORIENTOIL S.A.;
        </h1>
        <h2 class="text-2xl md:text-3xl font-semibold text-blue-600 mb-8">
          NUESTRA MOTIVACIÓN ES SU CONFIANZA Y NUESTRO COMPROMISO, LA SOLUCIÓN ÓPTIMA.
        </h2>
      </div>

      <!-- Services Grid -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Fila Superior -->
          <div 
            *ngFor="let service of services.slice(0, 5)" 
            (click)="navigateToService(service)"
            class="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border border-gray-200"
          >
            <div class="p-6 text-center">
              <!-- Icono -->
              <div class="flex justify-center mb-4">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <i [class]="service.icon" class="text-3xl text-blue-600"></i>
                </div>
              </div>
              
              <!-- Título -->
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                {{ service.title }}
              </h3>
              
              <!-- Descripción -->
              <p class="text-sm text-gray-600">
                {{ service.description }}
              </p>
              
              <!-- Badge si está disponible -->
              <div class="mt-4">
                <span *ngIf="service.id === 'mantenimiento'" 
                      class="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                  características opcionales
                </span>
                <span *ngIf="service.id === 'logistica'" 
                      class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  juego
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fila Inferior (3 servicios centrados) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 max-w-4xl mx-auto">
          <div 
            *ngFor="let service of services.slice(5)" 
            (click)="navigateToService(service)"
            class="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border border-gray-200"
          >
            <div class="p-6 text-center">
              <!-- Icono -->
              <div class="flex justify-center mb-4">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <i [class]="service.icon" class="text-3xl text-blue-600"></i>
                </div>
              </div>
              
              <!-- Título -->
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                {{ service.title }}
              </h3>
              
              <!-- Descripción -->
              <p class="text-sm text-gray-600">
                {{ service.description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Message -->
      <div class="text-center py-8 text-gray-600">
        <p class="text-lg">Selecciona un servicio para comenzar</p>
      </div>
    </div>
  `,
  styles: [`
    .service-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
  `]
})
export class LandingPageComponent implements OnInit {
  ruc: string = '';
  
  services: Service[] = [
    {
      id: 'talento-humano',
      title: 'Talento Humano',
      icon: 'fas fa-users',
      description: 'Gestión completa de recursos humanos y personal',
      route: 'empleados'
    },
    {
      id: 'seguridad-industrial',
      title: 'Seguridad Industrial', 
      icon: 'fas fa-shield-alt',
      description: 'Protocolos y normativas de seguridad industrial',
      route: 'seguridad-industrial'
    },
    {
      id: 'medico',
      title: 'Médico',
      icon: 'fas fa-stethoscope',
      description: 'Servicios médicos y salud ocupacional',
      route: 'medico'
    },
    {
      id: 'calidad',
      title: 'Calidad',
      icon: 'fas fa-award',
      description: 'Control y aseguramiento de la calidad',
      route: 'calidad'
    },
    {
      id: 'mantenimiento',
      title: 'Mantenimiento',
      icon: 'fas fa-tools',
      description: 'Gestión y control de mantenimiento',
      route: 'mantenimiento'
    },
    {
      id: 'medio-ambiente',
      title: 'Medio Ambiente',
      icon: 'fas fa-leaf',
      description: 'Gestión ambiental y sostenibilidad',
      route: 'medio-ambiente'
    },
    {
      id: 'produccion',
      title: 'Producción',
      icon: 'fas fa-industry',
      description: 'Control y optimización de procesos productivos',
      route: 'produccion'
    },
    {
      id: 'logistica',
      title: 'Logística',
      icon: 'fas fa-truck',
      description: 'Gestión logística y cadena de suministro',
      route: 'logistica'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener RUC de la ruta padre
    this.route.parent?.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      console.log('RUC en landing page:', this.ruc);
    });
  }

  navigateToService(service: Service): void {
    console.log('Navegando a servicio:', service.title);
    // Navegar a la ruta específica del servicio
    this.router.navigate([`/${this.ruc}/${service.route}`]);
  }
}
