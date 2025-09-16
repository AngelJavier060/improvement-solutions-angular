import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfigurationOption {
  id: number;
  name: string;
  description?: string;
}

export interface Position extends ConfigurationOption {
  description: string;
}

export interface Gender extends ConfigurationOption {
  description: string;
}

export interface CivilStatus extends ConfigurationOption {
  description: string;
}

export interface Ethnicity extends ConfigurationOption {
  description: string;
}

export interface Degree extends ConfigurationOption {
  description: string;
}

export interface Department extends ConfigurationOption {
  description?: string;
  active?: boolean;
}

export interface TypeContract extends ConfigurationOption {
  description?: string;
}

export interface IessCode {
  id: number;
  code: string;  // Cambié de codigoSectorial a code para ser más consistente
  description?: string;
}

export interface AllConfigurations {
  positions: Position[];
  genders: Gender[];
  civilStatuses: CivilStatus[];
  etnias: Ethnicity[];
  degrees: Degree[];
  departments: Department[];
  typeContracts: TypeContract[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private apiUrl = 'http://localhost:8080/api/configuration';

  constructor(private http: HttpClient) {}

  // Obtener todas las configuraciones en una sola llamada
  getAllConfigurations(): Observable<AllConfigurations> {
    return this.http.get<AllConfigurations>(`${this.apiUrl}/all`);
  }

  // Obtener géneros
  getGenders(): Observable<Gender[]> {
    return this.http.get<Gender[]>(`${this.apiUrl}/genders`);
  }

  // Obtener estados civiles
  getCivilStatuses(): Observable<CivilStatus[]> {
    return this.http.get<CivilStatus[]>(`${this.apiUrl}/civil-statuses`);
  }

  // Obtener etnias
  getEtnias(): Observable<Ethnicity[]> {
    return this.http.get<Ethnicity[]>(`${this.apiUrl}/etnias`);
  }

  // Obtener cargos por empresa
  getPositionsByCompany(businessId: number): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.apiUrl}/positions/${businessId}`);
  }

  // Obtener todos los cargos (sin filtro de empresa)
  getAllPositions(): Observable<Position[]> {
    return this.http.get<Position[]>(`${this.apiUrl}/positions`);
  }

  // Obtener estudios/grados académicos
  getDegrees(): Observable<Degree[]> {
    return this.http.get<Degree[]>(`${this.apiUrl}/degrees`);
  }

  // Obtener código IESS de la empresa (DEPRECATED - usar getIessCodesByBusiness)
  getIessCodeByBusiness(businessId: number): Observable<IessCode> {
    return this.http.get<IessCode>(`${this.apiUrl}/iess/business/${businessId}`);
  }

  // Obtener TODOS los códigos IESS configurados para una empresa
  getIessCodesByBusiness(businessId: number): Observable<IessCode[]> {
    return this.http.get<IessCode[]>(`${this.apiUrl}/iess/business/${businessId}/all`);
  }

  // Obtener departamentos por empresa
  getDepartmentsByCompany(businessId: number): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments/${businessId}`);
  }

  // Obtener tipos de contrato por empresa
  getTypeContractsByCompany(businessId: number): Observable<TypeContract[]> {
    return this.http.get<TypeContract[]>(`${this.apiUrl}/type-contracts/${businessId}`);
  }
}