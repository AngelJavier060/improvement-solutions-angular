import { Component, OnInit } from '@angular/core';
import { EtniaService } from '../../../../../services/etnia.service';
import { Etnia } from '../../../../../models/etnia.model';

@Component({
  selector: 'app-lista-etnias',
  templateUrl: './lista-etnias.component.html',
  styleUrls: ['./lista-etnias.component.scss']
})
export class ListaEtniasComponent implements OnInit {
  etnias: Etnia[] = [];
  loading = false;
  error: string | null = null;

  constructor(private etniaService: EtniaService) { }

  ngOnInit(): void {
    this.cargarEtnias();
  }

  cargarEtnias(): void {
    this.loading = true;
    this.error = null;
    
    this.etniaService.getEtnias().subscribe({
      next: (data) => {
        this.etnias = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar etnias', err);
        this.error = 'No se pudieron cargar las etnias. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  eliminarEtnia(id: number): void {
    if (confirm('¿Está seguro que desea eliminar esta etnia?')) {
      this.etniaService.deleteEtnia(id).subscribe({
        next: () => {
          this.cargarEtnias();
        },
        error: (err) => {
          console.error('Error al eliminar etnia', err);
          alert('No se pudo eliminar la etnia. Por favor intente nuevamente.');
        }
      });
    }
  }
}
