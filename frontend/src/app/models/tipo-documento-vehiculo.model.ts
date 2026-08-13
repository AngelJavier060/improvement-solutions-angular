/** Grupos de documentación de flota (alineados al backend / entidad remitente). */
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
  const raw = (code || '').trim();
  if (!raw) return 'DOCUMENTOS_PRINCIPALES';
  const upper = raw.toUpperCase().replace(/\s+/g, '_');
  if (upper === 'CERTIFICACIONES' || upper.includes('CERTIFIC')) return 'CERTIFICACIONES';
  if (upper === 'LIBERACIONES' || upper.includes('LIBERAC')) return 'LIBERACIONES';
  if (
    upper === 'DOCUMENTOS_PRINCIPALES' ||
    upper.includes('DOCUMENTOS_LEGAL') ||
    upper.includes('DOCUMENTOS LEGALES') ||
    upper.includes('LEGALES') ||
    upper.includes('PERMISOS')
  ) {
    return 'DOCUMENTOS_PRINCIPALES';
  }
  // Etiquetas en español del admin
  const lower = raw.toLowerCase();
  if (lower.includes('certific')) return 'CERTIFICACIONES';
  if (lower.includes('liberac')) return 'LIBERACIONES';
  return 'DOCUMENTOS_PRINCIPALES';
}

