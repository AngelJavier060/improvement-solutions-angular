import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BusinessContextService } from '../../../../../core/services/business-context.service';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessIncidentService, BusinessIncidentDto } from '../../../../../services/business-incident.service';
import { Subject } from 'rxjs';
import { filter, map, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { extractUsuarioRucFromRoute, resolveThBusinessFromRoute } from '../utils/th-business-from-route';

@Component({
  selector: 'app-accidentes',
  templateUrl: './accidentes.component.html',
  styleUrls: ['./accidentes.component.scss']
})
export class AccidentesComponent implements OnInit, OnDestroy {

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

  private readonly destroy$ = new Subject<void>();

  readonly tabs = ['Todos', 'Seguridad'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessContext: BusinessContextService,
    private businessService: BusinessService,
    private incidentService: BusinessIncidentService
  ) {}

  get displayBusinessName(): string {
    return (this.businessName || '').trim() || 'Empresa';
  }

  ngOnInit(): void {
    this.initFromRoute();
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => extractUsuarioRucFromRoute(this.route)),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.initFromRoute());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initFromRoute(): void {
    resolveThBusinessFromRoute(this.route, this.businessService, this.businessContext).subscribe(b => {
      if (!b) {
        this.businessId = null;
        this.businessRuc = null;
        this.businessName = '';
        return;
      }
      this.businessId = b.id;
      this.businessRuc = b.ruc;
      this.businessName = b.name;
      this.loadRecords();
    });
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
