import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface ActiveBusiness {
  id: number;
  ruc: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class BusinessContextService {
  private STORAGE_KEY = 'activeBusiness';

  constructor(private router: Router) {}

  setActiveBusiness(business: ActiveBusiness): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(business));
  }

  getActiveBusiness(): ActiveBusiness | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'number' && typeof parsed.ruc === 'string') {
        return parsed as ActiveBusiness;
      }
      return null;
    } catch {
      return null;
    }
  }

  clearActiveBusiness(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Utilidad: decodificar JWT del localStorage (authToken)
  getCurrentUserIdFromToken(): number | null {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      const id = payload?.id ?? payload?.userId ?? payload?.user_id ?? payload?.uid ?? null;
      return typeof id === 'number' ? id : (typeof id === 'string' ? parseInt(id, 10) : null);
    } catch {
      return null;
    }
  }
}
