import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PosibleRiesgoVia } from '../../../../../models/posible-riesgo-via.model';
import { PosibleRiesgoViaService } from '../../../../../services/posible-riesgo-via.service';

@Component({
  selector: 'app-lista-posible-riesgo-via',
  templateUrl: './lista-posible-riesgo-via.component.html',
  styleUrls: ['./lista-posible-riesgo-via.component.scss']
})
export class ListaPosibleRiesgoViaComponent implements OnInit {
  items: PosibleRiesgoVia[] = [];
  loading = true;
  error = '';

  constructor(private service: PosibleRiesgoViaService, private router: Router) {}

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
      error: () => {
        this.error = 'Error al cargar los datos';
        this.loading = false;
      }
    });
  }

  deleteItem(id: number): void {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      this.service.delete(id).subscribe({
        next: () => this.loadItems(),
        error: () => {
          this.error = 'Error al eliminar el registro';
        }
      });
    }
  }

  goToNew(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/posible-riesgo-via/nuevo']);
  }

  goToEdit(id: number): void {
    void this.router.navigate(['/dashboard/admin/configuracion/posible-riesgo-via/editar', id]);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
