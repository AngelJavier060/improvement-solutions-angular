import { MetodologiaRefMin, NivelRefMin } from './distancia-recorrer.model';

export interface TransportaPasajero {
  id?: number;
  name: string;
  description?: string;
  metodologiaRiesgo?: MetodologiaRefMin | null;
  neNivel?: NivelRefMin | null;
  ndNivel?: NivelRefMin | null;
  ncNivel?: NivelRefMin | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
