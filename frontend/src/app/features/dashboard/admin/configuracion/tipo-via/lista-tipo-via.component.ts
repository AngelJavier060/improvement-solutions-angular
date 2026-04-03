import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoVia } from '../../../../../models/tipo-via.model';
import { TipoViaService } from '../../../../../services/tipo-via.service';

@Component({
  selector: 'app-lista-tipo-via',
  templateUrl: './lista-tipo-via.component.html',
  styleUrls: ['./lista-tipo-via.component.scss']
})
export class ListaTipoViaComponent implements OnInit {
  items: TipoVia[] = [];
  loading = true;
  error = '';

  constructor(private service: TipoViaService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/tipo-via/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-via/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
