import { TipoDocumentoVehiculo } from './tipo-documento-vehiculo.model';

export interface TipoVehiculo {
  id?: number;
  name: string;
  description?: string;
  documentos?: TipoDocumentoVehiculo[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
