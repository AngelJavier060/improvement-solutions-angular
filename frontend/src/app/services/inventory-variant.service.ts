import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryVariant {
  id?: number;
  code: string;
  description?: string;
  sizeLabel?: string;
  dimensions?: string;
  salePrice?: number;
  minQty?: number;
  location?: string;
  image?: string;
  status?: 'ACTIVO' | 'INACTIVO';
  // campos de solo lectura útiles en la UI
  currentQty?: number;
  unitCost?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryVariantService {
  constructor(private http: HttpClient) {}

  listByProduct(ruc: string, productId: number): Observable<InventoryVariant[]> {
    return this.http.get<InventoryVariant[]>(`/api/inventory/${ruc}/products/${productId}/variants`);
  }

  create(ruc: string, payload: any): Observable<InventoryVariant> {
    const productId = payload.productId;
    return this.http.post<InventoryVariant>(`/api/inventory/${ruc}/products/${productId}/variants`, payload);
  }

  update(ruc: string, variantId: number, payload: any): Observable<InventoryVariant> {
    const productId = payload.productId;
    return this.http.put<InventoryVariant>(`/api/inventory/${ruc}/products/${productId}/variants/${variantId}`, payload);
  }

  delete(ruc: string, productId: number, variantId: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/products/${productId}/variants/${variantId}`);
  }
}
