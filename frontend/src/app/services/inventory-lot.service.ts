import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryLotDto {
  id: number;
  lotNumber: string;
  currentQty: number;
  manufacturingDate?: string;
  expirationDate?: string;
  warehouseLocation?: string;
  itemCondition?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryLotService {
  constructor(private http: HttpClient) {}

  list(ruc: string, variantId: number): Observable<InventoryLotDto[]> {
    return this.http.get<InventoryLotDto[]>(`/api/inventory/${ruc}/variants/${variantId}/lots`);
  }

  listAvailable(ruc: string, variantId: number): Observable<InventoryLotDto[]> {
    return this.http.get<InventoryLotDto[]>(`/api/inventory/${ruc}/variants/${variantId}/lots/available`);
  }
}
