export interface TipoDocumento {
  id?: number;
  name: string;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Añadimos relación con businesses, pero no la usaremos en la UI de configuración general
  businesses?: any[];
}
