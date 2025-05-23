export interface Business {
  id?: number;
  ruc: string;
  name: string;
  nameShort?: string;
  representativeLegal?: string;
  email?: string;
  address?: string;
  phone?: string;
  logo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
