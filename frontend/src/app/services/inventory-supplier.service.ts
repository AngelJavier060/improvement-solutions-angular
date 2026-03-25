import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

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

  private suppliersSubject = new BehaviorSubject<InventorySupplier[]>([]);
  readonly suppliers$ = this.suppliersSubject.asObservable();

  list(ruc: string): Observable<InventorySupplier[]> {
    return this.http.get<InventorySupplier[]>(`/api/inventory/${ruc}/suppliers`);
  }

  refresh(ruc: string): Observable<InventorySupplier[]> {
    return this.list(ruc).pipe(
      tap(list => this.suppliersSubject.next(list.filter(s => s.active !== false)))
    );
  }

  create(ruc: string, payload: InventorySupplier): Observable<InventorySupplier> {
    return this.http.post<InventorySupplier>(`/api/inventory/${ruc}/suppliers`, payload).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  update(ruc: string, id: number, payload: InventorySupplier): Observable<InventorySupplier> {
    return this.http.put<InventorySupplier>(`/api/inventory/${ruc}/suppliers/${id}`, payload).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  delete(ruc: string, id: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/suppliers/${id}`).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
  }

  importFrom(ruc: string, sourceRuc: string): Observable<{ imported: number }> {
    const url = `/api/inventory/${ruc}/suppliers/import?sourceRuc=${encodeURIComponent(sourceRuc)}`;
    return this.http.post<{ imported: number }>(url, {}).pipe(
      tap(() => this.refresh(ruc).subscribe())
    );
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
