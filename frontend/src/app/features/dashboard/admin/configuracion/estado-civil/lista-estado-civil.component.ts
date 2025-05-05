import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoCivil } from '../../../../../models/estado-civil.model';
import { EstadoCivilService } from '../../../../../services/estado-civil.service';

@Component({
  selector: 'app-lista-estado-civil',
  templateUrl: './lista-estado-civil.component.html',
  styleUrls: ['./lista-estado-civil.component.scss']
})
export class ListaEstadoCivilComponent implements OnInit {
  estadosCiviles: EstadoCivil[] = [];
  loading = true;
  error: string | null = null;
  
  constructor(
    private estadoCivilService: EstadoCivilService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarEstadosCiviles();
  }

  cargarEstadosCiviles(): void {
    this.loading = true;
    this.estadoCivilService.getEstadosCiviles().subscribe({
      next: (data) => {
        this.estadosCiviles = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar estados civiles', err);
        this.error = 'No se pudieron cargar los estados civiles. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevoEstadoCivil(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estado-civil/nuevo']);
  }

  editarEstadoCivil(id: number): void {
    this.router.navigate([`/dashboard/admin/configuracion/estado-civil/editar/${id}`]);
  }

  eliminarEstadoCivil(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este estado civil?')) {
      this.estadoCivilService.deleteEstadoCivil(id).subscribe({
        next: () => {
          this.estadosCiviles = this.estadosCiviles.filter(estadoCivil => estadoCivil.id !== id);
        },
        error: (err) => {
          console.error('Error al eliminar estado civil', err);
          alert('No se pudo eliminar el estado civil. Por favor intente nuevamente.');
        }
      });
    }
  }
}