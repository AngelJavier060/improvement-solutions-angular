import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
