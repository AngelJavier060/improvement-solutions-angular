import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NumeroEje } from '../../../../../models/numero-eje.model';
import { NumeroEjeService } from '../../../../../services/numero-eje.service';

@Component({
  selector: 'app-lista-numero-eje',
  templateUrl: './lista-numero-eje.component.html',
  styleUrls: ['../marca-vehiculo/lista-marca-vehiculo.component.scss']
})
export class ListaNumeroEjeComponent implements OnInit {
  items: NumeroEje[] = [];
  loading = true;
  error = '';

  constructor(private service: NumeroEjeService, private router: Router) {}

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
        error: () => { this.error = 'Error al eliminar el registro'; }
      });
    }
  }

  goToNew(): void {
    this.router.navigate(['dashboard/admin/configuracion/numero-eje/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/numero-eje/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
