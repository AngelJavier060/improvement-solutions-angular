import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StockBajoItem {
  variantId: number;
  variantCode: string;
  productName: string;
  currentQty: number;
  minQty: number;
}

export interface PrestamoAlertItem {
  outputId: number;
  outputNumber: string;
  employeeId?: number;
  returnDate: string;
  notes?: string;
}

export interface LoteAlertItem {
  lotId: number;
  lotNumber: string;
  expirationDate: string | null;
  currentQty: number;
  variantCode: string;
}

export interface StockAltoItem {
  variantId: number;
  variantCode: string;
  productName: string;
  currentQty: number;
  maxStock: number;
}

export interface InventoryAlerts {
  stockBajo: StockBajoItem[];
  stockAlto: StockAltoItem[];
  prestamosVencidos: PrestamoAlertItem[];
  prestamosProximosVencer: PrestamoAlertItem[];
  lotesPorVencer: LoteAlertItem[];
  lotesVencidos: LoteAlertItem[];
  totalAlertas: number;
  prestamosActivos: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryAlertService {
  constructor(private http: HttpClient) {}

  getAlerts(ruc: string): Observable<InventoryAlerts> {
    return this.http.get<InventoryAlerts>(`/api/inventory/${ruc}/alerts`);
  }
}
