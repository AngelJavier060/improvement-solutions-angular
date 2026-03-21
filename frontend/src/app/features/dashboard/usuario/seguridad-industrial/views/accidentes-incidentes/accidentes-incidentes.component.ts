import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessIncidentService, BusinessIncidentDto, IncidentStats } from '../../../../../../services/business-incident.service';

@Component({
  selector: 'app-accidentes-incidentes',
  templateUrl: './accidentes-incidentes.component.html',
  styleUrls: ['./accidentes-incidentes.component.scss']
})
export class AccidentesIncidentesComponent implements OnInit {
  ruc: string | null = null;
  incidents: BusinessIncidentDto[] = [];
  stats: IncidentStats = { monthly: 0, open: 0, inReview: 0 };
  loading = false;
  error: string | null = null;

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;

  // Filtro activo
  activeFilter: 'TODOS' | 'ABIERTO' | 'EN_REVISION' | 'CERRADO' = 'TODOS';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private incidentService: BusinessIncidentService
  ) {}

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) { this.ruc = found; break; }
      parent = parent.parent;
    }
    if (this.ruc) {
      this.loadData();
    } else {
      this.error = 'No se pudo obtener el RUC de la empresa.';
    }
  }

  loadData(): void {
    if (!this.ruc) return;
    this.loading = true;
    this.error = null;

    this.incidentService.getByRuc(this.ruc).subscribe({
      next: (data) => {
        this.incidents = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar incidentes:', err);
        this.error = 'No se pudieron cargar los incidentes.';
        this.loading = false;
      }
    });

    this.incidentService.getStats(this.ruc).subscribe({
      next: (s) => this.stats = s,
      error: () => {}
    });
  }

  get filteredIncidents(): BusinessIncidentDto[] {
    if (this.activeFilter === 'TODOS') return this.incidents;
    return this.incidents.filter(i => i.status === this.activeFilter);
  }

  get paginatedIncidents(): BusinessIncidentDto[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredIncidents.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredIncidents.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setFilter(f: 'TODOS' | 'ABIERTO' | 'EN_REVISION' | 'CERRADO'): void {
    this.activeFilter = f;
    this.currentPage = 1;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  openForm(): void {
    if (this.ruc) {
      this.router.navigate(['/usuario', this.ruc, 'seguridad-industrial', 'accidentes-incidentes', 'nuevo']);
    }
  }

  viewDetail(id?: number): void {
    if (this.ruc && id) {
      this.router.navigate(['/usuario', this.ruc, 'seguridad-industrial', 'accidentes-incidentes', id]);
    }
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return date; }
  }

  getStatusClass(status?: string): string {
    switch ((status || '').toUpperCase()) {
      case 'ABIERTO':      return 'status-open';
      case 'CERRADO':      return 'status-closed';
      case 'EN_REVISION':  return 'status-review';
      default:             return 'status-open';
    }
  }

  getTypeClass(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'seguridad':    return 'badge-seguridad';
      case 'ambiente':     return 'badge-ambiente';
      case 'operacional':  return 'badge-operacional';
      default:             return 'badge-otros';
    }
  }

  getTypeBadgeLabel(type?: string): string {
    const map: Record<string, string> = {
      'salud y seguridad': 'Seguridad',
      'ambiente': 'Ambiente',
      'financiero/activos/producción': 'Financiero',
      'reputación/licencia para operar': 'Reputación',
      'procesos': 'Procesos'
    };
    return map[(type || '').toLowerCase()] || (type || 'Otro');
  }
}
