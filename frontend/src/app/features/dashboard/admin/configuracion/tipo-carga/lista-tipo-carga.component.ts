import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoCarga } from '../../../../../models/tipo-carga.model';
import { TipoCargaService } from '../../../../../services/tipo-carga.service';

@Component({
  selector: 'app-lista-tipo-carga',
  templateUrl: './lista-tipo-carga.component.html',
  styleUrls: ['./lista-tipo-carga.component.scss']
})
export class ListaTipoCargaComponent implements OnInit {
  items: TipoCarga[] = [];
  loading = true;
  error = '';

  constructor(private service: TipoCargaService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/tipo-carga/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-carga/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
