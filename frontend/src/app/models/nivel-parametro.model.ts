export interface NivelParametro {
  id?: number;
  parametroMetodologia?: { id: number };
  valor: number;
  nombre: string;
  description?: string;
  color?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
