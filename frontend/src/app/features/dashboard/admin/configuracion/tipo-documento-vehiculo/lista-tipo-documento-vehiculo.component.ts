import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoDocumentoVehiculo } from '../../../../../models/tipo-documento-vehiculo.model';
import { TipoDocumentoVehiculoService } from '../../../../../services/tipo-documento-vehiculo.service';

@Component({
  selector: 'app-lista-tipo-documento-vehiculo',
  templateUrl: './lista-tipo-documento-vehiculo.component.html',
  styleUrls: ['./lista-tipo-documento-vehiculo.component.scss']
})
export class ListaTipoDocumentoVehiculoComponent implements OnInit {
  items: TipoDocumentoVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: TipoDocumentoVehiculoService, private router: Router) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos';
        this.loading = false;
        console.error(err);
      }
    });
  }

  deleteItem(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      this.service.delete(id).subscribe({
        next: () => this.loadItems(),
        error: (err) => {
          this.error = 'Error al eliminar el registro';
          console.error(err);
        }
      });
    }
  }

  goToNew(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
