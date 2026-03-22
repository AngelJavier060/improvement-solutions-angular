import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessIncidentService, BusinessIncidentDto } from '../../../../../services/business-incident.service';

@Component({
  selector: 'app-accidentes',
  templateUrl: './accidentes.component.html',
  styleUrls: ['./accidentes.component.scss']
})
export class AccidentesComponent implements OnInit {

  businessId: number | null = null;
  businessRuc: string | null = null;
  businessName: string = '';

  records: BusinessIncidentDto[] = [];
  filteredRecords: BusinessIncidentDto[] = [];
  loading = false;
  error: string | null = null;

  searchTerm: string = '';
  filterTab: string = 'Todos';

  // Detalle del incidente seleccionado
  selectedIncident: BusinessIncidentDto | null = null;

  readonly tabs = ['Todos', 'Seguridad'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessContext: BusinessContextService,
    private businessService: BusinessService,
    private incidentService: BusinessIncidentService
  ) {}

  ngOnInit(): void {
    this.extractParams();
  }

  private extractParams(): void {
    let r: any = this.route;
    while (r) {
      const ruc = r.snapshot?.params?.['ruc'] || r.snapshot?.params?.['businessRuc'];
      if (ruc) { this.businessRuc = ruc; break; }
      r = r.parent;
    }
    if (!this.businessRuc && typeof window !== 'undefined') {
      const m = window.location.pathname.match(/\/usuario\/([^/]+)\//);
      if (m?.[1]) this.businessRuc = m[1];
    }
    const active = this.businessContext.getActiveBusiness();
    if (active) {
      this.businessId = active.id;
      this.businessName = active.name ?? '';
      if (!this.businessRuc) this.businessRuc = active.ruc;
      this.loadRecords();
    } else if (this.businessRuc) {
      this.businessService.getAll().subscribe({
        next: (list: any[]) => {
          const found = list.find((b: any) => b.ruc === this.businessRuc);
          if (found) { this.businessId = found.id; this.businessName = found.name ?? ''; }
          this.loadRecords();
        },
        error: () => { this.loadRecords(); }
      });
    }
  }

  loadRecords(): void {
    if (!this.businessRuc) return;
    this.loading = true;
    this.error = null;
    // Solo trae incidentes de tipo "Salud y Seguridad" desde seguridad-industrial
    this.incidentService.getSafetyByRuc(this.businessRuc).subscribe({
      next: data => {
        this.records = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los incidentes de seguridad.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let list = [...this.records];
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        (r.personName || '').toLowerCase().includes(q) ||
        (r.personCedula || '').includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    this.filteredRecords = list;
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  getClassificationBadge(cls: string | undefined): string {
    if (!cls) return 'badge-default';
    const u = cls.toLowerCase();
    if (u.includes('accidente con tiempo')) return 'badge-danger';
    if (u.includes('accidente sin tiempo')) return 'badge-warning';
    if (u.includes('incidente')) return 'badge-info';
    return 'badge-default';
  }

  selectIncident(inc: BusinessIncidentDto): void {
    this.selectedIncident = this.selectedIncident?.id === inc.id ? null : inc;
  }

  closeDetail(): void {
    this.selectedIncident = null;
  }

  goBack(): void {
    if (this.businessRuc) this.router.navigate(['/usuario', this.businessRuc, 'talento-humano', 'inicio']);
  }
}
