import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle, VehicleListResponse, CreateVehicleRequest, VehicleKPIs, FichaCatalogsResponse } from '../models/vehicle.model';

export interface FleetVehicleDocumentDto {
  id: number;
  originalFilename: string;
  url: string;
  contentType?: string;
  fileSize?: number;
  description?: string;
  createdAt?: string;
}

type VehicleWritePayload = Partial<Vehicle> | CreateVehicleRequest | Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class FleetService {
  private baseUrl = '/api/fleet';

  constructor(private http: HttpClient) {}

  getFichaCatalogs(businessRuc: string): Observable<FichaCatalogsResponse> {
    return this.http.get<FichaCatalogsResponse>(`${this.baseUrl}/${businessRuc}/ficha-catalogs`);
  }

  getVehicles(businessRuc: string, page: number = 1, pageSize: number = 25): Observable<VehicleListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    return this.http.get<VehicleListResponse>(`${this.baseUrl}/${businessRuc}/vehicles`, { params });
  }

  getVehicleById(businessRuc: string, vehicleId: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}`);
  }

  createVehicle(businessRuc: string, vehicle: CreateVehicleRequest): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.baseUrl}/${businessRuc}/vehicles`, vehicle);
  }

  updateVehicle(businessRuc: string, vehicleId: number, vehicle: VehicleWritePayload): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}`, vehicle);
  }

  deleteVehicle(businessRuc: string, vehicleId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}`);
  }

  listVehicleDocuments(businessRuc: string, vehicleId: number): Observable<FleetVehicleDocumentDto[]> {
    return this.http.get<FleetVehicleDocumentDto[]>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}/documents`);
  }

  uploadVehicleDocument(
    businessRuc: string,
    vehicleId: number,
    file: File,
    description?: string
  ): Observable<FleetVehicleDocumentDto> {
    const formData = new FormData();
    formData.append('file', file);
    if (description != null && description !== '') {
      formData.append('description', description);
    }
    return this.http.post<FleetVehicleDocumentDto>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}/documents`, formData);
  }

  deleteVehicleDocument(businessRuc: string, vehicleId: number, docId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}/documents/${docId}`);
  }

  /** URL autenticada para visualizar PDF de flota. */
  vehicleDocumentContentUrl(businessRuc: string, vehicleId: number, docId: number): string {
    return `${this.baseUrl}/${encodeURIComponent(businessRuc)}/vehicles/${vehicleId}/documents/${docId}/content`;
  }

  /** ZIP con los PDF vigentes de esta unidad. */
  vehicleDocumentsZipUrl(businessRuc: string, vehicleId: number): string {
    return `${this.baseUrl}/${encodeURIComponent(businessRuc)}/vehicles/${vehicleId}/documents/zip`;
  }

  recoverOrphanComplianceDocs(businessRuc: string, vehicleId: number): Observable<unknown[]> {
    return this.http.post<unknown[]>(
      `${this.baseUrl}/${encodeURIComponent(businessRuc)}/vehicles/${vehicleId}/compliance-docs/recover-orphans`,
      {}
    );
  }

  /** Documentos (entidades remitente) aplicables al tipo de la unidad. */
  getApplicableDocs(businessRuc: string, vehicleId: number): Observable<{
    vehicleId: number;
    businessId: number;
    tipoVehiculoId: number | null;
    tipoVehiculoName: string | null;
    configured: boolean;
    message: string | null;
    documentos: Array<{ id: number; name: string; description?: string; category?: string }>;
  }> {
    return this.http.get<any>(
      `${this.baseUrl}/${encodeURIComponent(businessRuc)}/vehicles/${vehicleId}/applicable-docs`
    );
  }

  getKPIs(businessRuc: string): Observable<VehicleKPIs> {
    return this.http.get<VehicleKPIs>(`${this.baseUrl}/${businessRuc}/kpis`);
  }

  uploadVehicleImage(businessRuc: string, vehicleId: number, file: File, imageType: 'principal' | 'lateral' | 'interior'): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('imageType', imageType);
    
    return this.http.post<{ url: string }>(`${this.baseUrl}/${businessRuc}/vehicles/${vehicleId}/images`, formData);
  }
}
