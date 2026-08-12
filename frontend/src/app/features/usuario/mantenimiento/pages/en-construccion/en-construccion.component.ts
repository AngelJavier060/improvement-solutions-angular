import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-mantenimiento-en-construccion',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './en-construccion.component.html',
  styleUrls: ['./en-construccion.component.scss']
})
export class MantenimientoEnConstruccionComponent implements OnInit {
  businessRuc = '';
  sectionTitle = 'Sección';
  sectionDescription = 'Esta funcionalidad estará disponible pronto.';

  private readonly sectionMeta: Record<string, { title: string; description: string }> = {
    'mantenimiento-programado': {
      title: 'Mantenimiento',
      description: 'Aquí podrás programar y dar seguimiento a mantenimientos preventivos y correctivos de la flota.'
    },
    reportes: {
      title: 'Reportes',
      description: 'Aquí podrás consultar reportes e indicadores del módulo de mantenimiento.'
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.businessRuc = this.resolveRuc();
    const key = this.route.snapshot.routeConfig?.path || '';
    const meta = this.sectionMeta[key];
    if (meta) {
      this.sectionTitle = meta.title;
      this.sectionDescription = meta.description;
    }
  }

  private resolveRuc(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const ruc = r.snapshot.paramMap.get('ruc') || r.snapshot.paramMap.get('businessRuc');
      if (ruc) return ruc.trim();
      r = r.parent;
    }
    return '';
  }

  goFlota(): void {
    if (!this.businessRuc) return;
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento']);
  }

  goDashboard(): void {
    if (!this.businessRuc) return;
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'dashboard']);
  }
}
