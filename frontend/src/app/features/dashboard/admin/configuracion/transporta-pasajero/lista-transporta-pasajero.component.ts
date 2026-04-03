import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TransportaPasajero } from '../../../../../models/transporta-pasajero.model';
import { TransportaPasajeroService } from '../../../../../services/transporta-pasajero.service';

@Component({
  selector: 'app-lista-transporta-pasajero',
  templateUrl: './lista-transporta-pasajero.component.html',
  styleUrls: ['./lista-transporta-pasajero.component.scss']
})
export class ListaTransportaPasajeroComponent implements OnInit {
  items: TransportaPasajero[] = [];
  loading = true;
  error = '';

  constructor(private service: TransportaPasajeroService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/transporta-pasajero/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/transporta-pasajero/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
