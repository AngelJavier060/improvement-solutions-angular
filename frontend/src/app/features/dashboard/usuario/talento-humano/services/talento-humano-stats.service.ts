import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';

// Interfaces alineadas con backend
export interface EmployeeStatsDto {
  total: number;
  hombres: number;
  mujeres: number;
  discapacidad: number;
  adolescentes: number;
}

export interface BusinessStatsItemDto {
  businessId: number;
  businessName: string;
  businessRuc: string;
  stats: EmployeeStatsDto;
}

export interface StatsAggregationDto {
  currentBusiness?: BusinessStatsItemDto | null;
  allBusinesses: BusinessStatsItemDto[];
  totalCombined: EmployeeStatsDto;
}

export interface AgeGenderRangeDto {
  label: string;
  women: number;
  men: number;
}

export interface JobRoleDto {
  cargo: string;
  categoria: string;
  cantidad: number;
  porcentaje: number;
}

export interface EducationLevelDto {
  nivel: string;
  cantidad: number;
  porcentaje: number;
}

@Injectable({ providedIn: 'root' })
export class TalentoHumanoStatsService {
  private readonly baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  private getHttpOptions(): { headers: HttpHeaders } {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      })
    };
  }

  // Empresas del usuario
  getUserBusinessesByUserId(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/businesses/byUser/${userId}`, this.getHttpOptions())
      .pipe(
        catchError(err => {
          console.error('Error obteniendo empresas del usuario:', err);
          return of([]);
        })
      );
  }

  // Empresa por RUC
  getBusinessByRuc(ruc: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/businesses/public/ruc/${ruc}`, this.getHttpOptions())
      .pipe(
        catchError(err => {
          console.error('Error obteniendo empresa por RUC:', err);
          return of(null);
        })
      );
  }

  // Stats por businessId
  getStatsByBusinessId(businessId: number): Observable<EmployeeStatsDto> {
    return this.http.get<EmployeeStatsDto>(`${this.baseUrl}/businesses/${businessId}/stats`, this.getHttpOptions());
  }

  // Stats por código de empresa (RUC)
  getCompanyStatsByRuc(ruc: string): Observable<EmployeeStatsDto> {
    return this.http.get<EmployeeStatsDto>(`${this.baseUrl}/business-employees/company/${ruc}/stats`, this.getHttpOptions());
  }

  // Pirámide Edad/Género por RUC
  getAgeGenderPyramidByRuc(ruc: string): Observable<AgeGenderRangeDto[]> {
    return this.http.get<AgeGenderRangeDto[]>(`${this.baseUrl}/business-employees/company/${ruc}/age-gender`, this.getHttpOptions());
  }

  // Agregado por lista de empresas
  getAggregatedStatsByBusinessIds(businessIds: number[], currentBusinessId?: number): Observable<StatsAggregationDto> {
    let params = new HttpParams();
    businessIds.forEach(id => { params = params.append('businessIds', String(id)); });
    if (currentBusinessId) params = params.set('currentBusinessId', String(currentBusinessId));
    return this.http.get<StatsAggregationDto>(`${this.baseUrl}/business-employees/stats/aggregate`, { params, ...this.getHttpOptions() });
  }

  // Agregado por usuario
  getAggregatedStatsByUser(userId: number): Observable<StatsAggregationDto> {
    return this.http.get<StatsAggregationDto>(`${this.baseUrl}/users/${userId}/businesses/stats`, this.getHttpOptions());
  }

  // Composición de cargos por RUC
  getJobRoleCompositionByRuc(ruc: string): Observable<JobRoleDto[]> {
    return this.http.get<JobRoleDto[]>(`${this.baseUrl}/business-employees/company/${ruc}/job-roles`, this.getHttpOptions())
      .pipe(
        catchError(err => {
          console.error('Error obteniendo composición de cargos:', err);
          return of([]);
        })
      );
  }

  // Distribución de nivel de educación por RUC
  getEducationLevelsByRuc(ruc: string): Observable<EducationLevelDto[]> {
    return this.http.get<EducationLevelDto[]>(`${this.baseUrl}/business-employees/company/${ruc}/education-levels`, this.getHttpOptions())
      .pipe(
        catchError(err => {
          console.error('Error obteniendo niveles de educación:', err);
          return of([]);
        })
      );
  }
}
