import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscriptionPlan {
  id?: number;
  code: string;
  name: string;
  description?: string;
  durationMonths: number;
  price: number;
  currency: string;
  active: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id?: number;
  business: any | null;
  businessModule: any | null;
  plan: SubscriptionPlan | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
  confirmedBy?: any | null;
  confirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionPlanService {

  private plansUrl = `${environment.apiUrl}/api/subscription-plans`;
  private paymentsUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {}

  // ---- Plans ----

  getPlans(includeInactive = false): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.plansUrl}?includeInactive=${includeInactive}`);
  }

  getPlanById(id: number): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${this.plansUrl}/${id}`);
  }

  createPlan(plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(this.plansUrl, plan);
  }

  updatePlan(id: number, plan: SubscriptionPlan): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.plansUrl}/${id}`, plan);
  }

  deletePlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.plansUrl}/${id}`);
  }

  // ---- Payments ----

  getPayments(businessId?: number, status?: string): Observable<Payment[]> {
    let url = this.paymentsUrl;
    const params: string[] = [];
    if (businessId) params.push(`businessId=${businessId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<Payment[]>(url);
  }

  getPaymentById(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.paymentsUrl}/${id}`);
  }

  createPayment(payload: any): Observable<Payment> {
    return this.http.post<Payment>(this.paymentsUrl, payload);
  }

  confirmPayment(id: number): Observable<Payment> {
    return this.http.put<Payment>(`${this.paymentsUrl}/${id}/confirm`, {});
  }

  rejectPayment(id: number, reason: string): Observable<Payment> {
    return this.http.put<Payment>(`${this.paymentsUrl}/${id}/reject`, { reason });
  }
}
