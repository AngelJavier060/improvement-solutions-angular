import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export type EppCatalogKey = 'familia' | 'seccion' | 'tipo-entrada' | 'tipo-salida' | 'tipo-acontecimiento' | 'estado-epi';

export interface EppCatalogItem {
  id: number;
  name: string;
  /** Código corto (familia/sección). Catálogos nombre-only no usan código. */
  code: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EppCatalogPayload {
  name: string;
  code: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class EppCatalogService {
  constructor(
    private readonly http: HttpClient,
    private readonly apiUrlService: ApiUrlService
  ) {}

  /** Catálogos solo con nombre + descripción (sin código). */
  isNameOnly(key: EppCatalogKey): boolean {
    return key === 'tipo-entrada'
      || key === 'tipo-salida'
      || key === 'tipo-acontecimiento'
      || key === 'estado-epi';
  }

  getAll(key: EppCatalogKey): Observable<EppCatalogItem[]> {
    return this.http.get<EppCatalogItem[]>(this.base(key));
  }

  getById(key: EppCatalogKey, id: number): Observable<EppCatalogItem> {
    return this.http.get<EppCatalogItem>(`${this.base(key)}/${id}`);
  }

  create(key: EppCatalogKey, payload: EppCatalogPayload): Observable<EppCatalogItem> {
    const body: any = {
      name: payload.name,
      description: payload.description,
      active: true
    };
    if (!this.isNameOnly(key)) {
      body.code = (payload.code || '').toString().trim().toUpperCase();
    }
    return this.http.post<EppCatalogItem>(this.base(key), body);
  }

  update(key: EppCatalogKey, id: number, payload: EppCatalogPayload): Observable<EppCatalogItem> {
    const body: any = {
      name: payload.name,
      description: payload.description
    };
    if (!this.isNameOnly(key)) {
      body.code = (payload.code || '').toString().trim().toUpperCase();
    }
    return this.http.put<EppCatalogItem>(`${this.base(key)}/${id}`, body);
  }

  delete(key: EppCatalogKey, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(key)}/${id}`);
  }

  private base(key: EppCatalogKey): string {
    const path =
      key === 'familia' ? '/api/epp-families'
      : key === 'seccion' ? '/api/epp-sections'
      : key === 'tipo-salida' ? '/api/inventory-output-types'
      : key === 'tipo-acontecimiento' ? '/api/inventory-acontecimiento-types'
      : key === 'estado-epi' ? '/api/inventory-estado-epi'
      : '/api/inventory-entry-types';
    return this.apiUrlService.getUrl(path);
  }
}
