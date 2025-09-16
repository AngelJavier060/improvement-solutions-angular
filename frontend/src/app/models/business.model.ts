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
  
  // Campos para empresas contratistas múltiples
  contractor_companies?: ContractorCompany[];
  contractorCompanies?: ContractorCompany[]; // Alternativa por si viene con camelCase
  
  // Campos para compatibilidad hacia atrás (empresa contratista singular)
  contractor_company_id?: number;
  contractor_company?: ContractorCompany;
  contractorCompany?: ContractorCompany; // Alternativa por si viene con camelCase
}

export interface ContractorCompany {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}
