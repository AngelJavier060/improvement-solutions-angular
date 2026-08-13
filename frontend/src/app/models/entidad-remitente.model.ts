import { FleetDocCategory } from './tipo-documento-vehiculo.model';

export interface EntidadRemitente {
  id?: number;
  name: string;
  description?: string;
  /** DOCUMENTOS_PRINCIPALES | CERTIFICACIONES | LIBERACIONES */
  category?: FleetDocCategory | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
