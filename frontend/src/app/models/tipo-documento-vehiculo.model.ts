/** Grupos de documentación de flota (alineados al backend). */
export type FleetDocCategory =
  | 'DOCUMENTOS_PRINCIPALES'
  | 'CERTIFICACIONES'
  | 'LIBERACIONES';

export const FLEET_DOC_CATEGORIES: { code: FleetDocCategory; label: string }[] = [
  { code: 'DOCUMENTOS_PRINCIPALES', label: 'Documentos Legales y Permisos' },
  { code: 'CERTIFICACIONES', label: 'Certificaciones Técnicas' },
  { code: 'LIBERACIONES', label: 'Liberaciones' }
];

export function fleetDocCategoryLabel(code: string | null | undefined): string {
  const found = FLEET_DOC_CATEGORIES.find(c => c.code === code);
  return found?.label || 'Documentos Legales y Permisos';
}

export function normalizeFleetDocCategory(code: string | null | undefined): FleetDocCategory {
  if (code === 'CERTIFICACIONES' || code === 'LIBERACIONES' || code === 'DOCUMENTOS_PRINCIPALES') {
    return code;
  }
  return 'DOCUMENTOS_PRINCIPALES';
}

export interface TipoDocumentoVehiculo {
  id?: number;
  name: string;
  description?: string;
  /** DOCUMENTOS_PRINCIPALES | CERTIFICACIONES | LIBERACIONES */
  category?: FleetDocCategory | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
