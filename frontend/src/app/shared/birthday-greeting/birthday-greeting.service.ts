import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BirthdayPerson {
  id: number;
  fullName: string;
  firstName?: string;
  position?: string;
  photo?: string;
  age?: number;
}

export interface BirthdayGreetingToday {
  enabled: boolean;
  message?: string | null;
  showPhoto?: boolean;
  companyName?: string;
  companyLogo?: string;
  people?: BirthdayPerson[];
}

@Injectable({ providedIn: 'root' })
export class BirthdayGreetingService {
  constructor(private http: HttpClient) {}

  today(ruc: string): Observable<BirthdayGreetingToday> {
    return this.http.get<BirthdayGreetingToday>(
      `/api/employee/${encodeURIComponent(ruc)}/birthdays/today`
    );
  }

  storageKey(ruc: string, date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const slot = date.getHours() < 15 ? 'am' : 'pm';
    return `birthday-greeting:${ruc}:${y}-${m}-${d}:${slot}`;
  }

  wasDismissed(ruc: string): boolean {
    try {
      return localStorage.getItem(this.storageKey(ruc)) === '1';
    } catch {
      return false;
    }
  }

  markDismissed(ruc: string): void {
    try {
      localStorage.setItem(this.storageKey(ruc), '1');
    } catch { /* ignore */ }
  }
}
