import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryProduct {
  id?: number;
  code: string;
  category?: string;
  /** Tipo operativo / familia: EPP | HERRAMIENTA | PIEZA */
  productKind?: 'EPP' | 'HERRAMIENTA' | 'PIEZA';
  /** Sección dentro de la familia (CAS, PAN, TAL...) */
  sectionCode?: string | null;
  sectionLabel?: string | null;
  categoryRef?: { id: number; name?: string } | null;
  name: string;
  description?: string;
  unitOfMeasure?: string;
  image?: string;
  status?: 'ACTIVO' | 'INACTIVO' | 'DESCONTINUADO';
}

export interface InventoryBodegaFamily {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface InventoryBodegaSection {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface InventoryBodegaParams {
  families: InventoryBodegaFamily[];
  sections: InventoryBodegaSection[];
}

@Injectable({ providedIn: 'root' })
export class InventoryProductService {
  constructor(private http: HttpClient) {}

  getBodegaParams(ruc: string): Observable<InventoryBodegaParams> {
    return this.http.get<InventoryBodegaParams>(`/api/inventory/${ruc}/bodega-params`);
  }

  list(ruc: string): Observable<InventoryProduct[]> {
    return this.http.get<InventoryProduct[]>(`/api/inventory/${ruc}/products`);
  }

  getById(ruc: string, id: number): Observable<InventoryProduct> {
    return this.http.get<InventoryProduct>(`/api/inventory/${ruc}/products/${id}`);
  }

  create(ruc: string, payload: InventoryProduct): Observable<InventoryProduct> {
    return this.http.post<InventoryProduct>(`/api/inventory/${ruc}/products`, payload);
  }

  update(ruc: string, id: number, payload: Partial<InventoryProduct>): Observable<InventoryProduct> {
    return this.http.put<InventoryProduct>(`/api/inventory/${ruc}/products/${id}`, payload);
  }

  delete(ruc: string, id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/products/${id}`);
  }
}
