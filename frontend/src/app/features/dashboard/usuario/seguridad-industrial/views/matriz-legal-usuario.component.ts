import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { BusinessObligationMatrixService } from '../../../../../services/business-obligation-matrix.service';

@Component({
  selector: 'app-matriz-legal-usuario',
  template: `
    <!-- Barra superior con botón de Inicio y mensaje de bienvenida -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <a class="btn btn-outline-success btn-sm" [routerLink]="inicioLink">
        <i class="fas fa-home me-1"></i> Inicio
      </a>
      <div class="text-muted fw-semibold">Bienvenido al Dashboard — Matriz Legal</div>
    </div>

    <!-- Título principal de la página -->
    <h4 class="fw-bold mb-3">Matriz Legal</h4>

    <!-- Contenido: listado real de obligaciones de la empresa -->
    <div class="card shadow-sm border-0">
      <div class="card-header d-flex align-items-center justify-content-between bg-white">
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style="width:36px;height:36px;">
            <i class="fas fa-balance-scale"></i>
          </div>
          <div>
            <h5 class="mb-0 fw-bold text-dark">Listado de requisitos legales</h5>
            <small class="text-muted">Seguridad Industrial</small>
          </div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="p-3" *ngIf="loading">
          <i class="fas fa-spinner fa-spin me-2"></i> Cargando matriz legal...
        </div>
        <div class="p-3 text-danger" *ngIf="error && !loading">
          {{ error }}
        </div>
        <div class="p-3 text-muted" *ngIf="!loading && !error && obligaciones.length === 0">
          No hay requisitos legales registrados para esta empresa.
        </div>

        <div class="table-responsive" *ngIf="!loading && !error && obligaciones.length > 0">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="px-3">#</th>
                <th>Nombre</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of obligaciones; let i = index">
                <td class="px-3">{{ i + 1 }}</td>
                <td>{{ resolveName(item) }}</td>
                <td>{{ resolveDescription(item) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class MatrizLegalUsuarioComponent implements OnInit {
  ruc: string | null = null;
  inicioLink: any[] = ['/'];
  obligaciones: any[] = [];
  loading = false;
  error: string | null = null;
  catalogoMatrices: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private obligationCatalogService: ObligationMatrixService,
    private bomService: BusinessObligationMatrixService
  ) {}

  ngOnInit(): void {
    // Buscar el parámetro :ruc en la jerarquía de rutas
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }

    // Construir el enlace de Inicio local al módulo Seguridad Industrial (redirige a 'matriz-legal')
    if (this.ruc) {
      this.inicioLink = ['/usuario', this.ruc, 'dashboard', 'seguridad-industrial'];
    }

    // Cargar catálogo y obligaciones de la empresa
    this.loadData();
  }

  private loadData(): void {
    if (!this.ruc) return;
    this.loading = true;
    this.error = null;

    // 1) Cargar catálogo global (para resolver nombres si vienen IDs)
    this.obligationCatalogService.getObligationMatrices().subscribe({
      next: (data) => {
        this.catalogoMatrices = Array.isArray(data) ? data : [];
      },
      error: () => {
        this.catalogoMatrices = [];
      }
    });

    // 2) Resolver empresa por RUC y cargar sus obligaciones (relaciones) sin endpoint admin
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) {
          this.error = 'No se encontró la empresa por el RUC proporcionado.';
          this.obligaciones = [];
          this.loading = false;
          return;
        }

        // Cargar relaciones empresa-matriz desde servicio específico (no admin)
        this.bomService.getByBusiness(Number(id)).subscribe({
          next: (relaciones: any[]) => {
            this.obligaciones = Array.isArray(relaciones) ? relaciones : [];
            this.loading = false;
          },
          error: (err) => {
            console.error('Error al cargar relaciones de matriz legal por empresa:', err);
            this.error = 'Error al cargar los requisitos legales de la empresa.';
            this.obligaciones = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al buscar empresa por RUC:', err);
        this.error = 'No se pudo obtener la información de la empresa por RUC.';
        this.obligaciones = [];
        this.loading = false;
      }
    });
  }

  // Helpers de presentación seguros
  resolveName(item: any): string {
    if (!item) return '—';
    // 1) Si viene con nombre directo (o descripción como nombre), usarlo
    const direct = (item.name ?? item.nombre ?? item.title ?? item.description ?? '').toString().trim();
    if (direct.length > 0) return direct;

    // 2) Si es una relación, intentar leer el catálogo anidado
    const matrix = (item.obligationMatrix ?? item.obligation_matrix) as any;
    const nestedName = (matrix?.name ?? matrix?.nombre ?? matrix?.title ?? matrix?.description ?? '').toString().trim();
    if (nestedName.length > 0) return nestedName;

    // 3) Resolver por ID de catálogo (no usar item.id porque suele ser ID de relación)
    const catalogId = Number(item.obligation_matrix_id ?? item.obligationMatrixId ?? matrix?.id);
    if (!isNaN(catalogId)) {
      const found = this.catalogoMatrices.find((x: any) => Number(x?.id) === catalogId);
      if (found) {
        return (
          found.name ?? found.nombre ?? found.title ?? found.description ?? `#${catalogId}`
        ).toString();
      }
      return `#${catalogId}`;
    }
    return '—';
  }

  resolveDescription(item: any): string {
    if (!item) return '';
    // 1) Descripción directa de la relación o del item
    const desc = (item.description ?? item.detalle ?? item.detail ?? '').toString().trim();
    if (desc.length > 0) return desc;
    // 2) Si hay catálogo anidado, tomar su descripción
    const matrix = (item.obligationMatrix ?? item.obligation_matrix) as any;
    const nestedDesc = (matrix?.description ?? matrix?.detalle ?? matrix?.detail ?? '').toString().trim();
    return nestedDesc;
  }
}
