import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaisOrigen } from '../../../../../models/pais-origen.model';
import { PaisOrigenService } from '../../../../../services/pais-origen.service';

@Component({
  selector: 'app-lista-pais-origen',
  templateUrl: './lista-pais-origen.component.html',
  styleUrls: ['./lista-pais-origen.component.scss']
})
export class ListaPaisOrigenComponent implements OnInit {
  items: PaisOrigen[] = [];
  loading = true;
  error = '';

  constructor(private service: PaisOrigenService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/pais-origen/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/pais-origen/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
