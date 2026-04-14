import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';

/** Empresa resuelta para formularios / PDF de Talento Humano (usuario/:ruc/...). */
export interface ThResolvedBusiness {
  id: number;
  name: string;
  ruc: string;
  logo?: string | null;
}

/**
 * RUC del segmento /usuario/:ruc/... (no usar solo el contexto global: puede quedar desfasado al cambiar de empresa).
 */
export function extractUsuarioRucFromRoute(route: ActivatedRoute): string | null {
  let r: ActivatedRoute | null = route;
  while (r) {
    const p = r.snapshot?.params as Record<string, string | undefined>;
    const ruc = p?.['ruc'] ?? p?.['businessRuc'];
    if (ruc) return String(ruc).trim();
    r = r.parent as ActivatedRoute | null;
  }
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(/\/usuario\/([^/]+)\//);
    if (m?.[1]) return decodeURIComponent(m[1]).trim();
  }
  return null;
}

/**
 * Prioriza la empresa de la URL (RUC); si falla el API, usa el contexto activo.
 */
export function resolveThBusinessFromRoute(
  route: ActivatedRoute,
  businessService: BusinessService,
  businessContext: BusinessContextService
): Observable<ThResolvedBusiness | null> {
  const ruc = extractUsuarioRucFromRoute(route);
  if (ruc) {
    return businessService.getByRuc(ruc).pipe(
      map((b: any) => ({
        id: Number(b.id),
        name: String(b.name ?? '').trim() || 'Empresa',
        ruc: String(b.ruc ?? ruc).trim(),
        logo: (b.logo || b.logoUrl || null) as string | null
      })),
      catchError(() => {
        const a = businessContext.getActiveBusiness();
        if (a?.id) {
          return of({
            id: a.id,
            name: String(a.name ?? '').trim() || 'Empresa',
            ruc: String(a.ruc ?? ruc).trim(),
            logo: null
          });
        }
        return of(null);
      })
    );
  }
  const a = businessContext.getActiveBusiness();
  if (a?.id) {
    return of({
      id: a.id,
      name: String(a.name ?? '').trim() || 'Empresa',
      ruc: String(a.ruc ?? '').trim(),
      logo: null
    });
  }
  return of(null);
}
