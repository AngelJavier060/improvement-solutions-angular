export interface Business {
  id?: number;
  ruc: string;
  name: string;
  nameShort?: string;
  legalRepresentative: string;
  email: string;
  address: string;
  phone: string;
  logo?: string;
  website?: string;
  sector?: string;
  employeesCount?: number;
  foundedAt?: Date;
  status?: 'active' | 'inactive' | 'pending';
  taxId?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
