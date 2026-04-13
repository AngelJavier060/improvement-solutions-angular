import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HoraDescanso } from '../../../../../models/hora-descanso.model';
import { HoraDescansoService } from '../../../../../services/hora-descanso.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import {
  CatalogoViajeFactorItem,
  CatalogoViajeMetodologiaSection,
  rebuildCatalogoSections
} from '../shared/catalogo-viaje-lista.logic';

@Component({
  selector: 'app-lista-hora-descanso',
  templateUrl: './lista-hora-descanso.component.html'
})
export class ListaHoraDescansoComponent implements OnInit {
  items: HoraDescanso[] = [];
  metodologias: MetodologiaRiesgo[] = [];
  sections: CatalogoViajeMetodologiaSection<HoraDescanso>[] = [];
  loading = true;
  error = '';

  constructor(
    private service: HoraDescansoService,
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
      'hora-descanso',
      'editar',
      id
    ]);
  }

  goToNew(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/hora-descanso/nuevo']);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
