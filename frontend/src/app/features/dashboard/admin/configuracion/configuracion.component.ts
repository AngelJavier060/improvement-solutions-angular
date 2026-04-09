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
      nombre: 'Documentos personales', 
      descripcion: 'Gestionar los tipos de documentos personales', 
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
    {
      nombre: 'Empresas Contratistas',
      descripcion: 'Gestionar empresas contratistas y sus bloques operativos',
      ruta: 'empresas-contratistas',
      icono: 'fas fa-industry',
      proximamente: false
    },
    {
      nombre: 'Cursos y certificaciones',
      descripcion: 'Gestionar catálogo de cursos y certificaciones',
      ruta: 'cursos-certificaciones',
      icono: 'fas fa-certificate',
      proximamente: false
    },
    {
      nombre: 'Tarjetas',
      descripcion: 'Gestionar catálogo de tarjetas',
      ruta: 'tarjetas',
      icono: 'fas fa-id-badge',
      proximamente: false
    },
    {
      nombre: 'Inventario - Categorías',
      descripcion: 'Gestionar el catálogo general de categorías de productos de inventario',
      ruta: 'inventario-categorias',
      icono: 'fas fa-tags',
      proximamente: false
    },
    {
      nombre: 'Inventario - Proveedores',
      descripcion: 'Gestionar el catálogo general de proveedores de inventario',
      ruta: 'inventario-proveedores',
      icono: 'fas fa-truck',
      proximamente: false
    },
    {
      nombre: 'Jornadas de Trabajo',
      descripcion: 'Gestionar las jornadas de trabajo del personal (Ej: 14x7, 5x2)',
      ruta: 'jornadas-trabajo',
      icono: 'fas fa-calendar-alt',
      proximamente: false
    },
    {
      nombre: 'Horarios de Trabajo',
      descripcion: 'Gestionar los horarios de trabajo del personal (Ej: Diurno, Nocturno, Rotativo)',
      ruta: 'horarios-trabajo',
      icono: 'fas fa-clock',
      proximamente: false
    },
  ];

  // Secciones organizadas para la vista de configuración
  secciones = [
    {
      titulo: 'Recursos Humanos',
      descripcion: 'Gestión de parámetros de personal y estructura organizacional.',
      icono: 'fas fa-users',
      colorClase: 'seccion-rrhh',
      categorias: [
        { nombre: 'Género', descripcion: 'Gestionar los tipos de género para los empleados', ruta: 'genero', icono: 'fas fa-venus-mars', proximamente: false },
        { nombre: 'Estudios / Educación', descripcion: 'Gestionar los niveles educativos', ruta: 'estudio', icono: 'fas fa-graduation-cap', proximamente: false },
        { nombre: 'Estado Civil', descripcion: 'Gestionar los diferentes estados civiles', ruta: 'estado-civil', icono: 'fas fa-ring', proximamente: false },
        { nombre: 'Tipo de Residencia', descripcion: 'Gestionar los tipos de residencia', ruta: 'tipo-residencia', icono: 'fas fa-home', proximamente: false },
        { nombre: 'Etnias', descripcion: 'Gestionar los grupos étnicos', ruta: 'etnias', icono: 'fas fa-users', proximamente: false },
        { nombre: 'Documentos personales', descripcion: 'Gestionar los tipos de documentos personales', ruta: 'tipo-documento', icono: 'fas fa-id-card', proximamente: false },
        { nombre: 'Departamentos', descripcion: 'Gestionar los departamentos de la empresa', ruta: 'departamentos', icono: 'fas fa-building', proximamente: false },
        { nombre: 'Cargos', descripcion: 'Gestionar los cargos disponibles en la empresa', ruta: 'cargos', icono: 'fas fa-briefcase', proximamente: false },
        { nombre: 'Cursos y certificaciones', descripcion: 'Gestionar catálogo de cursos y certificaciones', ruta: 'cursos-certificaciones', icono: 'fas fa-certificate', proximamente: false },
        { nombre: 'Jornadas de Trabajo', descripcion: 'Gestionar las jornadas de trabajo del personal', ruta: 'jornadas-trabajo', icono: 'fas fa-calendar-alt', proximamente: false },
        { nombre: 'Horarios de Trabajo', descripcion: 'Gestionar los horarios de trabajo del personal', ruta: 'horarios-trabajo', icono: 'fas fa-clock', proximamente: false },
      ]
    },
    {
      titulo: 'Configuración General',
      descripcion: 'Parámetros legales, contractuales y sectorización.',
      icono: 'fas fa-cogs',
      colorClase: 'seccion-general',
      categorias: [
        { nombre: 'Código Sectorial IESS', descripcion: 'Gestionar las categorías del IESS', ruta: 'iess', icono: 'fas fa-hospital', proximamente: false },
        { nombre: 'Tipo de Contrato', descripcion: 'Gestionar los tipos de contratos laborales', ruta: 'tipo-contrato', icono: 'fas fa-file-signature', proximamente: false },
        { nombre: 'Matriz Legal', descripcion: 'Gestionar las matrices legales de obligación', ruta: 'matriz-legal', icono: 'fas fa-balance-scale', proximamente: false },
        { nombre: 'Empresas Contratistas', descripcion: 'Gestionar empresas contratistas y sus bloques', ruta: 'empresas-contratistas', icono: 'fas fa-industry', proximamente: false },
      ]
    },
    {
      titulo: 'Mantenimiento Automotriz',
      descripcion: 'Configuración técnica de flota, vehículos y logística de transporte.',
      icono: 'fas fa-car',
      colorClase: 'seccion-automotriz',
      categorias: [
        { nombre: 'Marca de vehículo', descripcion: 'Catálogo de fabricantes y marcas soportadas', ruta: 'marca-vehiculo', icono: 'fas fa-copyright', proximamente: false },
        { nombre: 'Clase', descripcion: 'Clases de unidad (trailer, cabezal, etc.) asignables por empresa', ruta: 'clase-vehiculo', icono: 'fas fa-layer-group', proximamente: false },
        { nombre: 'Entidad remitente', descripcion: 'Origen remitente para trazabilidad operativa', ruta: 'entidad-remitente', icono: 'fas fa-building', proximamente: false },
        { nombre: 'Tipos de vehículo', descripcion: 'Clasificación (SUV, Sedán, Camión, etc)', ruta: 'tipo-vehiculo', icono: 'fas fa-truck', proximamente: false },
        { nombre: 'Tipos de combustible', descripcion: 'Gestión de Gasolina, Diesel, Eléctrico', ruta: 'tipo-combustible', icono: 'fas fa-gas-pump', proximamente: false },
        { nombre: 'Colores', descripcion: 'Paleta de colores oficiales de la flota', ruta: 'color-vehiculo', icono: 'fas fa-palette', proximamente: false },
        { nombre: 'Estado de unidad', descripcion: 'Activo, En reparación, Siniestro', ruta: 'estado-unidad', icono: 'fas fa-tools', proximamente: false },
        { nombre: 'Transmisión', descripcion: 'Manual, Automática, Semiautomática', ruta: 'transmision', icono: 'fas fa-cogs', proximamente: false },
        { nombre: 'Propietario/Empresa', descripcion: 'Registro de titularidad y leasing', ruta: 'propietario-vehiculo', icono: 'fas fa-user-tie', proximamente: false },
        { nombre: 'Tipo de documentos', descripcion: 'Seguros, matrículas y revisiones', ruta: 'tipo-documento-vehiculo', icono: 'fas fa-file-alt', proximamente: false },
        { nombre: 'Unidades de medida', descripcion: 'Km, Millas, Litros, Galones', ruta: 'unidad-medida', icono: 'fas fa-ruler', proximamente: false },
        { nombre: 'Ubicación/Rutas', descripcion: 'Asignación de zonas geográficas', ruta: 'ubicacion-ruta', icono: 'fas fa-route', proximamente: false },
        { nombre: 'País de origen', descripcion: 'Regulación por origen de fabricación', ruta: 'pais-origen', icono: 'fas fa-globe', proximamente: false },
        { nombre: 'Número de ejes', descripcion: 'Catálogo de ejes (2, 3, 4+ ejes, etc.)', ruta: 'numero-eje', icono: 'fas fa-grip-lines', proximamente: false },
        { nombre: 'Configuración de ejes', descripcion: 'Distribución y tipo de configuración de ejes', ruta: 'configuracion-eje', icono: 'fas fa-truck-monster', proximamente: false },
      ]
    },
    {
      titulo: 'Evaluación de Riesgo — Gerencia de Viajes',
      descripcion: 'Configuración de parámetros de seguridad y logística para viajes en ruta.',
      icono: 'fas fa-map-marked-alt',
      colorClase: 'seccion-viajes',
      categorias: [
        { nombre: 'Distancia a recorrer', descripcion: 'Gestionar parámetros de distancia para rutas', ruta: 'distancia-recorrer', icono: 'fas fa-road', proximamente: false },
        { nombre: 'Tipo de vía', descripcion: 'Definir categorías de tipos de carreteras', ruta: 'tipo-via', icono: 'fas fa-map-signs', proximamente: false },
        { nombre: 'Condiciones climáticas', descripcion: 'Configurar factores de clima permitidos', ruta: 'condicion-climatica', icono: 'fas fa-cloud-sun', proximamente: false },
        { nombre: 'Horario de circulación', descripcion: 'Establecer rangos horarios de operación', ruta: 'horario-circulacion', icono: 'fas fa-clock', proximamente: false },
        { nombre: 'Estado de carretera', descripcion: 'Configurar estados de carreteras para evaluación', ruta: 'estado-carretera', icono: 'fas fa-road', proximamente: false },
        { nombre: 'Tipo de carga', descripcion: 'Clasificar tipos de carga para evaluación de riesgo', ruta: 'tipo-carga', icono: 'fas fa-boxes', proximamente: false },
        { nombre: 'Horas de conducción', descripcion: 'Parámetros de horas máximas de conducción', ruta: 'hora-conduccion', icono: 'fas fa-steering-wheel', proximamente: false },
        { nombre: 'Horas de descanso', descripcion: 'Parámetros de descanso obligatorio para conductores', ruta: 'hora-descanso', icono: 'fas fa-bed', proximamente: false },
        { nombre: 'Otros peligros', descripcion: 'Parámetros de otros peligros presentes en ruta (catálogo operativo)', ruta: 'medio-comunicacion', icono: 'fas fa-exclamation-circle', proximamente: false },
        { nombre: 'Medidas de Control para el viaje', descripcion: 'Opciones de medidas de control aplicables al viaje', ruta: 'transporta-pasajero', icono: 'fas fa-clipboard-check', proximamente: false },
        {
          nombre: 'Posibles riesgos en la vía',
          descripcion: 'Catálogo de posibles riesgos en la vía (parametrizable por empresa en administración)',
          ruta: 'posible-riesgo-via',
          icono: 'fas fa-exclamation-triangle',
          proximamente: false
        },
        {
          nombre: 'Metodologías de Riesgo',
          descripcion: 'Plantillas y parámetros IPER, GTC-45 y otras metodologías (distancias, matrices, etc.)',
          ruta: 'aceptacion-riesgo',
          icono: 'fas fa-shield-alt',
          proximamente: false
        },
      ]
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
      nombre: 'Documentos personales',
      descripcion: 'Gestionar los tipos de documentos personales',
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
    },
    {
      nombre: 'Cursos y certificaciones',
      descripcion: 'Gestionar catálogo de cursos y certificaciones',
      ruta: '/dashboard/admin/configuracion/cursos-certificaciones',
      icono: 'fa-certificate',
      proximamente: false
    },
    {
      nombre: 'Tarjetas',
      descripcion: 'Gestionar catálogo de tarjetas',
      ruta: '/dashboard/admin/configuracion/tarjetas',
      icono: 'fa-id-badge',
      proximamente: false
    }
  ];
}