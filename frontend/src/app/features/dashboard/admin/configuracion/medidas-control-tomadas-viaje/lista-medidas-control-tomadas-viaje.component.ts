import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MedidaControlTomadaViaje } from '../../../../../models/medida-control-tomada-viaje.model';
import { MedidaControlTomadaViajeService } from '../../../../../services/medida-control-tomada-viaje.service';

@Component({
  selector: 'app-lista-medidas-control-tomadas-viaje',
  templateUrl: './lista-medidas-control-tomadas-viaje.component.html',
  styleUrls: ['./lista-medidas-control-tomadas-viaje.component.scss']
})
export class ListaMedidasControlTomadasViajeComponent implements OnInit {
  items: MedidaControlTomadaViaje[] = [];
  loading = true;
  error = '';

  constructor(private service: MedidaControlTomadaViajeService, private router: Router) {}

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
    void this.router.navigate(['/dashboard/admin/configuracion/medidas-control-tomadas-viaje/nuevo']);
  }

  goToEdit(id: number): void {
    void this.router.navigate(['/dashboard/admin/configuracion/medidas-control-tomadas-viaje/editar', id]);
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
