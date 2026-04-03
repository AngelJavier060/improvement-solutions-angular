import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Transmision } from '../../../../../models/transmision.model';
import { TransmisionService } from '../../../../../services/transmision.service';

@Component({
  selector: 'app-lista-transmision',
  templateUrl: './lista-transmision.component.html',
  styleUrls: ['./lista-transmision.component.scss']
})
export class ListaTransmisionComponent implements OnInit {
  items: Transmision[] = [];
  loading = true;
  error = '';

  constructor(private service: TransmisionService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/transmision/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/transmision/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
