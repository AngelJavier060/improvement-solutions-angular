import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  isChildRouteActive = false;

  constructor(private router: Router, private route: ActivatedRoute) {
    console.log('ConfiguracionComponent constructor - Current route:', this.router.url);
  }

  ngOnInit() {
    // Verificamos la ruta inicial
    this.checkActiveChildRoute(this.router.url);
    console.log('ConfiguracionComponent - Initial route check:', this.router.url, 'Child route active:', this.isChildRouteActive);
    
    // Nos suscribimos a los cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkActiveChildRoute(event.url);
      console.log('ConfiguracionComponent - Route changed:', event.url, 'Child route active:', this.isChildRouteActive);
    });
  }
  
  private checkActiveChildRoute(url: string) {
    // Verificamos si estamos en una subruta de configuración
    const basePath = '/dashboard/admin/configuracion';
    this.isChildRouteActive = url !== basePath && url.startsWith(basePath);
    console.log('ConfiguracionComponent - Ruta secundaria activa:', this.isChildRouteActive, 'URL:', url);
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
    },    { 
      nombre: 'Tipo de Residencia', 
      descripcion: 'Gestionar los tipos de residencia', 
      ruta: 'tipo-residencia',
      icono: 'fas fa-home',
      proximamente: false
    },    { 
      nombre: 'Etnias', 
      descripcion: 'Gestionar los grupos étnicos', 
      ruta: 'etnias',
      icono: 'fas fa-users',
      proximamente: false
    },    { 
      nombre: 'Tipo de Documento', 
      descripcion: 'Gestionar los tipos de documentos de identificación', 
      ruta: 'tipo-documento',
      icono: 'fas fa-id-card',
      proximamente: false
    },
    { 
      nombre: 'Departamentos', 
      descripcion: 'Gestionar los departamentos de la empresa', 
      ruta: 'departamentos',
      icono: 'fas fa-building',
      proximamente: false
    },    { 
      nombre: 'Cargos', 
      descripcion: 'Gestionar los cargos disponibles en la empresa', 
      ruta: 'cargos',
      icono: 'fas fa-briefcase',
      proximamente: false
    },    { 
      nombre: 'Código Sectorial IESS', 
      descripcion: 'Gestionar las categorías del Instituto Ecuatoriano de Seguridad Social', 
      ruta: 'iess',
      icono: 'fas fa-hospital',
      proximamente: false
    },    { 
      nombre: 'Tipo de Contrato', 
      descripcion: 'Gestionar los tipos de contratos laborales', 
      ruta: 'tipo-contrato',
      icono: 'fas fa-file-signature',
      proximamente: false
    },
    {
      nombre: 'Matriz Legal',
      descripcion: 'Gestionar las matrices legales de obligación',
      ruta: 'matriz-legal',
      icono: 'fas fa-balance-scale',
      proximamente: false
    },
  ];
  navegarA(ruta: string): void {
    console.log('Navegando a:', ruta);
    console.log('Ruta completa:', '/dashboard/admin/configuracion/' + ruta);
    // Método corregido para asegurar una navegación adecuada
    this.router.navigate([ruta], { relativeTo: this.route })
      .then(success => console.log(`Navegación a ${ruta} ${success ? 'exitosa' : 'fallida'}`))
      .catch(error => console.error(`Error al navegar a ${ruta}:`, error));
  }

  opciones = [
    {
      nombre: 'Tipo de Documento',
      descripcion: 'Gestionar los tipos de documentos de identidad',
      ruta: '/dashboard/admin/configuracion/tipo-documento',
      icono: 'fa-id-card'
    },
    {
      nombre: 'Departamentos',
      descripcion: 'Gestionar los departamentos de la empresa',
      ruta: '/dashboard/admin/configuracion/departamentos',
      icono: 'fa-building'
    },    {
      nombre: 'Cargos',
      descripcion: 'Gestionar los cargos de la empresa',
      ruta: '/dashboard/admin/configuracion/cargos',
      icono: 'fa-briefcase',
      proximamente: false
    },    {
      nombre: 'IESS',
      descripcion: 'Configuración de aportaciones IESS',
      ruta: '/dashboard/admin/configuracion/iess',
      icono: 'fa-percentage',
      proximamente: false
    },
    {
      nombre: 'Tipo de Contrato',
      descripcion: 'Gestionar los tipos de contrato',
      ruta: '#',
      icono: 'fa-file-contract',
      proximamente: true
    }
  ];
}