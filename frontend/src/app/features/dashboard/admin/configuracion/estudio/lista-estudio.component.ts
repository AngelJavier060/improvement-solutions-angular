import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Estudio } from '../../../../../models/estudio.model';
import { EstudioService } from '../../../../../services/estudio.service';

@Component({
  selector: 'app-lista-estudio',
  templateUrl: './lista-estudio.component.html',
  styleUrls: ['./lista-estudio.component.scss']
})
export class ListaEstudioComponent implements OnInit {
  estudios: Estudio[] = [];
  loading = true;
  error: string | null = null;
  
  constructor(
    private estudioService: EstudioService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarEstudios();
  }

  cargarEstudios(): void {
    this.loading = true;
    this.estudioService.getEstudios().subscribe({
      next: (data) => {
        this.estudios = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar estudios', err);
        this.error = 'No se pudieron cargar los estudios. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevoEstudio(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estudio/nuevo']);
  }

  editarEstudio(id: number): void {
    this.router.navigate([`/dashboard/admin/configuracion/estudio/editar/${id}`]);
  }

  eliminarEstudio(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este estudio?')) {
      this.estudioService.deleteEstudio(id).subscribe({
        next: () => {
          this.estudios = this.estudios.filter(estudio => estudio.id !== id);
        },
        error: (err) => {
          console.error('Error al eliminar estudio', err);
          alert('No se pudo eliminar el estudio. Por favor intente nuevamente.');
        }
      });
    }
  }
}