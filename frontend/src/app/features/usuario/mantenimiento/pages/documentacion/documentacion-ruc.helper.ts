import { ActivatedRoute } from '@angular/router';

/** RUC empresarial desde ancestros (mantenimiento bajo usuario/:ruc). */
export function activeBusinessRuc(route: ActivatedRoute): string {
  let c: ActivatedRoute | null = route;
  while (c) {
    const r = c.snapshot.paramMap.get('ruc') || c.snapshot.paramMap.get('businessRuc');
    if (r) return r.trim();
    c = c.parent;
  }
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(/\/usuario\/([^/]+)\//);
    if (m?.[1]) return decodeURIComponent(m[1]).trim();
  }
  return '';
}
