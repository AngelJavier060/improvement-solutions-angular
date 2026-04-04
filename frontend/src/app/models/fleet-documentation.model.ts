/** Tipos de documento para filtros y formularios (frontend / demo) */
export const FLEET_DOC_TYPE_OPTIONS: { code: string; label: string }[] = [
  { code: 'SOAT', label: 'SOAT' },
  { code: 'RTM', label: 'Revisión Tecnomecánica' },
  { code: 'SCT', label: 'Seguro Contra Terceros' },
  { code: 'POLIZA_RCE', label: 'Póliza de Responsabilidad Civil' },
  { code: 'CERT_OP', label: 'Certificado de Operatividad' },
  { code: 'LICENCIA', label: 'Licencia / Permiso' },
  { code: 'TITULO', label: 'Título de propiedad' },
  { code: 'OTRO', label: 'Otro' }
];

export type FleetDocComplianceStatus = 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'NO_CADUCA' | 'SIN_VIGENCIA';

/** Prefijo para tipo de documento definido en configuración (tipo documento vehículo). */
export const FLEET_DOC_CODE_TDV_PREFIX = 'tdv_';

export function fleetDocTypeCodeFromTipoDocumentoVehiculoId(id: number): string {
  return `${FLEET_DOC_CODE_TDV_PREFIX}${id}`;
}

export interface FleetComplianceDoc {
  id: string;
  vehicleId: number;
  typeCode: string;
  typeLabel: string;
  /** Entidad remitente (catálogo de la empresa, misma fuente que ficha / admin empresa). */
  entidadRemitenteId?: number | null;
  entidadRemitenteName?: string | null;
  referenceId: string;
  issueDate: string;
  /** null = no caduca */
  expiryDate: string | null;
  active: boolean;
  historicMode: boolean;
  fileName?: string;
  fileSizeLabel?: string;
  /** Archivo en servidor (tabla fleet_vehicle_documents), asociado a esta fila de documentación. */
  attachedFleetDocumentId?: number | null;
  attachedDocumentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FleetDocHistoryAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface FleetDocHistoryEntry {
  id: string;
  vehicleId: number;
  replacedDocumentId: string;
  action: FleetDocHistoryAction;
  /** Copia del documento antes del cambio (o eliminado) */
  snapshot: FleetComplianceDoc;
  changedAt: string;
  note?: string;
}

export interface FleetDocRegistroPayload {
  typeCode: string;
  /** Si viene informado, sustituye a la etiqueta inferida por typeCode (p. ej. tdv_12). */
  typeLabel?: string;
  entidadRemitenteId?: number | null;
  entidadRemitenteName?: string | null;
  referenceId: string;
  issueDate: string;
  expiryDate: string | null;
  active: boolean;
  historicMode: boolean;
  fileName?: string;
  fileSizeLabel?: string;
  attachedFleetDocumentId?: number | null;
  attachedDocumentUrl?: string | null;
}
