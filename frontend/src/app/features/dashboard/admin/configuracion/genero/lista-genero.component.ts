import { Component, OnInit } from '@angular/core';
import { GeneroService } from '../../../../../services/genero.service';
import { Genero } from '../../../../../models/genero.model';

@Component({
  selector: 'app-lista-genero',
  templateUrl: './lista-genero.component.html',
  styleUrls: ['./lista-genero.component.scss']
})
export class ListaGeneroComponent implements OnInit {
  generos: Genero[] = [];
  loading = false;
  error: string | null = null;

  constructor(private generoService: GeneroService) { }

  ngOnInit(): void {
    this.cargarGeneros();
  }

  cargarGeneros(): void {
    this.loading = true;
    this.error = null;
    
    this.generoService.getGeneros().subscribe({
      next: (data) => {
        this.generos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar géneros', err);
        this.error = 'No se pudieron cargar los géneros. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  eliminarGenero(id: number): void {
    if (confirm('¿Está seguro que desea eliminar este género?')) {
      this.generoService.deleteGenero(id).subscribe({
        next: () => {
          this.cargarGeneros();
        },
        error: (err) => {
          console.error('Error al eliminar género', err);
          alert('No se pudo eliminar el género. Por favor intente nuevamente.');
        }
      });
    }
  }
}