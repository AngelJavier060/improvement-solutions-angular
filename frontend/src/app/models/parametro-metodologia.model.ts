import { NivelParametro } from './nivel-parametro.model';

/**
 * tipUso define el rol del parámetro dentro de la metodología:
 * - 'FACTOR'      : El valor proviene de la configuración del factor evaluado (ej: NE, ND)
 * - 'SELECCIONABLE': El evaluador elige un nivel al evaluar (ej: NC - Nivel de Consecuencia)
 * - 'CALCULADO'   : Se obtiene por fórmula (ej: NP = NE×ND, NR = NP×NC)
 */
export type TipUsoParametro = 'FACTOR' | 'SELECCIONABLE' | 'CALCULADO';

export interface ParametroMetodologia {
  id?: number;
  metodologiaRiesgo?: { id: number };
  code: string;
  name: string;
  description?: string;
  displayOrder?: number;
  isCalculated?: boolean;
  tipUso?: TipUsoParametro;
  formula?: string;
  sourceEntity?: string;
  sourceEntityLabel?: string;
  niveles?: NivelParametro[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
