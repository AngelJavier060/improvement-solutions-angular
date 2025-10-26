import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryEntryDetail {
  id?: number;
  variantId: number;
  quantity: number;
  unitCost: number;
  taxPercentage: number;
  taxAmount: number;
  totalCost: number;
  lotNumber?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  warehouseLocation?: string;
  itemCondition?: 'NUEVO' | 'USADO' | 'REACONDICIONADO';
  notes?: string;
  // Campos auxiliares para UI
  productName?: string;
  variantCode?: string;
  productImage?: string;
}

export interface InventoryEntry {
  id?: number;
  entryNumber: string;
  entryDate: string; // formato: YYYY-MM-DD
  entryType: 'COMPRA' | 'DEVOLUCION' | 'TRANSFERENCIA' | 'AJUSTE' | 'DONACION';
  supplierId?: number;
  origin?: string;
  receivedBy: string;
  authorizedBy?: string;
  documentImage?: string;
  notes?: string;
  status: 'BORRADOR' | 'CONFIRMADO' | 'ANULADO';
  details: InventoryEntryDetail[];
  // Campos de solo lectura
  createdAt?: string;
  updatedAt?: string;
  // Auxiliares
  supplierName?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryEntryService {
  constructor(private http: HttpClient) {}

  /**
   * Crear nueva entrada de inventario
   */
  create(ruc: string, entry: InventoryEntry): Observable<InventoryEntry> {
    return this.http.post<InventoryEntry>(`/api/inventory/${ruc}/entries`, entry);
  }

  /**
   * Listar todas las entradas
   */
  list(ruc: string): Observable<InventoryEntry[]> {
    return this.http.get<InventoryEntry[]>(`/api/inventory/${ruc}/entries`);
  }

  /**
   * Buscar por rango de fechas
   */
  searchByDateRange(ruc: string, startDate: string, endDate: string): Observable<InventoryEntry[]> {
    return this.http.get<InventoryEntry[]>(
      `/api/inventory/${ruc}/entries/search?startDate=${startDate}&endDate=${endDate}`
    );
  }

  /**
   * Buscar por proveedor
   */
  findBySupplier(ruc: string, supplierId: number): Observable<InventoryEntry[]> {
    return this.http.get<InventoryEntry[]>(`/api/inventory/${ruc}/entries/supplier/${supplierId}`);
  }

  /**
   * Obtener Kardex de una variante
   */
  getKardex(ruc: string, variantId: number): Observable<any[]> {
    return this.http.get<any[]>(`/api/inventory/${ruc}/entries/kardex/${variantId}`);
  }

  /** Confirma la entrada (afecta stock) */
  confirm(ruc: string, entryId: number): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/entries/${entryId}/confirm`, {});
  }
}
