import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PropietarioVehiculo } from '../../../../../models/propietario-vehiculo.model';
import { PropietarioVehiculoService } from '../../../../../services/propietario-vehiculo.service';

@Component({
  selector: 'app-lista-propietario-vehiculo',
  templateUrl: './lista-propietario-vehiculo.component.html',
  styleUrls: ['./lista-propietario-vehiculo.component.scss']
})
export class ListaPropietarioVehiculoComponent implements OnInit {
  items: PropietarioVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: PropietarioVehiculoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/propietario-vehiculo/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/propietario-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
