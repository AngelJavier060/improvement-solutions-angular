import { Component } from '@angular/core';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent {
  // Las categorías de configuración que se mostrarán
  categorias = [
    { 
      nombre: 'Género', 
      descripcion: 'Gestionar los tipos de género para los empleados', 
      ruta: 'genero',
      icono: 'fas fa-venus-mars'
    },
    { 
      nombre: 'Estudios', 
      descripcion: 'Gestionar los niveles educativos', 
      ruta: 'estudio',
      icono: 'fas fa-graduation-cap'
    },
    { 
      nombre: 'Estado Civil', 
      descripcion: 'Gestionar los diferentes estados civiles', 
      ruta: 'estado-civil',
      icono: 'fas fa-ring'
    },
    { 
      nombre: 'Tipo de Residencia', 
      descripcion: 'Gestionar los tipos de residencia', 
      ruta: 'tipo-residencia',
      icono: 'fas fa-home'
    },
    { 
      nombre: 'Etnias', 
      descripcion: 'Gestionar los grupos étnicos', 
      ruta: 'etnias',
      icono: 'fas fa-users'
    },
    { 
      nombre: 'Tipo de Documento', 
      descripcion: 'Gestionar los tipos de documentos de identificación', 
      ruta: 'tipo-documento',
      icono: 'fas fa-id-card'
    },
    { 
      nombre: 'Departamentos', 
      descripcion: 'Gestionar los departamentos de la empresa', 
      ruta: 'departamentos',
      icono: 'fas fa-building'
    },
    { 
      nombre: 'Cargos', 
      descripcion: 'Gestionar los cargos disponibles en la empresa', 
      ruta: 'cargos',
      icono: 'fas fa-briefcase'
    },
    { 
      nombre: 'IESS', 
      descripcion: 'Gestionar las categorías del Instituto Ecuatoriano de Seguridad Social', 
      ruta: 'iess',
      icono: 'fas fa-hospital'
    },
    { 
      nombre: 'Tipo de Contrato', 
      descripcion: 'Gestionar los tipos de contratos laborales', 
      ruta: 'tipo-contrato',
      icono: 'fas fa-file-signature'
    }
  ];
}