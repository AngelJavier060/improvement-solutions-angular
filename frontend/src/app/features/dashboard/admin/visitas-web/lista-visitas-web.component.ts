import { Component, OnInit } from '@angular/core';
import { SiteVisitLogItem, SiteVisitsAdminOverview, SiteVisitsAdminService } from './site-visits-admin.service';

@Component({
  selector: 'app-lista-visitas-web',
  templateUrl: './lista-visitas-web.component.html',
  styleUrls: ['./lista-visitas-web.component.scss']
})
export class ListaVisitasWebComponent implements OnInit {
  loading = false;
  error: string | null = null;
  totalVisits = 0;
  uniqueIpsLast24h = 0;
  visits: SiteVisitLogItem[] = [];
  limit = 100;

  constructor(private siteVisitsAdminService: SiteVisitsAdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.siteVisitsAdminService.getOverview(this.limit).subscribe({
      next: (data: SiteVisitsAdminOverview) => {
        this.totalVisits = data?.totalVisits ?? 0;
        this.uniqueIpsLast24h = data?.uniqueIpsLast24h ?? 0;
        this.visits = Array.isArray(data?.recent) ? data.recent : [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar visitas web', err);
        this.error = err?.status === 403
          ? 'No tiene permiso para ver este registro (solo Super Administrador).'
          : 'No se pudieron cargar las visitas. Verifique que el backend esté activo.';
        this.loading = false;
      }
    });
  }

  shortBrowser(userAgent: string | null): string {
    if (!userAgent) {
      return 'Desconocido';
    }
    const ua = userAgent;
    if (/Edg\//i.test(ua)) return 'Microsoft Edge';
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
    if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/Mobile/i.test(ua)) return 'Navegador móvil';
    return ua.length > 48 ? ua.slice(0, 48) + '…' : ua;
  }

  shortLanguage(lang: string | null): string {
    if (!lang) {
      return '—';
    }
    const primary = lang.split(',')[0]?.trim() || lang;
    return primary.length > 24 ? primary.slice(0, 24) + '…' : primary;
  }

  shortReferer(referer: string | null): string {
    if (!referer) {
      return 'Entrada directa';
    }
    try {
      const url = new URL(referer);
      return url.host + (url.pathname !== '/' ? url.pathname : '');
    } catch {
      return referer.length > 40 ? referer.slice(0, 40) + '…' : referer;
    }
  }
}
