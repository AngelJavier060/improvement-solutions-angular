import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoVehiculo } from '../../../../../models/tipo-vehiculo.model';
import { TipoVehiculoService } from '../../../../../services/tipo-vehiculo.service';

@Component({
  selector: 'app-lista-tipo-vehiculo',
  templateUrl: './lista-tipo-vehiculo.component.html',
  styleUrls: ['./lista-tipo-vehiculo.component.scss']
})
export class ListaTipoVehiculoComponent implements OnInit {
  items: TipoVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: TipoVehiculoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
