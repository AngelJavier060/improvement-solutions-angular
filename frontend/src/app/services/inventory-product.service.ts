import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryProduct {
  id?: number;
  code: string;
  category: string;
  name: string;
  description?: string;
  unitOfMeasure?: string;
  brand?: string;
  model?: string;
  specsJson?: string;
  certificationsJson?: string;
  image?: string;
  status?: 'ACTIVO' | 'INACTIVO' | 'DESCONTINUADO';
  minStock?: number;
  supplier?: { id: number } | null;
}

@Injectable({ providedIn: 'root' })
export class InventoryProductService {
  constructor(private http: HttpClient) {}

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
