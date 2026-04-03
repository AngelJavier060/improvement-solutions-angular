import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MarcaVehiculo } from '../../../../../models/marca-vehiculo.model';
import { MarcaVehiculoService } from '../../../../../services/marca-vehiculo.service';

@Component({
  selector: 'app-lista-marca-vehiculo',
  templateUrl: './lista-marca-vehiculo.component.html',
  styleUrls: ['./lista-marca-vehiculo.component.scss']
})
export class ListaMarcaVehiculoComponent implements OnInit {
  items: MarcaVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: MarcaVehiculoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/marca-vehiculo/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/marca-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
