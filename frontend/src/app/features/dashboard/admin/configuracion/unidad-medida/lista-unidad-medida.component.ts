import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UnidadMedida } from '../../../../../models/unidad-medida.model';
import { UnidadMedidaService } from '../../../../../services/unidad-medida.service';

@Component({
  selector: 'app-lista-unidad-medida',
  templateUrl: './lista-unidad-medida.component.html',
  styleUrls: ['./lista-unidad-medida.component.scss']
})
export class ListaUnidadMedidaComponent implements OnInit {
  items: UnidadMedida[] = [];
  loading = true;
  error = '';

  constructor(private service: UnidadMedidaService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/unidad-medida/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/unidad-medida/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
