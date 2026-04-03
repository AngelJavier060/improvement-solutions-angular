import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HoraDescanso } from '../../../../../models/hora-descanso.model';
import { HoraDescansoService } from '../../../../../services/hora-descanso.service';

@Component({
  selector: 'app-lista-hora-descanso',
  templateUrl: './lista-hora-descanso.component.html',
  styleUrls: ['./lista-hora-descanso.component.scss']
})
export class ListaHoraDescansoComponent implements OnInit {
  items: HoraDescanso[] = [];
  loading = true;
  error = '';

  constructor(private service: HoraDescansoService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/hora-descanso/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/hora-descanso/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
