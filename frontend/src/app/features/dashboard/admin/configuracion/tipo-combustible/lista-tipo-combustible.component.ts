import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoCombustible } from '../../../../../models/tipo-combustible.model';
import { TipoCombustibleService } from '../../../../../services/tipo-combustible.service';

@Component({
  selector: 'app-lista-tipo-combustible',
  templateUrl: './lista-tipo-combustible.component.html',
  styleUrls: ['./lista-tipo-combustible.component.scss']
})
export class ListaTipoCombustibleComponent implements OnInit {
  items: TipoCombustible[] = [];
  loading = true;
  error = '';

  constructor(private service: TipoCombustibleService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/tipo-combustible/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-combustible/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
