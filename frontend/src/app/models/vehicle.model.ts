export interface MaintenanceCatalogItem {
  id: number;
  name: string;
  description?: string;
}

export interface FichaCatalogsResponse {
  businessId: number;
  businessRuc: string;
  /** @deprecated usar claseVehiculos */
  clases?: string[];
  claseVehiculos: MaintenanceCatalogItem[];
  entidadRemitentes: MaintenanceCatalogItem[];
  tipoVehiculos: MaintenanceCatalogItem[];
  marcaVehiculos: MaintenanceCatalogItem[];
  colorVehiculos: MaintenanceCatalogItem[];
  paisOrigenes: MaintenanceCatalogItem[];
  tipoCombustibles: MaintenanceCatalogItem[];
  estadoUnidades: MaintenanceCatalogItem[];
  transmisiones: MaintenanceCatalogItem[];
  numeroEjes: MaintenanceCatalogItem[];
  configuracionEjes: MaintenanceCatalogItem[];
}

export interface Vehicle {
  id?: number;
  codigoEquipo: string;
  placa: string;
  /** Nombre legible de la clase (catálogo empresa) */
  clase?: string;
  claseVehiculoId?: number;
  entidadRemitente?: string;
  entidadRemitenteId?: number;
  tipoVehiculo?: string;
  tipoVehiculoId?: number;
  marca?: string;
  marcaVehiculoId?: number;
  modelo?: string;
  anio?: number;
  serieChasis?: string;
  serieMotor?: string;
  color?: string;
  colorVehiculoId?: number;
  paisOrigen?: string;
  paisOrigenId?: number;
  tipoCombustible?: string;
  tipoCombustibleId?: number;
  estadoUnidad?: string;
  estadoUnidadId?: number;
  transmision?: string;
  transmisionId?: number;
  numeroEjeId?: number;
  numeroEjesLabel?: string;
  configuracionEjeId?: number;
  estadoActivo?: 'ACTIVO' | 'EN_TALLER' | 'DADO_DE_BAJA';
  
  // Datos técnicos
  cilindraje?: string;
  pasajeros?: number;
  tonelaje?: string;
  capacidad?: string;
  potencia?: string;
  kmInicio?: number;
  largo?: string;
  ancho?: string;
  alto?: string;
  proyectoAsignado?: string;
  
  // Neumáticos / ejes (catálogo empresa)
  numeroEjes?: number;
  configuracionEjes?: string;
  medidaNeumaticos?: string;
  marcaNeumatico?: string;
  kmReencauche?: string;
  numeroRepuestos?: number;
  
  // Observaciones
  observaciones?: string;
  
  // Multimedia
  fotoPrincipal?: string;
  fotoLateral?: string;
  fotoInterior?: string;
  
  // Registro de servicio
  ultimoServicio?: string;
  ultimoServicioDescripcion?: string;
  proximoMantenimiento?: string;
  proximoMantenimientoDescripcion?: string;
  kmRestantes?: string;
  
  // Metadata
  businessId?: number;
  businessRuc?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleKPIs {
  saludOperativa: number;
  saludOperativaTendencia: number;
  programadosHoy: number;
  estadoActivo: number;
  alertasCriticas: number;
}

export interface VehicleListResponse {
  vehicles: Vehicle[];
  kpis: VehicleKPIs;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface CreateVehicleRequest {
  codigoEquipo: string;
  placa: string;
  claseVehiculoId?: number | null;
  entidadRemitenteId?: number | null;
  tipoVehiculoId?: number | null;
  marcaVehiculoId?: number | null;
  modelo?: string;
  anio?: number;
  serieChasis?: string;
  serieMotor?: string;
  colorVehiculoId?: number | null;
  paisOrigenId?: number | null;
  tipoCombustibleId?: number | null;
  estadoUnidadId?: number | null;
  transmisionId?: number | null;
  numeroEjeId?: number | null;
  configuracionEjeId?: number | null;
  estadoActivo: 'ACTIVO' | 'EN_TALLER' | 'DADO_DE_BAJA';
  cilindraje?: string;
  pasajeros?: number;
  tonelaje?: string;
  capacidad?: string;
  potencia?: string;
  kmInicio?: number;
  largo?: string;
  ancho?: string;
  alto?: string;
  proyectoAsignado?: string;
  medidaNeumaticos?: string;
  marcaNeumatico?: string;
  kmReencauche?: string;
  numeroRepuestos?: number;
  observaciones?: string;
  businessRuc: string;
}
