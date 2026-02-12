import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export interface SystemModule {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: number;
  active: boolean;
}

export interface BusinessModuleDto {
  id: number | null;
  businessId: number;
  businessName: string;
  businessRuc: string;
  moduleId: number;
  moduleCode: string;
  moduleName: string;
  moduleDescription: string;
  moduleIcon: string;
  moduleColor: string;
  active: boolean;
  status: string;
  startDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  effectivelyActive: boolean;
  // Plan info
  planId: number | null;
  planName: string | null;
  planCode: string | null;
  planPrice: number | null;
  planDurationMonths: number | null;
  planCurrency: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessModuleService {
  private baseUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.baseUrl = this.apiUrlService.getUrl('/api/business-modules');
  }

  getSystemModules(): Observable<SystemModule[]> {
    return this.http.get<SystemModule[]>(`${this.baseUrl}/system-modules`);
  }

  getModulesByBusiness(businessId: number): Observable<BusinessModuleDto[]> {
    return this.http.get<BusinessModuleDto[]>(`${this.baseUrl}/business/${businessId}`);
  }

  toggleModule(businessId: number, moduleId: number, body: any): Observable<BusinessModuleDto> {
    return this.http.post<BusinessModuleDto>(
      `${this.baseUrl}/business/${businessId}/module/${moduleId}`, body
    );
  }

  updateModule(id: number, body: any): Observable<BusinessModuleDto> {
    return this.http.put<BusinessModuleDto>(`${this.baseUrl}/${id}`, body);
  }

  getAllModulesByRuc(ruc: string): Observable<BusinessModuleDto[]> {
    return this.http.get<BusinessModuleDto[]>(`${this.baseUrl}/all/${ruc}`);
  }

  getActiveModulesByRuc(ruc: string): Observable<BusinessModuleDto[]> {
    return this.http.get<BusinessModuleDto[]>(`${this.baseUrl}/active/${ruc}`);
  }

  checkModuleActive(ruc: string, moduleCode: string): Observable<{ active: boolean }> {
    return this.http.get<{ active: boolean }>(`${this.baseUrl}/check/${ruc}/${moduleCode}`);
  }
}
