import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColorVehiculo } from '../../../../../models/color-vehiculo.model';
import { ColorVehiculoService } from '../../../../../services/color-vehiculo.service';

@Component({
  selector: 'app-lista-color-vehiculo',
  templateUrl: './lista-color-vehiculo.component.html',
  styleUrls: ['./lista-color-vehiculo.component.scss']
})
export class ListaColorVehiculoComponent implements OnInit {
  items: ColorVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: ColorVehiculoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/color-vehiculo/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/color-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
