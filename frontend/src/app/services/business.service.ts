import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Business } from '../models/business.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    // Asegurarse de que la ruta incluya el prefijo /api/
    this.apiUrl = this.apiUrlService.getUrl('api/businesses');
  }

  getAll(): Observable<Business[]> {
    return this.http.get<Business[]>(this.apiUrl);
  }

  getById(id: number): Observable<Business> {
    return this.http.get<Business>(`${this.apiUrl}/${id}`);
  }

  // Detalles accesibles para USER/ADMIN con relaciones necesarias (contratistas/bloques)
  getDetails(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/details`);
  }

  getBusinessAdminDetails(id: number): Observable<Business> {
    return this.http.get<Business>(`${this.apiUrl}/${id}/admin`);
  }

  getByUserId(userId: number): Observable<Business[]> {
    return this.http.get<Business[]>(`${this.apiUrl}/byUser/${userId}`);
  }

  create(business: Business): Observable<Business> {
    return this.http.post<Business>(this.apiUrl, business);
  }

  update(id: number, business: Business): Observable<Business> {
    return this.http.put<Business>(`${this.apiUrl}/${id}`, business);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Métodos para manejar la asociación de usuarios a empresas
  addUserToBusiness(businessId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${businessId}/users/${userId}`, {});
  }

  removeUserFromBusiness(businessId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${businessId}/users/${userId}`);
  }

  // === MÉTODOS PARA DEPARTAMENTOS ===
  addDepartmentToBusiness(businessId: number, departmentId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/departments/${departmentId}`, {});
  }

  removeDepartmentFromBusiness(businessId: number, departmentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/departments/${departmentId}`);
  }

  /** Vincula un ítem del catálogo global ISO 9001 (Configuración) a la empresa. */
  addIso9001CatalogItemToBusiness(businessId: number, catalogItemId: number): Observable<{ message?: string }> {
    return this.http.post<{ message?: string }>(
      `${this.apiUrl}/${businessId}/iso-9001-catalog-item/${catalogItemId}`,
      {}
    );
  }

  removeIso9001CatalogItemFromBusiness(businessId: number, catalogItemId: number): Observable<{ message?: string }> {
    return this.http.delete<{ message?: string }>(
      `${this.apiUrl}/${businessId}/iso-9001-catalog-item/${catalogItemId}`
    );
  }

  // === MÉTODOS PARA CARGOS ===
  addPositionToBusiness(businessId: number, positionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/positions/${positionId}`, {});
  }

  removePositionFromBusiness(businessId: number, positionId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/positions/${positionId}`);
  }

  // === MÉTODOS PARA TIPOS DE DOCUMENTO ===
  addTypeDocumentToBusiness(businessId: number, typeDocumentId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/type-documents/${typeDocumentId}`, {});
  }

  removeTypeDocumentFromBusiness(businessId: number, typeDocumentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/type-documents/${typeDocumentId}`);
  }

  // === MÉTODOS PARA TIPOS DE CONTRATO ===
  addTypeContractToBusiness(businessId: number, typeContractId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/type-contracts/${typeContractId}`, {});
  }

  removeTypeContractFromBusiness(businessId: number, typeContractId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/type-contracts/${typeContractId}`);
  }

  // === MÉTODOS PARA MATRICES DE OBLIGACIONES ===
  addObligationMatrixToBusiness(businessId: number, obligationMatrixId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/obligation-matrices/${obligationMatrixId}`, {});
  }

  removeObligationMatrixFromBusiness(businessId: number, obligationMatrixId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/obligation-matrices/${obligationMatrixId}`);
  }

  // === MÉTODO PARA ACTUALIZAR CONFIGURACIONES GENERALES ===
  updateBusinessConfigurations(businessId: number, configurations: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${businessId}/admin/configurations`, configurations);
  }

  // === CONFIGURACIÓN DE MANTENIMIENTO (por empresa) ===
  getMaintenanceConfig(businessId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${businessId}/maintenance-config`, { responseType: 'text' })
      .pipe(map(raw => {
        try { return raw ? JSON.parse(raw as any) : {}; } catch { return {}; }
      }));
  }

  updateMaintenanceConfig(businessId: number, config: any): Observable<any> {
    const body = JSON.stringify(config || {});
    return this.http.put(`${this.apiUrl}/${businessId}/maintenance-config`, body, { responseType: 'text' })
      .pipe(map(raw => {
        try { return raw ? JSON.parse(raw as any) : {}; } catch { return {}; }
      }));
  }

  // === CONTACTOS DE EMERGENCIA (por empresa) ===
  getEmergencyContacts(businessId: number): Observable<Array<{ area: string; phone: string }>> {
    return this.http.get(`${this.apiUrl}/${businessId}/emergency-contacts`, { responseType: 'text' })
      .pipe(map(raw => {
        try {
          const parsed = raw ? JSON.parse(raw as any) : [];
          if (Array.isArray(parsed)) {
            return parsed
              .map((x: any) => ({ area: (x?.area || '').toString(), phone: (x?.phone || x?.numero || x?.contact || '').toString() }))
              .filter((x: any) => x.area || x.phone)
              .slice(0, 4);
          }
          return [];
        } catch { return []; }
      }));
  }

  updateEmergencyContacts(businessId: number, contacts: Array<{ area: string; phone: string }>): Observable<Array<{ area: string; phone: string }>> {
    const sanitized = (Array.isArray(contacts) ? contacts : [])
      .map(c => ({ area: (c.area || '').toString().trim(), phone: (c.phone || '').toString().trim() }))
      .filter(c => c.area || c.phone)
      .slice(0, 4);
    const body = JSON.stringify(sanitized);
    return this.http.put(`${this.apiUrl}/${businessId}/emergency-contacts`, body, { responseType: 'text' })
      .pipe(map(raw => {
        try { const arr = raw ? JSON.parse(raw as any) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
      }));
  }

  // === MÉTODOS PARA IESS ===
  addIessToBusiness(businessId: number, iessId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/iess/${iessId}`, {});
  }

  removeIessFromBusiness(businessId: number, iessId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/iess/${iessId}`);
  }

  // Métodos públicos
  searchByName(name: string): Observable<Business[]> {
    return this.http.get<Business[]>(`${this.apiUrl}/public/search?name=${name}`);
  }

  getByRuc(ruc: string): Observable<Business> {
    return this.http.get<Business>(`${this.apiUrl}/public/ruc/${ruc}`);
  }

  // === ADMINISTRADORES DE EMPRESA ===
  createBusinessAdmin(businessId: number, payload: {
    name: string;
    email: string;
    phone?: string;
    username: string;
    password: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/${businessId}/admins`, payload);
  }

  promoteUserToBusinessAdmin(businessId: number, userId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${businessId}/admins/${userId}`, {});
  }

  // === MÉTODOS PARA CURSOS Y CERTIFICACIONES ===
  addCourseCertificationToBusiness(businessId: number, courseCertificationId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/course-certifications/${courseCertificationId}`, {});
  }

  removeCourseCertificationFromBusiness(businessId: number, courseCertificationId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/course-certifications/${courseCertificationId}`);
  }

  // === MÉTODOS PARA TARJETAS ===
  addCardToBusiness(businessId: number, cardId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/cards/${cardId}`, {});
  }

  removeCardFromBusiness(businessId: number, cardId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/cards/${cardId}`);
  }

  // === MÉTODOS PARA JORNADAS DE TRABAJO ===
  addWorkScheduleToBusiness(businessId: number, workScheduleId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/work-schedules/${workScheduleId}`, {});
  }

  removeWorkScheduleFromBusiness(businessId: number, workScheduleId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/work-schedules/${workScheduleId}`);
  }

  // === MÉTODOS PARA HORARIOS DE TRABAJO ===
  addWorkShiftToBusiness(businessId: number, workShiftId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${businessId}/work-shifts/${workShiftId}`, {});
  }

  removeWorkShiftFromBusiness(businessId: number, workShiftId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${businessId}/work-shifts/${workShiftId}`);
  }
}
