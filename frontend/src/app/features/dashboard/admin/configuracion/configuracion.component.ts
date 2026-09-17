import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/** Tarjeta de acceso a un catálogo de configuración (ruta simple o varios segmentos). */
export interface CategoriaConfiguracionCard {
  nombre: string;
  descripcion: string;
  ruta: string;
  /** Si existe, navegación relativa multi-segmento (p. ej. ISO 9001). */
  rutaCommands?: string[];
  icono: string;
  proximamente: boolean;
}

interface HubScrollPos {
  windowY: number;
  mainY: number;
}

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  isChildRouteActive = false;

  private static readonly HUB_SCROLL_KEY = 'admin.configuracion.hubScroll';
  private static readonly HUB_PATH = '/dashboard/admin/configuracion';
  private routeSub?: Subscription;

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.checkActiveChildRoute(this.router.url);
    if (!this.isChildRouteActive) {
      this.scheduleHubScrollRestore();
    }

    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        const wasChild = this.isChildRouteActive;
        const url = event.urlAfterRedirects || event.url;
        this.checkActiveChildRoute(url);
        // Al volver al hub desde un catálogo, restaurar la posición de scroll
        if (wasChild && !this.isChildRouteActive) {
          this.scheduleHubScrollRestore();
        }
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private checkActiveChildRoute(url: string) {
    const path = this.normalizeHubPath(url);
    this.isChildRouteActive = path.startsWith(ConfiguracionComponent.HUB_PATH + '/');
  }

  /** Quita locale (`/en-US`) para detectar bien el hub vs. un catálogo hijo. */
  private normalizeHubPath(url: string): string {
    const path = (url || '').split('?')[0].split('#')[0];
    return path.replace(/^\/[a-z]{2}-[A-Z]{2}(?=\/)/, '') || path;
  }

  private captureScroll(): HubScrollPos {
    const main = document.querySelector('main.main-content') as HTMLElement | null;
    return {
      windowY: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
      mainY: main ? main.scrollTop : 0
    };
  }

  /** Guarda la posición del hub antes de entrar a un catálogo. */
  private persistHubScroll(): void {
    try {
      sessionStorage.setItem(ConfiguracionComponent.HUB_SCROLL_KEY, JSON.stringify(this.captureScroll()));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private readHubScroll(): HubScrollPos | null {
    try {
      const raw = sessionStorage.getItem(ConfiguracionComponent.HUB_SCROLL_KEY);
      if (!raw) {
        return null;
      }
      const pos = JSON.parse(raw) as HubScrollPos;
      if (typeof pos?.windowY !== 'number' || typeof pos?.mainY !== 'number') {
        return null;
      }
      return pos;
    } catch {
      return null;
    }
  }

  private applyScroll(pos: HubScrollPos): void {
    const main = document.querySelector('main.main-content') as HTMLElement | null;
    if (main) {
      main.scrollTop = pos.mainY;
    }
    window.scrollTo(0, pos.windowY);
    document.documentElement.scrollTop = pos.windowY;
    document.body.scrollTop = pos.windowY;
  }

  /**
   * Restaura el scroll tras recrear el hub (*ngIf).
   * Varios intentos porque el layout/contenido se monta de forma asíncrona.
   */
  private scheduleHubScrollRestore(): void {
    const pos = this.readHubScroll();
    if (!pos) {
      return;
    }
    const apply = () => this.applyScroll(pos);
    requestAnimationFrame(apply);
    setTimeout(apply, 0);
    setTimeout(apply, 50);
    setTimeout(apply, 150);
    setTimeout(apply, 300);
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
        { nombre: 'Tarjetas', descripcion: 'Catálogo global de tarjetas de personal. Las empresas (p. ej. Orientoil) eligen cuáles consumir.', ruta: 'tarjetas', icono: 'fas fa-id-badge', proximamente: false },
        { nombre: 'Cursos y certificaciones', descripcion: 'Gestionar catálogo de cursos y certificaciones', ruta: 'cursos-certificaciones', icono: 'fas fa-certificate', proximamente: false },
        { nombre: 'Documentos personales', descripcion: 'Gestionar los tipos de documentos personales', ruta: 'tipo-documento', icono: 'fas fa-id-card', proximamente: false },
        { nombre: 'Género', descripcion: 'Gestionar los tipos de género para los empleados', ruta: 'genero', icono: 'fas fa-venus-mars', proximamente: false },
        { nombre: 'Estudios / Educación', descripcion: 'Gestionar los niveles educativos', ruta: 'estudio', icono: 'fas fa-graduation-cap', proximamente: false },
        { nombre: 'Estado Civil', descripcion: 'Gestionar los diferentes estados civiles', ruta: 'estado-civil', icono: 'fas fa-ring', proximamente: false },
        { nombre: 'Tipo de Residencia', descripcion: 'Gestionar los tipos de residencia', ruta: 'tipo-residencia', icono: 'fas fa-home', proximamente: false },
        { nombre: 'Etnias', descripcion: 'Gestionar los grupos étnicos', ruta: 'etnias', icono: 'fas fa-users', proximamente: false },
        { nombre: 'Departamentos', descripcion: 'Gestionar los departamentos de la empresa', ruta: 'departamentos', icono: 'fas fa-building', proximamente: false },
        { nombre: 'Cargos', descripcion: 'Gestionar los cargos disponibles en la empresa', ruta: 'cargos', icono: 'fas fa-briefcase', proximamente: false },
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
        { nombre: 'Entidad remitente', descripcion: 'Quién emite el documento y en qué grupo (Legales, Certificaciones, Liberaciones o Adicionales)', ruta: 'entidad-remitente', icono: 'fas fa-building', proximamente: false },
        { nombre: 'Tipos de vehículo', descripcion: 'Clasificación (SUV, Sedán, Camión, etc)', ruta: 'tipo-vehiculo', icono: 'fas fa-truck', proximamente: false },
        { nombre: 'Tipos de combustible', descripcion: 'Gestión de Gasolina, Diesel, Eléctrico', ruta: 'tipo-combustible', icono: 'fas fa-gas-pump', proximamente: false },
        { nombre: 'Colores', descripcion: 'Paleta de colores oficiales de la flota', ruta: 'color-vehiculo', icono: 'fas fa-palette', proximamente: false },
        { nombre: 'Estado de unidad', descripcion: 'Activo, En reparación, Siniestro', ruta: 'estado-unidad', icono: 'fas fa-tools', proximamente: false },
        { nombre: 'Transmisión', descripcion: 'Manual, Automática, Semiautomática', ruta: 'transmision', icono: 'fas fa-cogs', proximamente: false },
        { nombre: 'Propietario/Empresa', descripcion: 'Registro de titularidad y leasing', ruta: 'propietario-vehiculo', icono: 'fas fa-user-tie', proximamente: false },
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
        { nombre: 'Medios de comunicación', descripcion: 'Catálogo de medios de comunicación para la evaluación (con metodología de riesgo)', ruta: 'medio-comunicacion', icono: 'fas fa-broadcast-tower', proximamente: false },
        { nombre: 'Pasajeros', descripcion: 'Catálogo asociado al factor pasajeros en la metodología de riesgo', ruta: 'transporta-pasajero', icono: 'fas fa-user-friends', proximamente: false },
        {
          nombre: 'Otros peligros',
          descripcion: 'Registro descriptivo de otros peligros (nombre y descripción, sin metodología)',
          ruta: 'otros-peligros-viaje',
          icono: 'fas fa-exclamation-circle',
          proximamente: false
        },
        {
          nombre: 'Posibles riesgos en la vía',
          descripcion: 'Catálogo descriptivo de riesgos en la vía (nombre y descripción, sin metodología)',
          ruta: 'posible-riesgo-via',
          icono: 'fas fa-exclamation-triangle',
          proximamente: false
        },
        {
          nombre: 'Medidas de control tomadas para el viaje',
          descripcion: 'Registro descriptivo de medidas de control aplicadas (nombre y descripción, sin metodología)',
          ruta: 'medidas-control-tomadas-viaje',
          icono: 'fas fa-clipboard-list',
          proximamente: false
        },
        {
          nombre: 'Metodologías de Riesgo',
          descripcion: 'Plantillas y parámetros IPER, GTC-45 y otras metodologías (distancias, matrices, etc.)',
          ruta: 'aceptacion-riesgo',
          icono: 'fas fa-shield-alt',
          proximamente: false
        },
      ],
      modulosAdicionales: [
        {
          titulo: 'Sistema de Gestión ISO 9001-2018',
          descripcion: 'Parámetros con nombre y descripción para documentación y estandarización.',
          categorias: [
            {
              nombre: 'Tipo de Documento',
              descripcion: 'Catálogo de tipos de documento (nombre y descripción).',
              ruta: 'iso-9001',
              rutaCommands: ['iso-9001', 'tipo-documento'],
              icono: 'fas fa-file-alt',
              proximamente: false
            },
            {
              nombre: 'Proceso',
              descripcion: 'Catálogo de procesos (nombre y descripción).',
              ruta: 'iso-9001',
              rutaCommands: ['iso-9001', 'proceso'],
              icono: 'fas fa-project-diagram',
              proximamente: false
            },
            {
              nombre: 'Código',
              descripcion: 'Catálogo de códigos (nombre y descripción).',
              ruta: 'iso-9001',
              rutaCommands: ['iso-9001', 'codigo'],
              icono: 'fas fa-barcode',
              proximamente: false
            },
            {
              nombre: 'Almacenamiento',
              descripcion: 'Catálogo de almacenamiento (nombre y descripción).',
              ruta: 'iso-9001',
              rutaCommands: ['iso-9001', 'almacenamiento'],
              icono: 'fas fa-warehouse',
              proximamente: false
            },
            {
              nombre: 'Disposición final',
              descripcion: 'Catálogo de disposición final (nombre y descripción).',
              ruta: 'iso-9001',
              rutaCommands: ['iso-9001', 'disposicion-final'],
              icono: 'fas fa-recycle',
              proximamente: false
            }
          ]
        }
      ]
    },
    {
      titulo: 'Inventario-Bodega',
      descripcion: 'Parámetros de familia, sección, tipos, estado EPI y proveedores.',
      icono: 'fas fa-warehouse',
      colorClase: 'seccion-epp',
      categorias: [
        {
          nombre: 'Familia',
          descripcion: 'Registrar familias (nombre, código y descripción)',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'familia'],
          icono: 'fas fa-layer-group',
          proximamente: false
        },
        {
          nombre: 'Sección',
          descripcion: 'Registrar secciones (nombre, código y descripción)',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'seccion'],
          icono: 'fas fa-th-list',
          proximamente: false
        },
        {
          nombre: 'Tipo de Entrada',
          descripcion: 'Motivos de ingreso (nombre y descripción): Compra, Devolución, Ajuste…',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'tipo-entrada'],
          icono: 'fas fa-dolly',
          proximamente: false
        },
        {
          nombre: 'Tipo de Salida',
          descripcion: 'Motivos de egreso (nombre y descripción): Entrega EPP, Préstamo, Baja…',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'tipo-salida'],
          icono: 'fas fa-truck-loading',
          proximamente: false
        },
        {
          nombre: 'Tipo de Acontecimiento',
          descripcion: 'Motivos de Cambio EPP (nombre y descripción): Solicitud, Deterioro, Pérdida…',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'tipo-acontecimiento'],
          icono: 'fas fa-exclamation-triangle',
          proximamente: false
        },
        {
          nombre: 'Estado del EPI',
          descripcion: 'Estados del equipo en Cambio EPP: Buen estado, Desgaste, Deteriorado…',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'estado-epi'],
          icono: 'fas fa-heartbeat',
          proximamente: false
        },
        {
          nombre: 'Proveedores',
          descripcion: 'Registrar proveedores (nombre, RUC, teléfono, email y dirección)',
          ruta: 'equipo-proteccion-personal',
          rutaCommands: ['equipo-proteccion-personal', 'proveedores'],
          icono: 'fas fa-truck',
          proximamente: false
        }
      ]
    },
  ];

  navegarA(ruta: string): void {
    this.persistHubScroll();
    this.router.navigate([ruta], { relativeTo: this.route });
  }

  /** Comandos de enlace para `routerLink` (soporta rutas de varios segmentos). */
  linkCommands(categoria: CategoriaConfiguracionCard): string[] {
    return categoria.rutaCommands ?? [categoria.ruta];
  }

  navegarACategoria(categoria: CategoriaConfiguracionCard): void {
    if (categoria.proximamente) {
      return;
    }
    this.persistHubScroll();
    const parts = this.linkCommands(categoria);
    this.router.navigate(parts, { relativeTo: this.route });
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
