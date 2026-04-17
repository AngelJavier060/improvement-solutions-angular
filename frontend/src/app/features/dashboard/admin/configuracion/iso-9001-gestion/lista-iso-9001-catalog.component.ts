import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Iso9001CatalogKey, Iso9001CatalogService } from '../../../../../services/iso-9001-catalog.service';
import { TypeContract } from '../../../../../models/type-contract.model';

export interface Iso9001CatalogRouteData {
  catalogKey: Iso9001CatalogKey;
  listaTitulo: string;
  listaSubtitulo: string;
  nombreItemPlural: string;
}

@Component({
  selector: 'app-lista-iso-9001-catalog',
  templateUrl: './lista-iso-9001-catalog.component.html',
  styleUrls: ['./iso-9001-catalog.shared.scss']
})
export class ListaIso9001CatalogComponent implements OnInit {
  items: TypeContract[] = [];
  loading = false;
  error: string | null = null;

  catalogKey!: Iso9001CatalogKey;
  listaTitulo = '';
  listaSubtitulo = '';
  nombreItemPlural = 'registros';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogApi: Iso9001CatalogService
  ) {}

  ngOnInit(): void {
    const data = this.route.parent?.snapshot.data as Iso9001CatalogRouteData | undefined;
    if (!data?.catalogKey) {
      this.error = 'Configuración de ruta incompleta.';
      return;
    }
    this.catalogKey = data.catalogKey;
    this.listaTitulo = data.listaTitulo;
    this.listaSubtitulo = data.listaSubtitulo;
    this.nombreItemPlural = data.nombreItemPlural;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.catalogApi.getAll(this.catalogKey).subscribe({
      next: rows => {
        this.items = rows;
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Error al cargar los datos. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevo(): void {
    this.router.navigate(['/dashboard/admin/configuracion', 'iso-9001', this.catalogKey, 'nuevo']);
  }

  editar(id: number | undefined): void {
    if (id) {
      this.router.navigate(['/dashboard/admin/configuracion', 'iso-9001', this.catalogKey, 'editar', id]);
    }
  }

  eliminar(id: number | undefined): void {
    if (!id) {
      return;
    }
    if (confirm('¿Está seguro que desea eliminar este registro?')) {
      this.catalogApi.delete(this.catalogKey, id).subscribe({
        next: () => this.cargar(),
        error: err => {
          console.error(err);
          alert('Error al eliminar. Por favor, intente nuevamente.');
        }
      });
    }
  }

  volverAConfiguracion(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
