import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import { NivelParametro } from '../../../../../models/nivel-parametro.model';

export type CatalogoMetodologiaLayout = 'gtc' | 'iper' | 'generic';

export function getParametroPorCode(
  metodologia: MetodologiaRiesgo | null | undefined,
  code: string
): ParametroMetodologia | null {
  if (!metodologia?.parametros?.length) {
    return null;
  }
  const u = code.toUpperCase();
  return metodologia.parametros.find((p) => (p.code || '').toUpperCase() === u) || null;
}

function parametroEsFactorConNiveles(p: ParametroMetodologia | null | undefined): boolean {
  if (!p) {
    return false;
  }
  if (p.isCalculated) {
    return false;
  }
  if (String(p.tipUso || '').toUpperCase() === 'CALCULADO') {
    return false;
  }
  return (p.niveles || []).length > 0;
}

/**
 * IPER típico: parámetros NP (probabilidad) y NS (severidad) como factores con niveles.
 * Se excluye el NP calculado de GTC (NE×ND).
 */
export function parametrosIperNpNs(
  metodologia: MetodologiaRiesgo | null | undefined
): { np: ParametroMetodologia; ns: ParametroMetodologia } | null {
  const np = getParametroPorCode(metodologia, 'NP');
  const ns = getParametroPorCode(metodologia, 'NS');
  if (!parametroEsFactorConNiveles(np) || !parametroEsFactorConNiveles(ns)) {
    return null;
  }
  return { np: np!, ns: ns! };
}

export function layoutCatalogoMetodologia(
  metodologia: MetodologiaRiesgo | null | undefined
): CatalogoMetodologiaLayout {
  if (!metodologia?.parametros?.length) {
    return 'generic';
  }
  if (tieneParametrosNeNdNc(metodologia)) {
    return 'gtc';
  }
  if (parametrosIperNpNs(metodologia)) {
    return 'iper';
  }
  return 'generic';
}

/** Metodología con los tres parámetros estándar GTC-45. */
export function tieneParametrosNeNdNc(metodologia: MetodologiaRiesgo | null | undefined): boolean {
  if (!metodologia?.parametros?.length) {
    return false;
  }
  const ne = getParametroPorCode(metodologia, 'NE');
  const nd = getParametroPorCode(metodologia, 'ND');
  const nc = getParametroPorCode(metodologia, 'NC');
  return (
    parametroEsFactorConNiveles(ne) &&
    parametroEsFactorConNiveles(nd) &&
    parametroEsFactorConNiveles(nc)
  );
}

/**
 * Parámetros elegibles para catálogo genérico (3 slots): con niveles, no calculados.
 * Excluye NP/NR como columnas calculadas GTC; IPER NP+NS se resuelve con layout `iper`.
 */
export function parametrosFactorConNivelesOrdenados(
  metodologia: MetodologiaRiesgo | null | undefined
): ParametroMetodologia[] {
  if (!metodologia?.parametros?.length) {
    return [];
  }
  return metodologia.parametros
    .filter((p) => {
      const niveles = p.niveles || [];
      if (niveles.length === 0) {
        return false;
      }
      const tip = String(p.tipUso || '').toUpperCase();
      if (tip === 'CALCULADO' || p.isCalculated) {
        return false;
      }
      const code = (p.code || '').toUpperCase();
      if (code === 'NP' || code === 'NR') {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
}

/** Hasta 3 parámetros cuando no es GTC ni IPER definido. */
export function parametrosCatalogoTresSlots(
  metodologia: MetodologiaRiesgo | null | undefined
): ParametroMetodologia[] {
  if (!metodologia || tieneParametrosNeNdNc(metodologia)) {
    return [];
  }
  if (parametrosIperNpNs(metodologia)) {
    return [];
  }
  return parametrosFactorConNivelesOrdenados(metodologia).slice(0, 3);
}

export function nivelesParametroDesc(param: ParametroMetodologia | null | undefined): NivelParametro[] {
  return (param?.niveles || [])
    .slice()
    .sort((a, b) => b.valor - a.valor);
}

/** Clasificación NR para producto NP×NS (escala suele ser menor que GTC). */
export function riesgoIperClass(valor: number | null): string {
  if (valor === null) {
    return 'neutral';
  }
  if (valor >= 20) {
    return 'critical';
  }
  if (valor >= 12) {
    return 'high';
  }
  if (valor >= 7) {
    return 'medium';
  }
  return 'low';
}

export function riesgoIperLabel(valor: number | null): string {
  if (valor === null) {
    return 'Pendiente';
  }
  if (valor >= 20) {
    return 'Crítico';
  }
  if (valor >= 12) {
    return 'Alto';
  }
  if (valor >= 7) {
    return 'Medio';
  }
  return 'Bajo';
}
