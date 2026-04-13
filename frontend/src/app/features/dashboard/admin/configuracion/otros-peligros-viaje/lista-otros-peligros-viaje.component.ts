import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OtrosPeligrosViaje } from '../../../../../models/otros-peligros-viaje.model';
import { OtrosPeligrosViajeService } from '../../../../../services/otros-peligros-viaje.service';

@Component({
  selector: 'app-lista-otros-peligros-viaje',
  templateUrl: './lista-otros-peligros-viaje.component.html',
  styleUrls: ['./lista-otros-peligros-viaje.component.scss']
})
export class ListaOtrosPeligrosViajeComponent implements OnInit {
  items: OtrosPeligrosViaje[] = [];
  loading = true;
  error = '';

  constructor(private service: OtrosPeligrosViajeService, private router: Router) {}

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
    void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje/nuevo']);
  }

  goToEdit(id: number): void {
    void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje/editar', id]);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
