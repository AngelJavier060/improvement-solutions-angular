import { Component, OnInit } from '@angular/core';
import { TipoResidenciaService } from '../../../../../services/tipo-residencia.service';
import { TipoResidencia } from '../../../../../models/tipo-residencia.model';

@Component({
  selector: 'app-lista-tipo-residencia',
  templateUrl: './lista-tipo-residencia.component.html',
  styleUrls: ['./lista-tipo-residencia.component.scss']
})
export class ListaTipoResidenciaComponent implements OnInit {
  tiposResidencia: TipoResidencia[] = [];
  loading = false;
  error: string | null = null;

  constructor(private tipoResidenciaService: TipoResidenciaService) { }

  ngOnInit(): void {
    this.cargarTiposResidencia();
  }

  cargarTiposResidencia(): void {
    this.loading = true;
    this.error = null;
    
    this.tipoResidenciaService.getTiposResidencia().subscribe({
      next: (data) => {
        this.tiposResidencia = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar tipos de residencia', err);
        this.error = 'No se pudieron cargar los tipos de residencia. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  eliminarTipoResidencia(id: number): void {
    if (confirm('¿Está seguro que desea eliminar este tipo de residencia?')) {
      this.tipoResidenciaService.deleteTipoResidencia(id).subscribe({
        next: () => {
          this.cargarTiposResidencia();
        },
        error: (err) => {
          console.error('Error al eliminar tipo de residencia', err);
          alert('No se pudo eliminar el tipo de residencia. Por favor intente nuevamente.');
        }
      });
    }
  }
}
