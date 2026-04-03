import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoCarretera } from '../../../../../models/estado-carretera.model';
import { EstadoCarreteraService } from '../../../../../services/estado-carretera.service';

@Component({
  selector: 'app-lista-estado-carretera',
  templateUrl: './lista-estado-carretera.component.html',
  styleUrls: ['./lista-estado-carretera.component.scss']
})
export class ListaEstadoCarreteraComponent implements OnInit {
  items: EstadoCarretera[] = [];
  loading = true;
  error = '';

  constructor(private service: EstadoCarreteraService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/estado-carretera/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/estado-carretera/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
