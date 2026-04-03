export interface MetodologiaRefMin {
  id: number;
  name: string;
  description?: string;
}

export interface NivelRefMin {
  id: number;
  valor: number;
  nombre: string;
  description?: string;
  color?: string;
}

export interface DistanciaRecorrer {
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
