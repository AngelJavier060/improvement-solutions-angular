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
  /** Stock actual en bodega al momento de agregar la línea (solo UI). */
  currentQty?: number;
}

export interface InventoryEntry {
  id?: number;
  entryNumber: string;
  entryDate: string; // formato: YYYY-MM-DD
  entryType: string;
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
    return this.http.post<InventoryEntry>(`/api/inventory/${ruc}/entries`, this.toPayload(entry));
  }

  /**
   * Listar todas las entradas
   */
  list(ruc: string): Observable<InventoryEntry[]> {
    return this.http.get<InventoryEntry[]>(`/api/inventory/${ruc}/entries`);
  }

  /** Siguiente número consecutivo del año (ENT-2026-0001). */
  nextNumber(ruc: string): Observable<{ entryNumber: string }> {
    return this.http.get<{ entryNumber: string }>(`/api/inventory/${ruc}/entries/next-number`);
  }

  /** Tipos de entrada asignados a la empresa. */
  listEntryTypes(ruc: string): Observable<Array<{ id: number; name: string; code: string; description?: string }>> {
    return this.http.get<Array<{ id: number; name: string; code: string; description?: string }>>(
      `/api/inventory/${ruc}/entries/types`
    );
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

  /** Anula entrada en BORRADOR (no afecta stock) */
  cancel(ruc: string, entryId: number): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/entries/${entryId}/cancel`, {});
  }

  private toPayload(entry: InventoryEntry): any {
    return {
      ...entry,
      details: (entry.details || []).map((d: any) => {
        const variantId = Number(d?.variantId || d?.variant?.id || 0) || undefined;
        return {
          quantity: d.quantity,
          unitCost: d.unitCost,
          taxPercentage: d.taxPercentage ?? 0,
          taxAmount: d.taxAmount ?? 0,
          totalCost: d.totalCost,
          lotNumber: d.lotNumber,
          manufacturingDate: d.manufacturingDate,
          expirationDate: d.expirationDate,
          warehouseLocation: d.warehouseLocation,
          itemCondition: d.itemCondition,
          notes: d.notes,
          variantId,
          variant: variantId ? { id: variantId } : undefined
        };
      })
    };
  }
}
