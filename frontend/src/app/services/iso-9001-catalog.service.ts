import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Iso9001CatalogKey =
  | 'tipo-documento'
  | 'proceso'
  | 'codigo'
  | 'almacenamiento'
  | 'disposicion-final';

/** Ítem del catálogo global ISO 9001 (configuración central). */
export interface Iso9001CatalogItem {
  id?: number;
  name: string;
  /** Código corto (2–5 letras) para el número de registro del SGC. */
  code?: string | null;
  description?: string;
  catalogCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Iso9001CatalogService {
  private readonly baseUrl = `${environment.apiUrl}/api/master-data/iso-9001-catalog`;

  constructor(private readonly http: HttpClient) {}

  getAll(catalogKey: Iso9001CatalogKey): Observable<Iso9001CatalogItem[]> {
    return this.http.get<Iso9001CatalogItem[]>(`${this.baseUrl}/${catalogKey}`);
  }

  getById(catalogKey: Iso9001CatalogKey, id: number): Observable<Iso9001CatalogItem> {
    return this.http.get<Iso9001CatalogItem>(`${this.baseUrl}/${catalogKey}/${id}`);
  }

  create(
    catalogKey: Iso9001CatalogKey,
    body: Pick<Iso9001CatalogItem, 'name' | 'description' | 'code'>
  ): Observable<Iso9001CatalogItem> {
    return this.http.post<Iso9001CatalogItem>(`${this.baseUrl}/${catalogKey}`, body);
  }

  update(
    catalogKey: Iso9001CatalogKey,
    id: number,
    body: Pick<Iso9001CatalogItem, 'name' | 'description' | 'code'>
  ): Observable<Iso9001CatalogItem> {
    return this.http.put<Iso9001CatalogItem>(`${this.baseUrl}/${catalogKey}/${id}`, body);
  }

  delete(catalogKey: Iso9001CatalogKey, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${catalogKey}/${id}`);
  }
}
