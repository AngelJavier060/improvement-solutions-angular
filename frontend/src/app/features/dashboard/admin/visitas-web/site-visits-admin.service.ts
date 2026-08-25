import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface SiteVisitLogItem {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  path: string | null;
  createdAt: string;
  hitsLast24h: number;
  suspicious: boolean;
}

export interface SiteVisitsAdminOverview {
  totalVisits: number;
  uniqueIpsLast24h: number;
  recent: SiteVisitLogItem[];
}

@Injectable({ providedIn: 'root' })
export class SiteVisitsAdminService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin/site-visits`;

  constructor(private http: HttpClient) {}

  getOverview(limit = 100): Observable<SiteVisitsAdminOverview> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<SiteVisitsAdminOverview>(this.baseUrl, { params });
  }
}
