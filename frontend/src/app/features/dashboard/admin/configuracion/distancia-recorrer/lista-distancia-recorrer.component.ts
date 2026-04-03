import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DistanciaRecorrer } from '../../../../../models/distancia-recorrer.model';
import { DistanciaRecorrerService } from '../../../../../services/distancia-recorrer.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lista-distancia-recorrer',
  templateUrl: './lista-distancia-recorrer.component.html',
  styleUrls: ['./lista-distancia-recorrer.component.scss']
})
export class ListaDistanciaRecorrerComponent implements OnInit {
  items: DistanciaRecorrer[] = [];
  metodologias: MetodologiaRiesgo[] = [];
  loading = true;
  error = '';

  constructor(
    private service: DistanciaRecorrerService,
    private metodologiaService: MetodologiaRiesgoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      items: this.service.getAll(),
      metodologias: this.metodologiaService.getAll()
    }).subscribe({
      next: ({ items, metodologias }) => {
        this.items = items;
        this.metodologias = metodologias;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar los datos';
        this.loading = false;
      }
    });
  }

  deleteItem(id: number): void {
    if (confirm('¿Está seguro de eliminar esta distancia?')) {
      this.service.delete(id).subscribe({
        next: () => this.loadData(),
        error: () => {
          this.error = 'Error al eliminar el registro';
        }
      });
    }
  }

  goToNew(): void {
    this.router.navigate(['dashboard/admin/configuracion/distancia-recorrer/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/distancia-recorrer/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }

  getMetodologia(item: DistanciaRecorrer): MetodologiaRiesgo | null {
    return this.metodologias.find(met => met.id === item.metodologiaRiesgo?.id) || null;
  }

  getParametro(item: DistanciaRecorrer, code: string): ParametroMetodologia | null {
    return this.getMetodologia(item)?.parametros?.find(param => param.code === code) || null;
  }

  getNe(item: DistanciaRecorrer): number | null {
    return item.neNivel?.valor ?? null;
  }

  getNd(item: DistanciaRecorrer): number | null {
    return item.ndNivel?.valor ?? null;
  }

  getNc(item: DistanciaRecorrer): number | null {
    return item.ncNivel?.valor ?? null;
  }

  getNp(item: DistanciaRecorrer): number | null {
    const ne = this.getNe(item);
    const nd = this.getNd(item);
    if (ne === null || nd === null) {
      return null;
    }
    return ne * nd;
  }

  getNr(item: DistanciaRecorrer): number | null {
    const np = this.getNp(item);
    const nc = this.getNc(item);
    if (np === null || nc === null) {
      return null;
    }
    return np * nc;
  }

  getRiskClass(value: number | null): string {
    if (value === null) {
      return 'neutral';
    }
    if (value > 500) {
      return 'critical';
    }
    if (value >= 150) {
      return 'high';
    }
    if (value >= 40) {
      return 'medium';
    }
    return 'low';
  }

  getRiskLabel(value: number | null): string {
    if (value === null) {
      return 'Pendiente';
    }
    if (value > 500) {
      return 'Crítico';
    }
    if (value >= 150) {
      return 'Alto';
    }
    if (value >= 40) {
      return 'Medio';
    }
    return 'Bajo';
  }

  getPeakRisk(): number {
    return this.items.reduce((max, item) => Math.max(max, this.getNr(item) || 0), 0);
  }

  getSystemStatus(): string {
    const peak = this.getPeakRisk();
    if (!this.items.length) {
      return 'Sin registros';
    }
    if (peak > 500) {
      return 'Revisar configuración';
    }
    return 'Configuración óptima';
  }
}
