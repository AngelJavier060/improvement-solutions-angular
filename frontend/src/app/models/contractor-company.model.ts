export interface ContractorCompany {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  blocks?: ContractorBlock[];
  totalEmployees?: number;
  totalBlocks?: number;
}

export interface ContractorBlock {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  contractorCompanyId: number;
  contractorCompanyName?: string;
  totalEmployees?: number;
}