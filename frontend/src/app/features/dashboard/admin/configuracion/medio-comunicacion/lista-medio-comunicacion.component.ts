import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MedioComunicacion } from '../../../../../models/medio-comunicacion.model';
import { MedioComunicacionService } from '../../../../../services/medio-comunicacion.service';

@Component({
  selector: 'app-lista-medio-comunicacion',
  templateUrl: './lista-medio-comunicacion.component.html',
  styleUrls: ['./lista-medio-comunicacion.component.scss']
})
export class ListaMedioComunicacionComponent implements OnInit {
  items: MedioComunicacion[] = [];
  loading = true;
  error = '';

  constructor(private service: MedioComunicacionService, private router: Router) {}

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
    this.router.navigate(['dashboard/admin/configuracion/medio-comunicacion/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/medio-comunicacion/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }
}
