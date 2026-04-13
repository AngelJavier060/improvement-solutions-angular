import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GerenciaViajeService, GerenciaViajeDto } from '../../services/gerencia-viaje.service';
import { DistanciaRecorrerService } from '../../../../../../services/distancia-recorrer.service';
import { DistanciaRecorrer } from '../../../../../../models/distancia-recorrer.model';

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
  distancias: DistanciaRecorrer[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gerenciaService: GerenciaViajeService,
    private distanciaService: DistanciaRecorrerService
  ) {}

  ngOnInit(): void {
    // Cargar catálogo global de Distancia a Recorrer para mapear NR automáticamente
    this.distanciaService.getAll().subscribe({
      next: (items) => {
        this.distancias = items || [];
        this.applyAutoScoresFromConfig();
      },
      error: () => {}
    });

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
        this.applyAutoScoresFromConfig();
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

  private normalize(s: string | null | undefined): string {
    if (!s) return '';
    try {
      return s
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
    } catch {
      return String(s || '').trim().toLowerCase();
    }
  }

  private computeNrForDistancia(name: string | null | undefined): number | null {
    const key = this.normalize(name);
    if (!key) return null;
    const item = this.distancias.find(d => this.normalize(d.name) === key);
    if (!item) return null;
    const ne = (item.neNivel as any)?.valor ?? null;
    const nd = (item.ndNivel as any)?.valor ?? null;
    const nc = (item.ncNivel as any)?.valor ?? null;
    if (ne == null || nd == null || nc == null) return null;
    const nr = Number(ne) * Number(nd) * Number(nc);
    return Math.round(nr);
  }

  private applyAutoScoresFromConfig(): void {
    if (!this.gerencia) return;
    const nr = this.computeNrForDistancia(this.gerencia?.distancia);
    if (nr != null) {
      this.gerencia.scoreA = nr;
      // Recalcular totales y nivel de riesgo para consistencia visual
      let total = 0;
      let count = 0;
      const letters = ['A','B','C','D','E','F','G','H','I','J'];
      for (const L of letters) {
        const v = this.gerencia[`score${L}`];
        if (v != null && !Number.isNaN(Number(v))) {
          total += Number(v);
          count++;
        }
      }
      if (count > 0) {
        this.gerencia.scoreTotal = total;
        if (total < 3500) {
          this.gerencia.nivelRiesgo = 'BAJO';
          this.gerencia.nivelRiesgoRomano = 'I';
          this.gerencia.aceptacionGerencia = 'Aceptable';
        } else if (total < 7500) {
          this.gerencia.nivelRiesgo = 'MEDIO';
          this.gerencia.nivelRiesgoRomano = 'II';
          this.gerencia.aceptacionGerencia = 'Aceptable con Controles';
        } else {
          this.gerencia.nivelRiesgo = 'ALTO';
          this.gerencia.nivelRiesgoRomano = 'III';
          this.gerencia.aceptacionGerencia = 'No aceptable';
        }
      }
    }
  }
}
