import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UbicacionRuta } from '../../../../../models/ubicacion-ruta.model';
import { UbicacionRutaService } from '../../../../../services/ubicacion-ruta.service';

@Component({
  selector: 'app-lista-ubicacion-ruta',
  templateUrl: './lista-ubicacion-ruta.component.html',
  styleUrls: ['./lista-ubicacion-ruta.component.scss']
})
export class ListaUbicacionRutaComponent implements OnInit {
  items: UbicacionRuta[] = [];
  loading = true;
  error = '';

  constructor(private service: UbicacionRutaService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/ubicacion-ruta/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/ubicacion-ruta/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
