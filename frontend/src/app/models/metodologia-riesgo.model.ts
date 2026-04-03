import { ParametroMetodologia } from './parametro-metodologia.model';

export interface MetodologiaRiesgo {
  id?: number;
  name: string;
  description?: string;
  parametros?: ParametroMetodologia[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
