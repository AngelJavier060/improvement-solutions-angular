import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoUnidad } from '../../../../../models/estado-unidad.model';
import { EstadoUnidadService } from '../../../../../services/estado-unidad.service';

@Component({
  selector: 'app-lista-estado-unidad',
  templateUrl: './lista-estado-unidad.component.html',
  styleUrls: ['./lista-estado-unidad.component.scss']
})
export class ListaEstadoUnidadComponent implements OnInit {
  items: EstadoUnidad[] = [];
  loading = true;
  error = '';

  constructor(private service: EstadoUnidadService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/estado-unidad/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/estado-unidad/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
