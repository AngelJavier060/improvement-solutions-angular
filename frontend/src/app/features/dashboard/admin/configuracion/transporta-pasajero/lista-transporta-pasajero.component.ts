import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TransportaPasajero } from '../../../../../models/transporta-pasajero.model';
import { TransportaPasajeroService } from '../../../../../services/transporta-pasajero.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import {
  CatalogoViajeFactorItem,
  CatalogoViajeMetodologiaSection,
  rebuildCatalogoSections
} from '../shared/catalogo-viaje-lista.logic';

@Component({
  selector: 'app-lista-transporta-pasajero',
  templateUrl: './lista-transporta-pasajero.component.html'
})
export class ListaTransportaPasajeroComponent implements OnInit {
  items: TransportaPasajero[] = [];
  metodologias: MetodologiaRiesgo[] = [];
  sections: CatalogoViajeMetodologiaSection<TransportaPasajero>[] = [];
  loading = true;
  error = '';

  constructor(
    private service: TransportaPasajeroService,
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
        this.sections = rebuildCatalogoSections(items, metodologias);
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar los datos';
        this.loading = false;
      }
    });
  }

  confirmDelete(item: CatalogoViajeFactorItem): void {
    const id = item.id != null ? Number(item.id) : NaN;
    if (!Number.isFinite(id)) {
      return;
    }
    if (confirm(`¿Está seguro de eliminar "${item.name}"?`)) {
      this.service.delete(id).subscribe({
        next: () => this.loadData(),
        error: () => {
          this.error = 'Error al eliminar el registro';
        }
      });
    }
  }

  openEdit(item: CatalogoViajeFactorItem): void {
    const id = item?.id != null ? Number(item.id) : NaN;
    if (!Number.isFinite(id)) {
      return;
    }
    void this.router.navigate([
      '/dashboard',
      'admin',
      'configuracion',
      'transporta-pasajero',
      'editar',
      id
    ]);
  }

  goToNew(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/transporta-pasajero/nuevo']);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
