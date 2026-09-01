import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EppCatalogItem, EppCatalogKey, EppCatalogService } from '../../../../../services/epp-catalog.service';

export interface EppCatalogRouteData {
  catalogKey: EppCatalogKey;
  listaTitulo: string;
  listaSubtitulo: string;
  nombreItemPlural: string;
}

@Component({
  selector: 'app-lista-epp-catalog',
  templateUrl: './lista-epp-catalog.component.html',
  styleUrls: ['./epp-catalog.shared.scss']
})
export class ListaEppCatalogComponent implements OnInit {
  items: EppCatalogItem[] = [];
  loading = false;
  error: string | null = null;

  catalogKey!: EppCatalogKey;
  listaTitulo = '';
  listaSubtitulo = '';
  nombreItemPlural = 'registros';
  /** Familia/Sección muestran código; Tipo de Entrada no. */
  showCode = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogApi: EppCatalogService
  ) {}

  ngOnInit(): void {
    const data = this.route.parent?.snapshot.data as EppCatalogRouteData | undefined;
    if (!data?.catalogKey) {
      this.error = 'Configuración de ruta incompleta.';
      return;
    }
    this.catalogKey = data.catalogKey;
    this.listaTitulo = data.listaTitulo;
    this.listaSubtitulo = data.listaSubtitulo;
    this.nombreItemPlural = data.nombreItemPlural;
    this.showCode = !this.catalogApi.isNameOnly(this.catalogKey);
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
      error: () => {
        this.error = 'Error al cargar los datos. Intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevo(): void {
    void this.router.navigate(['/dashboard/admin/configuracion', 'equipo-proteccion-personal', this.catalogKey, 'nuevo']);
  }

  editar(id: number | undefined): void {
    if (id) {
      void this.router.navigate(['/dashboard/admin/configuracion', 'equipo-proteccion-personal', this.catalogKey, 'editar', id]);
    }
  }

  eliminar(id: number | undefined): void {
    if (!id) return;
    if (!confirm('¿Está seguro que desea eliminar este registro?')) return;
    this.catalogApi.delete(this.catalogKey, id).subscribe({
      next: () => this.cargar(),
      error: () => {
        this.error = 'No se pudo eliminar el registro.';
      }
    });
  }

  volverAConfiguracion(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
