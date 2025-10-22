import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    return this.http.get<InventoryOutput[]>(`/api/inventory/${ruc}/outputs`);
  }

  /**
   * Buscar por rango de fechas
   */
  searchByDateRange(ruc: string, startDate: string, endDate: string): Observable<InventoryOutput[]> {
    return this.http.get<InventoryOutput[]>(
      `/api/inventory/${ruc}/outputs/search?startDate=${startDate}&endDate=${endDate}`
    );
  }

  /**
   * Buscar por tipo de salida
   */
  findByType(ruc: string, outputType: string): Observable<InventoryOutput[]> {
    return this.http.get<InventoryOutput[]>(`/api/inventory/${ruc}/outputs/type/${outputType}`);
  }

  /**
   * Buscar por trabajador
   */
  findByEmployee(ruc: string, employeeId: number): Observable<InventoryOutput[]> {
    return this.http.get<InventoryOutput[]>(`/api/inventory/${ruc}/outputs/employee/${employeeId}`);
  }
}
