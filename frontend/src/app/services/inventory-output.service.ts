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
  salePrice?: number;
  discountAmount?: number;
  // Campos auxiliares para UI / Acta EPP
  productName?: string;
  variantCode?: string;
  productImage?: string;
  generalSpecs?: string;
  brand?: string;
  techSheetPdf?: string;
  supplierName?: string;
  minUseTime?: string;
}

export interface InventoryOutput {
  id?: number;
  outputNumber: string;
  outputDate: string; // formato: YYYY-MM-DD
  outputType: string;
  employeeId?: number; // Para EPP a trabajador
  employeeName?: string; // Nombre del trabajador
  employeeCedula?: string; // Cédula del trabajador
  area?: string; // Para consumo de área
  project?: string; // Proyecto asociado
  returnDate?: string; // Fecha esperada de devolución (para préstamos)
  returned?: boolean;
  returnedAt?: string;
  returnEntryId?: number;
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
    return this.http.post<InventoryOutput>(`/api/inventory/${ruc}/outputs`, this.toPayload(output));
  }

  /** Siguiente consecutivo SAL-AAAA-#### de la empresa. */
  nextNumber(ruc: string): Observable<{ outputNumber: string }> {
    return this.http.get<{ outputNumber: string }>(`/api/inventory/${ruc}/outputs/next-number`);
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
   * Tipos de salida asignados a la empresa (Inventario-Bodega).
   */
  listOutputTypes(ruc: string): Observable<Array<{ id?: number; name: string; description?: string }>> {
    return this.http.get<Array<{ id?: number; name: string; description?: string }>>(
      `/api/inventory/${ruc}/outputs/types`
    );
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

  /** Marca préstamo/salida como ya devuelto */
  markReturned(ruc: string, outputId: number, returnEntryId?: number): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/outputs/${outputId}/returned`, {
      returnEntryId: returnEntryId ?? null
    });
  }

  /** Anula salida en BORRADOR (no afecta stock) */
  cancel(ruc: string, outputId: number): Observable<any> {
    return this.http.patch<any>(`/api/inventory/${ruc}/outputs/${outputId}/cancel`, {});
  }

  /** Elimina una salida pendiente (BORRADOR) */
  delete(ruc: string, outputId: number): Observable<any> {
    return this.http.delete<any>(`/api/inventory/${ruc}/outputs/${outputId}`);
  }

  private toPayload(output: InventoryOutput): any {
    return {
      ...output,
      details: (output.details || []).map((d: any) => {
        const variantId = Number(d?.variantId || d?.variant?.id || 0) || undefined;
        return {
          quantity: d.quantity,
          unitCost: d.unitCost,
          totalCost: d.totalCost,
          lotNumber: d.lotNumber,
          warehouseLocation: d.warehouseLocation,
          itemCondition: d.itemCondition,
          notes: d.notes,
          issuedSize: d.issuedSize,
          departmentId: d.departmentId,
          salePrice: d.salePrice,
          discountAmount: d.discountAmount,
          variantId,
          variant: variantId ? { id: variantId } : undefined
        };
      })
    };
  }

  private toOutput(x: any): InventoryOutput {
    const details = Array.isArray(x?.details)
      ? x.details.map((d: any) => ({
          id: d?.id,
          variantId: Number(d?.variantId || d?.variant?.id || 0),
          quantity: Number(d?.quantity || 0),
          unitCost: Number(d?.unitCost || 0),
          totalCost: Number(d?.totalCost || 0),
          lotNumber: d?.lotNumber,
          warehouseLocation: d?.warehouseLocation,
          itemCondition: d?.itemCondition,
          notes: d?.notes,
          issuedSize: d?.issuedSize,
          departmentId: d?.departmentId,
          salePrice: d?.salePrice,
          discountAmount: d?.discountAmount,
          productName: d?.productName,
          variantCode: d?.variantCode || d?.variant?.code,
          productImage: d?.productImage
        }))
      : [];
    return {
      id: x?.id,
      outputNumber: x?.outputNumber || '',
      outputDate: x?.outputDate || '',
      outputType: x?.outputType,
      employeeId: x?.employeeId || undefined,
      area: x?.area || undefined,
      project: x?.project || undefined,
      returnDate: x?.returnDate || undefined,
      returned: !!x?.returned,
      returnedAt: x?.returnedAt || undefined,
      returnEntryId: x?.returnEntryId || undefined,
      authorizedBy: x?.authorizedBy || undefined,
      documentImage: x?.documentImage || undefined,
      notes: x?.notes || undefined,
      status: x?.status || 'BORRADOR',
      details,
      createdAt: x?.createdAt || undefined,
      updatedAt: x?.updatedAt || undefined
    } as InventoryOutput;
  }
}
