import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClaseVehiculo } from '../../../../../models/clase-vehiculo.model';
import { ClaseVehiculoService } from '../../../../../services/clase-vehiculo.service';

@Component({
  selector: 'app-lista-clase-vehiculo',
  templateUrl: './lista-clase-vehiculo.component.html',
  styleUrls: ['./lista-clase-vehiculo.component.scss']
})
export class ListaClaseVehiculoComponent implements OnInit {
  items: ClaseVehiculo[] = [];
  loading = true;
  error = '';

  constructor(private service: ClaseVehiculoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/clase-vehiculo/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/clase-vehiculo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
