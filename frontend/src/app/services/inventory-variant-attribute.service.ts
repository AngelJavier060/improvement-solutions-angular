import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VariantAttribute {
  id?: number;
  attributeName: string;
  attributeValue: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryVariantAttributeService {
  constructor(private http: HttpClient) {}

  list(ruc: string, variantId: number): Observable<VariantAttribute[]> {
    return this.http.get<VariantAttribute[]>(`/api/inventory/${ruc}/variants/${variantId}/attributes`);
  }

  create(ruc: string, variantId: number, payload: VariantAttribute): Observable<VariantAttribute> {
    return this.http.post<VariantAttribute>(`/api/inventory/${ruc}/variants/${variantId}/attributes`, payload);
  }

  update(ruc: string, variantId: number, attributeId: number, payload: VariantAttribute): Observable<VariantAttribute> {
    return this.http.put<VariantAttribute>(`/api/inventory/${ruc}/variants/${variantId}/attributes/${attributeId}`, payload);
  }

  delete(ruc: string, variantId: number, attributeId: number): Observable<void> {
    return this.http.delete<void>(`/api/inventory/${ruc}/variants/${variantId}/attributes/${attributeId}`);
  }
}
