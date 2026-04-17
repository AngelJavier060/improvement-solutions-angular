import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TypeContract } from '../models/type-contract.model';

export type Iso9001CatalogKey =
  | 'tipo-documento'
  | 'proceso'
  | 'codigo'
  | 'almacenamiento'
  | 'disposicion-final';

@Injectable({
  providedIn: 'root'
})
export class Iso9001CatalogService {
  private readonly baseUrl = `${environment.apiUrl}/api/master-data/iso-9001-catalog`;

  constructor(private readonly http: HttpClient) {}

  getAll(catalogKey: Iso9001CatalogKey): Observable<TypeContract[]> {
    return this.http.get<TypeContract[]>(`${this.baseUrl}/${catalogKey}`);
  }

  getById(catalogKey: Iso9001CatalogKey, id: number): Observable<TypeContract> {
    return this.http.get<TypeContract>(`${this.baseUrl}/${catalogKey}/${id}`);
  }

  create(catalogKey: Iso9001CatalogKey, body: Pick<TypeContract, 'name' | 'description'>): Observable<TypeContract> {
    return this.http.post<TypeContract>(`${this.baseUrl}/${catalogKey}`, body);
  }

  update(
    catalogKey: Iso9001CatalogKey,
    id: number,
    body: Pick<TypeContract, 'name' | 'description'>
  ): Observable<TypeContract> {
    return this.http.put<TypeContract>(`${this.baseUrl}/${catalogKey}/${id}`, body);
  }

  delete(catalogKey: Iso9001CatalogKey, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${catalogKey}/${id}`);
  }
}
