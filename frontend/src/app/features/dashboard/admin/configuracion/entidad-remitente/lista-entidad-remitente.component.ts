import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EntidadRemitente } from '../../../../../models/entidad-remitente.model';
import { EntidadRemitenteService } from '../../../../../services/entidad-remitente.service';

@Component({
  selector: 'app-lista-entidad-remitente',
  templateUrl: './lista-entidad-remitente.component.html',
  styleUrls: ['./lista-entidad-remitente.component.scss']
})
export class ListaEntidadRemitenteComponent implements OnInit {
  items: EntidadRemitente[] = [];
  loading = true;
  error = '';

  constructor(private service: EntidadRemitenteService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/entidad-remitente/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/entidad-remitente/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
