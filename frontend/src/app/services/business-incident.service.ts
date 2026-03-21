import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusinessIncidentDto {
  id?: number;
  businessId?: number;
  businessName?: string;
  businessRuc?: string;
  // Sección 1
  affectationType?: string;
  incidentDate?: string;
  incidentTime?: string;
  location?: string;
  personnelType?: string;
  companyName?: string;
  // Sección 2
  personName?: string;
  personCedula?: string;
  personPosition?: string;
  personArea?: string;
  personAge?: number;
  personGender?: string;
  personShift?: string;
  personExperience?: string;
  // Sección 3
  title?: string;
  description?: string;
  eventClassification?: string;
  // Sección 4
  mitigationActions?: string;
  // Sección 5
  isHighPotential?: boolean;
  isCriticalEnap?: boolean;
  isFatal?: boolean;
  requiresResuscitation?: boolean;
  requiresRescue?: boolean;
  fallOver2m?: boolean;
  involvesAmputation?: boolean;
  affectsNormalTask?: boolean;
  isCollective?: boolean;
  lifeRuleViolated?: string;
  apiLevel?: string;
  hasOccurredBefore?: string;
  investigationLevel?: string;
  // Sección 6
  preliminaryComments?: string;
  controlMeasures?: string;
  // Sección 7: Generación del Informe
  reportedBy?: string;
  reportDate?: string;
  reviewedBy?: string;
  approvedBy?: string;
  // Evidencias
  evidenceFiles?: string[];
  // Estado
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentStats {
  monthly: number;
  open: number;
  inReview: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessIncidentService {
  private readonly base: string;

  constructor(private http: HttpClient) {
    this.base = `${environment.apiUrl}/api/incidents`;
  }

  getByRuc(ruc: string): Observable<BusinessIncidentDto[]> {
    return this.http.get<BusinessIncidentDto[]>(`${this.base}/business/${ruc}`);
  }

  getById(id: number): Observable<BusinessIncidentDto> {
    return this.http.get<BusinessIncidentDto>(`${this.base}/${id}`);
  }

  create(ruc: string, dto: BusinessIncidentDto): Observable<BusinessIncidentDto> {
    return this.http.post<BusinessIncidentDto>(`${this.base}/business/${ruc}`, dto);
  }

  update(id: number, dto: BusinessIncidentDto): Observable<BusinessIncidentDto> {
    return this.http.put<BusinessIncidentDto>(`${this.base}/${id}`, dto);
  }

  updateStatus(id: number, status: string): Observable<BusinessIncidentDto> {
    return this.http.patch<BusinessIncidentDto>(`${this.base}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getStats(ruc: string): Observable<IncidentStats> {
    return this.http.get<IncidentStats>(`${this.base}/business/${ruc}/stats`);
  }
}
