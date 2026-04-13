import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import {
  CatalogoMetodologiaLayout,
  layoutCatalogoMetodologia,
  riesgoIperClass,
  riesgoIperLabel
} from './metodologia-catalogo-niveles.util';

/** Mínimo común para catálogos de viaje con factores por metodología. */
export interface CatalogoViajeFactorItem {
  id?: number;
  name: string;
  description?: string;
  metodologiaRiesgo?: { id?: number; name?: string } | null;
  neNivel?: { valor?: number } | null;
  ndNivel?: { valor?: number } | null;
  ncNivel?: { valor?: number } | null;
}

export interface CatalogoViajeMetodologiaSection<T extends CatalogoViajeFactorItem> {
  key: string;
  metodologia: MetodologiaRiesgo | null;
  profile: CatalogoMetodologiaLayout;
  items: T[];
}

export function rebuildCatalogoSections<T extends CatalogoViajeFactorItem>(
  items: T[],
  metodologias: MetodologiaRiesgo[]
): CatalogoViajeMetodologiaSection<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const rid = item.metodologiaRiesgo?.id;
    const key = rid != null && rid !== undefined ? `m-${Number(rid)}` : 'sin';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }
  const out: CatalogoViajeMetodologiaSection<T>[] = [];
  for (const [key, groupItems] of map) {
    let m: MetodologiaRiesgo | null = null;
    if (key.startsWith('m-')) {
      const idNum = Number(key.slice(2));
      m = metodologias.find((x) => Number(x.id) === idNum) || null;
    }
    const profile = layoutCatalogoMetodologia(m);
    out.push({ key, metodologia: m, profile, items: groupItems });
  }
  out.sort((a, b) => {
    if (a.key === 'sin') {
      return 1;
    }
    if (b.key === 'sin') {
      return -1;
    }
    return (a.metodologia?.name || '').localeCompare(b.metodologia?.name || '', 'es');
  });
  return out;
}

export function catalogoGetMetodologia<T extends CatalogoViajeFactorItem>(
  item: T,
  metodologias: MetodologiaRiesgo[]
): MetodologiaRiesgo | null {
  const rid = item.metodologiaRiesgo?.id;
  if (rid === undefined || rid === null) {
    return null;
  }
  return metodologias.find((met) => Number(met.id) === Number(rid)) || null;
}

export function catalogoProfileForItem<T extends CatalogoViajeFactorItem>(
  item: T,
  metodologias: MetodologiaRiesgo[]
): CatalogoMetodologiaLayout {
  return layoutCatalogoMetodologia(catalogoGetMetodologia(item, metodologias));
}

export function catalogoGetParametro<T extends CatalogoViajeFactorItem>(
  item: T,
  metodologias: MetodologiaRiesgo[],
  code: string
): ParametroMetodologia | null {
  const u = code.toUpperCase();
  return (
    catalogoGetMetodologia(item, metodologias)?.parametros?.find(
      (p) => (p.code || '').toUpperCase() === u
    ) || null
  );
}

export function catalogoGetNe(item: CatalogoViajeFactorItem): number | null {
  return item.neNivel?.valor ?? null;
}

export function catalogoGetNd(item: CatalogoViajeFactorItem): number | null {
  return item.ndNivel?.valor ?? null;
}

export function catalogoGetNc(item: CatalogoViajeFactorItem): number | null {
  return item.ncNivel?.valor ?? null;
}

export function catalogoGetNpGtc(item: CatalogoViajeFactorItem): number | null {
  const ne = catalogoGetNe(item);
  const nd = catalogoGetNd(item);
  if (ne === null || nd === null) {
    return null;
  }
  return ne * nd;
}

export function catalogoGetNrGtc(item: CatalogoViajeFactorItem): number | null {
  const np = catalogoGetNpGtc(item);
  const nc = catalogoGetNc(item);
  if (np === null || nc === null) {
    return null;
  }
  return np * nc;
}

export function catalogoGetIperNpValor(item: CatalogoViajeFactorItem): number | null {
  return item.neNivel?.valor ?? null;
}

export function catalogoGetIperNsValor(item: CatalogoViajeFactorItem): number | null {
  return item.ndNivel?.valor ?? null;
}

export function catalogoGetIperRiesgo(item: CatalogoViajeFactorItem): number | null {
  const a = catalogoGetIperNpValor(item);
  const b = catalogoGetIperNsValor(item);
  if (a === null || b === null) {
    return null;
  }
  return a * b;
}

