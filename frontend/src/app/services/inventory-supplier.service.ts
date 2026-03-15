import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventorySupplier {
  id?: number;
  name: string;
  ruc?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventorySupplierService {
  constructor(private http: HttpClient) {}

  list(ruc: string): Observable<InventorySupplier[]> {
    return this.http.get<InventorySupplier[]>(`/api/inventory/${ruc}/suppliers`);
  }

  create(ruc: string, payload: InventorySupplier): Observable<InventorySupplier> {
    return this.http.post<InventorySupplier>(`/api/inventory/${ruc}/suppliers`, payload);
  }

  update(ruc: string, id: number, payload: InventorySupplier): Observable<InventorySupplier> {
    return this.http.put<InventorySupplier>(`/api/inventory/${ruc}/suppliers/${id}`, payload);
  }

  delete(ruc: string, id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/suppliers/${id}`);
  }

  importFrom(ruc: string, sourceRuc: string): Observable<{ imported: number }> {
    const url = `/api/inventory/${ruc}/suppliers/import?sourceRuc=${encodeURIComponent(sourceRuc)}`;
    return this.http.post<{ imported: number }>(url, {});
  }

  listCatalog(): Observable<Array<{ name: string; ruc?: string; phone?: string; email?: string; address?: string }>> {
    return this.http.get<Array<{ name: string; ruc?: string; phone?: string; email?: string; address?: string }>>(`/api/inventory/catalog/suppliers`);
  }

  // Global supplier CRUD (independiente de empresa)
  listGlobal(): Observable<Array<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }>> {
    return this.http.get<Array<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }>>(`/api/inventory/catalog/suppliers/global`);
  }

  createGlobal(payload: { name: string; ruc?: string; phone?: string; email?: string; address?: string }): Observable<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }> {
    return this.http.post<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }>(`/api/inventory/catalog/suppliers`, payload);
  }

  updateGlobal(id: number, payload: { name: string; ruc?: string; phone?: string; email?: string; address?: string }): Observable<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }> {
    return this.http.put<{ id: number; name: string; ruc?: string; phone?: string; email?: string; address?: string }>(`/api/inventory/catalog/suppliers/${id}`, payload);
  }

  deleteGlobal(id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/catalog/suppliers/${id}`);
  }
}
