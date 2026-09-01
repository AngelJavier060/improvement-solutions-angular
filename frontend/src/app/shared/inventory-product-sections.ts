/**
 * Catálogo único de secciones por familia (Inventario → Nuevo producto → Sección).
 * Al agregar o quitar opciones aquí, se reflejan en Catálogo de productos y en Cambio de EPP.
 */
export type InventoryProductKind = 'EPP' | 'HERRAMIENTA' | 'PIEZA';

export interface InventoryProductSection {
  prefix: string;
  label: string;
}

export const INVENTORY_SECTIONS_BY_KIND: Record<InventoryProductKind, InventoryProductSection[]> = {
  EPP: [
    { prefix: 'CAS', label: 'Casco' },
    { prefix: 'PAN', label: 'Pantalón' },
    { prefix: 'CAM', label: 'Camisa' },
    { prefix: 'OVE', label: 'Overol' },
    { prefix: 'GUA', label: 'Guantes' },
    { prefix: 'BOT', label: 'Botas' },
    { prefix: 'RES', label: 'Respirador' },
    { prefix: 'ARN', label: 'Arnés' },
    { prefix: 'OTR', label: 'Otro EPP' }
  ],
  HERRAMIENTA: [
    { prefix: 'TAL', label: 'Taladro / eléctrica' },
    { prefix: 'MAN', label: 'Manual' },
    { prefix: 'MED', label: 'Medición' },
    { prefix: 'COR', label: 'Corte' },
    { prefix: 'OTR', label: 'Otra herramienta' }
  ],
  PIEZA: [
    { prefix: 'REP', label: 'Repuesto' },
    { prefix: 'CON', label: 'Consumible' },
    { prefix: 'OTR', label: 'Otra pieza' }
  ]
};

export const INVENTORY_EPP_SECTIONS: InventoryProductSection[] = INVENTORY_SECTIONS_BY_KIND.EPP;

export function inventorySectionLabel(prefix: string, kind?: InventoryProductKind): string {
  const p = (prefix || '').toUpperCase();
  if (kind) {
    const found = INVENTORY_SECTIONS_BY_KIND[kind].find(s => s.prefix === p);
    if (found) return found.label;
  }
  for (const k of Object.keys(INVENTORY_SECTIONS_BY_KIND) as InventoryProductKind[]) {
    const found = INVENTORY_SECTIONS_BY_KIND[k].find(s => s.prefix === p);
    if (found) return found.label;
  }
  return p || '—';
}
