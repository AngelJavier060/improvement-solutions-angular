import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  isChildRouteActive = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Verificamos la ruta inicial
    this.checkActiveChildRoute(this.router.url);
    
    // Nos suscribimos a los cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkActiveChildRoute(event.url);
    });
  }
  
  private checkActiveChildRoute(url: string) {
    // Verificamos si estamos en una subruta de configuración
    const basePath = '/dashboard/admin/configuracion';
    this.isChildRouteActive = url !== basePath && url.startsWith(basePath);
    console.log('ConfiguracionComponent - Ruta secundaria activa:', this.isChildRouteActive);
  }

  // Las categorías de configuración que se mostrarán
  categorias = [
    { 
      nombre: 'Género', 
      descripcion: 'Gestionar los tipos de género para los empleados', 
      ruta: 'genero',
      icono: 'fas fa-venus-mars',
      proximamente: false
    },    { 
      nombre: 'Estudios', 
      descripcion: 'Gestionar los niveles educativos', 
      ruta: 'estudio',
      icono: 'fas fa-graduation-cap',
      proximamente: false
    },    { 
      nombre: 'Estado Civil', 
      descripcion: 'Gestionar los diferentes estados civiles', 
      ruta: 'estado-civil',
      icono: 'fas fa-ring',
      proximamente: false
    },
    { 
      nombre: 'Tipo de Residencia', 
      descripcion: 'Gestionar los tipos de residencia', 
      ruta: 'tipo-residencia',
      icono: 'fas fa-home',
      proximamente: true
    },
    { 
      nombre: 'Etnias', 
      descripcion: 'Gestionar los grupos étnicos', 
      ruta: 'etnias',
      icono: 'fas fa-users',
      proximamente: true
    },
    { 
      nombre: 'Tipo de Documento', 
      descripcion: 'Gestionar los tipos de documentos de identificación', 
      ruta: 'tipo-documento',
      icono: 'fas fa-id-card',
      proximamente: true
    },
    { 
      nombre: 'Departamentos', 
      descripcion: 'Gestionar los departamentos de la empresa', 
      ruta: 'departamentos',
      icono: 'fas fa-building',
      proximamente: true
    },
    { 
      nombre: 'Cargos', 
      descripcion: 'Gestionar los cargos disponibles en la empresa', 
      ruta: 'cargos',
      icono: 'fas fa-briefcase',
      proximamente: true
    },
    { 
      nombre: 'IESS', 
      descripcion: 'Gestionar las categorías del Instituto Ecuatoriano de Seguridad Social', 
      ruta: 'iess',
      icono: 'fas fa-hospital',
      proximamente: true
    },
    { 
      nombre: 'Tipo de Contrato', 
      descripcion: 'Gestionar los tipos de contratos laborales', 
      ruta: 'tipo-contrato',
      icono: 'fas fa-file-signature',
      proximamente: true
    }
  ];

  navegarA(ruta: string): void {
    console.log('Navegando a:', ruta);
    this.router.navigate(['/dashboard/admin/configuracion', ruta]);
  }
}