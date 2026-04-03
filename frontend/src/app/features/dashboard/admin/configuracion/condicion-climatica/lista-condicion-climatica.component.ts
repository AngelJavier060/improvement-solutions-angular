import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CondicionClimatica } from '../../../../../models/condicion-climatica.model';
import { CondicionClimaticaService } from '../../../../../services/condicion-climatica.service';

@Component({
  selector: 'app-lista-condicion-climatica',
  templateUrl: './lista-condicion-climatica.component.html',
  styleUrls: ['./lista-condicion-climatica.component.scss']
})
export class ListaCondicionClimaticaComponent implements OnInit {
  items: CondicionClimatica[] = [];
  loading = true;
  error = '';

  constructor(private service: CondicionClimaticaService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/condicion-climatica/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/condicion-climatica/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
