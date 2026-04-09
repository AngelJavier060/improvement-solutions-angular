import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GerenciaViajeService, GerenciaViajeDto } from '../../services/gerencia-viaje.service';

@Component({
  selector: 'app-gerencias-viajes-detalle',
  templateUrl: './gerencias-viajes-detalle.component.html',
  styleUrls: ['./gerencias-viajes-detalle.component.scss']
})
export class GerenciasViajesDetalleComponent implements OnInit {
  businessRuc: string = '';
  gerenciaId?: number;
  gerencia: any = null;
  loading: boolean = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gerenciaService: GerenciaViajeService
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      this.businessRuc = params['ruc'];
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.gerenciaId = +params['id'];
        this.loadGerencia(this.gerenciaId);
      }
    });
  }

  loadGerencia(id: number): void {
    this.loading = true;
    this.error = '';
    this.gerenciaService.getById(id).subscribe({
      next: (data) => {
        this.gerencia = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('[GerenciasViajesDetalle] Error al cargar:', err);
        this.error = 'Error al cargar la gerencia de viaje';
        this.loading = false;
      }
    });
  }

  imprimir(): void {
    window.print();
  }

  volver(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  editar(): void {
    this.router.navigate(['..', this.gerenciaId, 'editar'], { relativeTo: this.route });
  }

  getRiskColor(nivel: string | null | undefined): string {
    switch (nivel) {
      case 'BAJO':
        return '#90EE90';
      case 'MEDIO':
        return '#FFD700';
      case 'ALTO':
        return '#FF4C4C';
      default:
        return '#f2f2f2';
    }
  }

  getScoreColor(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '#e9ecef';
    }
    const s = Number(score);
    if (s <= 100) return '#90EE90';
    if (s <= 200) return '#FFD700';
    if (s <= 300) return '#FFA500';
    return '#FF4C4C';
  }

  scoreFg(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '#333';
    }
    return Number(score) > 200 ? 'white' : 'black';
  }

  fmtScore(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '—';
    }
    return String(score);
  }
}
