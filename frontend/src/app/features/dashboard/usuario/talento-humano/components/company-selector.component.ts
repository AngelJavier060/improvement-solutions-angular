import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import { BusinessContextService, ActiveBusiness } from '../../../../../core/services/business-context.service';

interface BusinessItem {
  id: number;
  ruc: string;
  name: string;
}

@Component({
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  styleUrls: ['./company-selector.component.scss']
})
export class CompanySelectorComponent implements OnInit {
  businesses: BusinessItem[] = [];
  selectedRuc: string = '';
  loading = false;
  error: string | null = null;

  constructor(
    private businessService: BusinessService,
    private businessContext: BusinessContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCompaniesForCurrentUser();
  }

  private loadCompaniesForCurrentUser(): void {
    const userId = this.businessContext.getCurrentUserIdFromToken();
    if (!userId) {
      this.error = 'No se pudo identificar al usuario actual.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.businessService.getByUserId(userId).subscribe({
      next: (list: any[]) => {
        const mapped = (list || []).map((b: any) => ({
          id: Number(b.id),
          ruc: b.ruc || b.codigoEmpresa || '',
          name: b.trade_name || b.name || b.name_short || 'Empresa'
        })) as BusinessItem[];
        this.businesses = mapped.filter(b => !!b.ruc);

        // Preseleccionar desde contexto si existe
        const active = this.businessContext.getActiveBusiness();
        if (active && this.businesses.some(b => b.ruc === active.ruc)) {
          this.selectedRuc = active.ruc;
        } else if (this.businesses.length === 1) {
          // Si hay solo una, seleccionarla automáticamente
          this.onSelect(this.businesses[0].ruc);
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar empresas del usuario:', err);
        this.error = 'No se pudieron cargar las empresas.';
        this.loading = false;
      }
    });
  }

  onSelect(ruc: string): void {
    this.selectedRuc = ruc;
    const b = this.businesses.find(x => x.ruc === ruc);
    if (b) {
      const active: ActiveBusiness = { id: b.id, ruc: b.ruc, name: b.name };
      this.businessContext.setActiveBusiness(active);
      // Navegar a la ruta consistente con el RUC
      this.router.navigate(['/usuario', b.ruc, 'dashboard', 'talento-humano']);
    }
  }
}
