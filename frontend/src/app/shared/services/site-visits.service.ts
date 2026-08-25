import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SiteVisitResponse {
  total: number;
  companiesActive?: number;
  key?: string;
}

export interface LandingPublicStats {
  visits: number;
  companiesActive: number;
}

@Injectable({ providedIn: 'root' })
export class SiteVisitsService {
  private readonly baseUrl = `${environment.apiUrl}/api/public/site-visits`;
  private readonly sessionFlag = 'is_site_visit_session_v2';

  constructor(private http: HttpClient) {}

  getStats(): Observable<LandingPublicStats> {
    return this.http.get<SiteVisitResponse>(this.baseUrl).pipe(
      map((res) => this.normalize(res)),
      catchError(() => of({ visits: 0, companiesActive: 0 }))
    );
  }

  /** Una sola vez por sesión: suma visita real y devuelve visitas + empresas activas. */
  registerVisitOnce(): Observable<LandingPublicStats> {
    try {
      if (sessionStorage.getItem(this.sessionFlag)) {
        return this.getStats();
      }
    } catch {
      // sessionStorage no disponible
    }

    return this.http.post<SiteVisitResponse>(this.baseUrl, {}).pipe(
      map((res) => {
        try {
          sessionStorage.setItem(this.sessionFlag, '1');
        } catch {
          // ignore
        }
        return this.normalize(res);
      }),
      catchError(() => this.getStats())
    );
  }

  private normalize(res: SiteVisitResponse | null | undefined): LandingPublicStats {
    return {
      visits: Number(res?.total) || 0,
      companiesActive: Number(res?.companiesActive) || 0
    };
  }
}
