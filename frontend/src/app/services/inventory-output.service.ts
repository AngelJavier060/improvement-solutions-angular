import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface InventoryOutputDetail {
  id?: number;
  variantId: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber?: string;
  warehouseLocation?: string;
  itemCondition?: 'NUEVO' | 'USADO' | 'REACONDICIONADO';
  notes?: string;
  issuedSize?: string;
  departmentId?: number;
  // Campos auxiliares para UI
  productName?: string;
  variantCode?: string;
  productImage?: string;
}

export interface InventoryOutput {
  id?: number;
  outputNumber: string;
  outputDate: string; // formato: YYYY-MM-DD
  outputType: 'EPP_TRABAJADOR' | 'PRESTAMO' | 'CONSUMO_AREA' | 'BAJA';
  employeeId?: number; // Para EPP a trabajador
  employeeName?: string; // Nombre del trabajador
  employeeCedula?: string; // Cédula del trabajador
  area?: string; // Para consumo de área
  project?: string; // Proyecto asociado
  returnDate?: string; // Fecha de devolución (para préstamos)
  authorizedBy?: string;
  documentImage?: string;
  notes?: string;
  status: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  details: InventoryOutputDetail[];
  // Campos de solo lectura
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryOutputService {
  constructor(private http: HttpClient) {}

  /**
   * Crear nueva salida de inventario
   */
  create(ruc: string, output: InventoryOutput): Observable<InventoryOutput> {
    return this.http.post<InventoryOutput>(`/api/inventory/${ruc}/outputs`, output);
  }

  /**
   * Listar todas las salidas
   */
  list(ruc: string): Observable<InventoryOutput[]> {
    return this.http.get<any[]>(`/api/inventory/${ruc}/outputs`).pipe(
      map(arr => (arr || []).map(x => this.toOutput(x)))
    );
  }

  /**
   * Buscar por rango de fechas
   */
  searchByDateRange(ruc: string, startDate: string, endDate: string): Observable<InventoryOutput[]> {
    return this.http.get<any[]>(
      `/api/inventory/${ruc}/outputs/search?startDate=${startDate}&endDate=${endDate}`
    ).pipe(map(arr => (arr || []).map(x => this.toOutput(x))));
  }

  /**
   * Buscar por tipo de salida
   */
  findByType(ruc: string, outputType: string): Observable<InventoryOutput[]> {
    return this.http.get<any[]>(`/api/inventory/${ruc}/outputs/type/${outputType}`).pipe(
      map(arr => (arr || []).map(x => this.toOutput(x)))
    );
  }

  /**
   * Buscar por trabajador
   */
  findByEmployee(ruc: string, employeeId: number): Observable<InventoryOutput[]> {
    return this.http.get<any[]>(`/api/inventory/${ruc}/outputs/employee/${employeeId}`).pipe(
      map(arr => (arr || []).map(x => this.toOutput(x)))
    );
  }

  /** Actualiza la ruta del documento asociado a una salida */
  updateDocument(ruc: string, outputId: number, documentPath: string): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/outputs/${outputId}/document`, { documentPath });
  }

  /** Confirma la salida (afecta stock) */
  confirm(ruc: string, outputId: number): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/outputs/${outputId}/confirm`, {});
  }

  /** Elimina una salida pendiente (BORRADOR) */
  delete(ruc: string, outputId: number): Observable<any> {
    return this.http.delete<any>(`/api/inventory/${ruc}/outputs/${outputId}`);
  }

  private toOutput(x: any): InventoryOutput {
    return {
      id: x?.id,
      outputNumber: x?.outputNumber || '',
      outputDate: x?.outputDate || '',
      outputType: x?.outputType,
      employeeId: x?.employeeId || undefined,
      area: x?.area || undefined,
      project: x?.project || undefined,
      returnDate: x?.returnDate || undefined,
      authorizedBy: x?.authorizedBy || undefined,
      documentImage: x?.documentImage || undefined,
      notes: x?.notes || undefined,
      status: x?.status || 'BORRADOR',
      details: Array.isArray(x?.details) ? x.details : [] as any,
      createdAt: x?.createdAt || undefined,
      updatedAt: x?.updatedAt || undefined
    } as InventoryOutput;
  }
}
