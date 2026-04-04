import { ActivatedRoute } from '@angular/router';

/** RUC empresarial desde ancestros (mantenimiento bajo usuario/:ruc). */
export function activeBusinessRuc(route: ActivatedRoute): string {
  let c: ActivatedRoute | null = route;
  while (c) {
    const r = c.snapshot.paramMap.get('ruc');
    if (r) return r.trim();
    c = c.parent;
  }
  return '';
}
