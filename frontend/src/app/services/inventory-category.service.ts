import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface InventoryCategory {
  id?: number;
  name: string;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventoryCategoryService {
  constructor(private http: HttpClient) {}

  private categoriesSubject = new BehaviorSubject<InventoryCategory[]>([]);
  readonly categories$ = this.categoriesSubject.asObservable();

  list(ruc: string): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(`/api/inventory/${ruc}/categories`);
  }

  refresh(ruc: string): Observable<InventoryCategory[]> {
    return this.list(ruc).pipe(
      tap(list => this.categoriesSubject.next(list))
    );
  }

  create(ruc: string, payload: InventoryCategory): Observable<InventoryCategory> {
    return this.http.post<InventoryCategory>(`/api/inventory/${ruc}/categories`, payload).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  update(ruc: string, id: number, payload: InventoryCategory): Observable<InventoryCategory> {
    return this.http.put<InventoryCategory>(`/api/inventory/${ruc}/categories/${id}`, payload).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  delete(ruc: string, id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/categories/${id}`).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  importFrom(ruc: string, sourceRuc: string): Observable<{ imported: number }> {
    const url = `/api/inventory/${ruc}/categories/import?sourceRuc=${encodeURIComponent(sourceRuc)}`;
    return this.http.post<{ imported: number }>(url, {}).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  listCatalog(): Observable<Array<{ name: string; description?: string }>> {
    return this.http.get<Array<{ name: string; description?: string }>>(`/api/inventory/catalog/categories`);
  }

  createGlobal(payload: { name: string; description?: string }): Observable<{ name: string; description?: string }> {
    return this.http.post<{ name: string; description?: string }>(`/api/inventory/catalog/categories`, payload);
  }

  // Global CRUD with IDs
  listGlobal(): Observable<Array<{ id: number; name: string; description?: string }>> {
    return this.http.get<Array<{ id: number; name: string; description?: string }>>(`/api/inventory/catalog/categories/global`);
  }

  updateGlobal(id: number, payload: { name: string; description?: string }): Observable<{ id: number; name: string; description?: string }> {
    return this.http.put<{ id: number; name: string; description?: string }>(`/api/inventory/catalog/categories/${id}`, payload);
  }

  deleteGlobal(id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/catalog/categories/${id}`);
  }
}