export function catalogoGetRiesgoPrincipal<T extends CatalogoViajeFactorItem>(
  item: T,
  metodologias: MetodologiaRiesgo[]
): number | null {
  const p = catalogoProfileForItem(item, metodologias);
  if (p === 'iper') {
    return catalogoGetIperRiesgo(item);
  }
  if (p === 'gtc') {
    return catalogoGetNrGtc(item);
  }
  const ne = catalogoGetNe(item);
  const nd = catalogoGetNd(item);
  const nc = catalogoGetNc(item);
  if (ne !== null && nd !== null && nc !== null) {
    return ne * nd * nc;
  }
  if (ne !== null && nd !== null) {
    return ne * nd;
  }
  return null;
}

export function catalogoGetRiskClass(
  value: number | null,
  profile: CatalogoMetodologiaLayout
): string {
  if (value === null) {
    return 'neutral';
  }
  if (profile === 'iper') {
    return riesgoIperClass(value);
  }
  if (value > 500) {
    return 'critical';
  }
  if (value >= 150) {
    return 'high';
  }
  if (value >= 40) {
    return 'medium';
  }
  return 'low';
}

export function catalogoGetRiskLabel(
  value: number | null,
  profile: CatalogoMetodologiaLayout
): string {
  if (value === null) {
    return 'Pendiente';
  }
  if (profile === 'iper') {
    return riesgoIperLabel(value);
  }
  if (value > 500) {
    return 'Crítico';
  }
  if (value >= 150) {
    return 'Alto';
  }
  if (value >= 40) {
    return 'Medio';
  }
  return 'Bajo';
}

export function catalogoSectionTitle<T extends CatalogoViajeFactorItem>(
  section: CatalogoViajeMetodologiaSection<T>
): string {
  if (section.key === 'sin') {
    return 'Sin metodología asignada';
  }
  return section.metodologia?.name || 'Metodología';
}

export function catalogoSectionSubtitle(section: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>): string {
  if (section.profile === 'gtc') {
    return 'Matriz NE · ND · NP · NC · NR (aceptación de riesgo)';
  }
  if (section.profile === 'iper') {
    return 'NP (probabilidad) · NS (severidad) · riesgo = NP × NS';
  }
  return 'Parámetros según definición en aceptación de riesgo';
}

export function catalogoPeakRiesgoSection<T extends CatalogoViajeFactorItem>(
  section: CatalogoViajeMetodologiaSection<T>,
  metodologias: MetodologiaRiesgo[]
): number {
  return section.items.reduce(
    (max, item) => Math.max(max, catalogoGetRiesgoPrincipal(item, metodologias) || 0),
    0
  );
}

export function catalogoPeakGlobal<T extends CatalogoViajeFactorItem>(
  items: T[],
  metodologias: MetodologiaRiesgo[]
): number {
  return items.reduce(
    (max, item) => Math.max(max, catalogoGetRiesgoPrincipal(item, metodologias) || 0),
    0
  );
}

export function catalogoSystemStatus<T extends CatalogoViajeFactorItem>(
  items: T[],
  metodologias: MetodologiaRiesgo[]
): string {
  const peak = catalogoPeakGlobal(items, metodologias);
  if (!items.length) {
    return 'Sin registros';
  }
  if (peak > 500) {
    return 'Revisar configuración';
  }
  return 'Configuración óptima';
}

export function catalogoSectionBadge(profile: CatalogoMetodologiaLayout): string {
  if (profile === 'gtc') {
    return 'GTC / NE·ND·NC';
  }
  if (profile === 'iper') {
    return 'IPER / NP·NS';
  }
  return 'Parámetros mixtos';
}

export function trackBySectionKey<T extends CatalogoViajeFactorItem>(
  _: number,
  section: CatalogoViajeMetodologiaSection<T>
): string {
  return section.key;
}

export function trackByItemId<T extends CatalogoViajeFactorItem>(
  index: number,
  item: T
): number | string {
  return item.id ?? `row-${index}`;
}

export function catalogoRowIndex<T extends CatalogoViajeFactorItem>(
  section: CatalogoViajeMetodologiaSection<T>,
  i: number
): string {
  return (i + 1).toString().padStart(2, '0');
}
