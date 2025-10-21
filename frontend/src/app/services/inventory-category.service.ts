import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryCategory {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventoryCategoryService {
  constructor(private http: HttpClient) {}

  list(ruc: string): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(`/api/inventory/${ruc}/categories`);
  }

  create(ruc: string, payload: InventoryCategory): Observable<InventoryCategory> {
    return this.http.post<InventoryCategory>(`/api/inventory/${ruc}/categories`, payload);
  }

  update(ruc: string, id: number, payload: InventoryCategory): Observable<InventoryCategory> {
    return this.http.put<InventoryCategory>(`/api/inventory/${ruc}/categories/${id}`, payload);
  }

  delete(ruc: string, id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/categories/${id}`);
  }

  importFrom(ruc: string, sourceRuc: string): Observable<{ imported: number }> {
    const url = `/api/inventory/${ruc}/categories/import?sourceRuc=${encodeURIComponent(sourceRuc)}`;
    return this.http.post<{ imported: number }>(url, {});
  }

  listCatalog(): Observable<Array<{ name: string; description?: string }>> {
    return this.http.get<Array<{ name: string; description?: string }>>(`/api/inventory/catalog/categories`);
  }
}
