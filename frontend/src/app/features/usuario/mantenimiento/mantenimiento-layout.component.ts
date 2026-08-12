import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../services/business.service';
import { BusinessContextService } from '../../../core/services/business-context.service';

@Component({
  selector: 'app-mantenimiento-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mantenimiento-layout.component.html',
  styleUrls: ['./mantenimiento-layout.component.scss']
})
export class MantenimientoLayoutComponent implements OnInit, OnDestroy {
  businessRuc: string = '';
  businessName: string = '';
  currentUser: any = null;
  private routeSub?: Subscription;

  menuItems = [
    { icon: 'tachometer-alt', label: 'Dashboard', route: 'dashboard' },
    { icon: 'truck', label: 'Flota', route: '' },
    { icon: 'file-alt', label: 'Documentación', route: 'documentacion' },
    { icon: 'wrench', label: 'Mantenimiento', route: 'mantenimiento-programado' },
    { icon: 'chart-bar', label: 'Reportes', route: 'reportes' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private businessService: BusinessService,
    private businessContext: BusinessContextService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // RUC puede venir en esta ruta o en un padre (/usuario/:ruc/mantenimiento)
    this.routeSub = this.route.paramMap.subscribe(() => {
      const ruc = this.resolveRucFromRoute();
      this.businessRuc = ruc;
      this.loadBusinessName(ruc);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private resolveRucFromRoute(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const ruc = r.snapshot.paramMap.get('ruc') || r.snapshot.paramMap.get('businessRuc');
      if (ruc) return ruc;
      r = r.parent;
    }
    return '';
  }

  private loadBusinessName(ruc: string): void {
    if (!ruc) {
      this.businessName = '';
      return;
    }

    // Si el contexto activo coincide con el RUC de la URL, usarlo de inmediato
    const ctx = this.businessContext.getActiveBusiness();
    if (ctx?.ruc === ruc && ctx.name) {
      this.businessName = ctx.name;
    }

    // Fuente de verdad: empresa del RUC de la ruta
    this.businessService.getByRuc(ruc).subscribe({
      next: (b) => {
        this.businessName = (b as any)?.name || (b as any)?.businessName || this.businessName || ruc;
        // Mantener contexto alineado a la empresa de la URL
        if ((b as any)?.id != null) {
          this.businessContext.setActiveBusiness({
            id: Number((b as any).id),
            ruc,
            name: this.businessName
          });
        }
      },
      error: () => {
        if (!this.businessName) {
          this.businessName = ruc;
        }
      }
    });
  }

  navigateTo(route: string): void {
    if (route) {
      this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', route]);
    }
  }

  goBack(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }

  logout(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'welcome']);
  }
}
