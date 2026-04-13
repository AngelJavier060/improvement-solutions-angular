import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { NivelParametro } from '../../../../../models/nivel-parametro.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';

/** Letra de score A–J alineada con `GerenciaViajeService.resolveScoreLetter`. */
const LETRA_POR_SLUG: Record<string, string> = {
  'distancia-recorrer': 'A',
  'tipo-via': 'B',
  'condicion-climatica': 'C',
  'horario-circulacion': 'D',
  'estado-carretera': 'E',
  'tipo-carga': 'F',
  'hora-conduccion': 'G',
  'hora-descanso': 'H',
  'medio-comunicacion': 'I',
  'transporta-pasajero': 'J'
};

/** Texto unificado nombre + descripción + código (mayúsculas, sin acentos fuertes). */
function textoBusquedaParametro(p: ParametroMetodologia): string {
  const raw = `${p.name || ''} ${p.description || ''} ${p.code || ''}`.toUpperCase();
  return raw
    .normalize('NFD')
    .replace(/\u0300/g, '')
    .replace(/VÍA/g, 'VIA');
}

/**
 * Heurística por slug, misma lógica que `GerenciaViajeService.resolveScoreLetter`
 * (cuando el parámetro no tiene código de una letra ni sourceEntity).
 */
function coincideHeuristicaSlug(upper: string, slug: string): boolean {
  switch (slug) {
    case 'distancia-recorrer':
      return upper.includes('DISTANCIA');
    case 'tipo-via':
      return (
        (upper.includes('TIPO') || upper.includes('TIPOS')) &&
        (upper.includes('VIA') || upper.includes('VÍA'))
      );
    case 'condicion-climatica':
      return (
        upper.includes('CLIMA') ||
        upper.includes('CONDICIONES CLIM') ||
        upper.includes('CONDICIONES CLIMAT')
      );
    case 'horario-circulacion':
      return upper.includes('HORARIO') && (upper.includes('CIRCUL') || upper.includes('CIRCULACI'));
    case 'estado-carretera':
      return upper.includes('ESTADO') && (upper.includes('CARRETER') || upper.includes('CARRETERA'));
    case 'tipo-carga':
      return (upper.includes('TIPO') || upper.includes('TIPOS')) && upper.includes('CARGA');
    case 'hora-conduccion':
      return upper.includes('HORAS') && upper.includes('CONDUCCI');
    case 'hora-descanso':
      return upper.includes('DESCANSO');
    case 'medio-comunicacion':
      return upper.includes('COMUNICAC');
    case 'transporta-pasajero':
      return upper.includes('PASAJERO');
    case 'posibles-riesgos-via':
      return (
        (upper.includes('RIESGO') && upper.includes('VIA')) ||
        upper.includes('POSIBLES RIESGOS') ||
        upper.includes('RIESGOS EN LA VIA')
      );
    default:
      return false;
  }
}

/**
 * Localiza el parámetro: sourceEntity → código letra → nombre/descripción (heurística).
 * Prioriza parámetros que ya tienen niveles definidos.
 */
export function parametroFactorParaCatalogo(
  metodologia: MetodologiaRiesgo | null | undefined,
  sourceSlug: string
): ParametroMetodologia | null {
  if (!metodologia?.parametros?.length) {
    return null;
  }
  const slug = sourceSlug.trim().toLowerCase();
  const params = metodologia.parametros;

  const porSource = params.find((p) => {
    const raw = ((p as { sourceEntity?: string }).sourceEntity || '').trim();
    if (!raw) {
      return false;
    }
    const partes = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return partes.includes(slug);
  });
  if (porSource) {
    return porSource;
  }

  const letra = (LETRA_POR_SLUG[slug] || '').toUpperCase();
  if (letra) {
    const porCodigo = params.find((p) => (p.code || '').trim().toUpperCase() === letra);
    if (porCodigo) {
      return porCodigo;
    }
  }

  const candidatos = params.filter((p) => {
    const t = textoBusquedaParametro(p);
    return coincideHeuristicaSlug(t, slug);
  });
  if (!candidatos.length) {
    return null;
  }
  const conNiveles = candidatos.filter((p) => (p.niveles || []).length > 0);
  return (conNiveles.length ? conNiveles : candidatos)[0];
}

export function nivelesFactorOrdenados(param: ParametroMetodologia | null): NivelParametro[] {
  return (param?.niveles || [])
    .slice()
    .sort((a, b) => b.valor - a.valor);
}
