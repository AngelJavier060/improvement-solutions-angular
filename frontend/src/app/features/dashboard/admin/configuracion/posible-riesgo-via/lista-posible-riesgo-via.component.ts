import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PosibleRiesgoVia } from '../../../../../models/posible-riesgo-via.model';
import { PosibleRiesgoViaService } from '../../../../../services/posible-riesgo-via.service';

@Component({
  selector: 'app-lista-posible-riesgo-via',
  templateUrl: './lista-posible-riesgo-via.component.html',
  styleUrls: ['../hora-conduccion/lista-hora-conduccion.component.scss']
})
export class ListaPosibleRiesgoViaComponent implements OnInit {
  items: PosibleRiesgoVia[] = [];
  loading = true;
  error = '';

  constructor(private service: PosibleRiesgoViaService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el catálogo';
        this.loading = false;
        console.error(err);
      }
    });
  }

  deleteItem(id: number): void {
    if (!confirm('¿Eliminar este registro?')) return;
    this.service.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => {
        console.error(err);
        alert('No se pudo eliminar (puede estar asignado a empresas).');
      }
    });
  }

  goToNew(): void {
    this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
