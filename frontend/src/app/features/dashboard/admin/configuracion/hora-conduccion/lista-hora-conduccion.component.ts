import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HoraConduccion } from '../../../../../models/hora-conduccion.model';
import { HoraConduccionService } from '../../../../../services/hora-conduccion.service';

@Component({
  selector: 'app-lista-hora-conduccion',
  templateUrl: './lista-hora-conduccion.component.html',
  styleUrls: ['./lista-hora-conduccion.component.scss']
})
export class ListaHoraConduccionComponent implements OnInit {
  items: HoraConduccion[] = [];
  loading = true;
  error = '';

  constructor(private service: HoraConduccionService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/hora-conduccion/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/hora-conduccion/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
