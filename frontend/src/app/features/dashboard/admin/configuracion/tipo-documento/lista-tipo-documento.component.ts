import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';
import { TipoDocumento } from '../../../../../models/tipo-documento.model';

@Component({
  selector: 'app-lista-tipo-documento',
  templateUrl: './lista-tipo-documento.component.html',
  styleUrls: ['./lista-tipo-documento.component.scss']
})
export class ListaTipoDocumentoComponent implements OnInit {
  tiposDocumento: TipoDocumento[] = [];
  loading = false;
  error: string | null = null;
  currentUrl: string;

  constructor(private tipoDocumentoService: TipoDocumentoService, private router: Router) {
    this.currentUrl = this.router.url;
    console.log('ListaTipoDocumentoComponent constructor - Current URL:', this.currentUrl);
  }

  ngOnInit(): void {
    console.log('ListaTipoDocumentoComponent - ngOnInit() - Iniciando componente');
    this.cargarTiposDocumento();
  }

  cargarTiposDocumento(): void {
    this.loading = true;
    this.error = null;
    console.log('ListaTipoDocumentoComponent - cargarTiposDocumento() - Solicitando datos...');
    
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => {
        console.log('ListaTipoDocumentoComponent - Datos recibidos:', data);
        this.tiposDocumento = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar tipos de documento', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para ver los tipos de documento. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudieron cargar los tipos de documento. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }
  eliminarTipoDocumento(id: number): void {
    if (confirm('¿Está seguro que desea eliminar este tipo de documento?')) {
      this.tipoDocumentoService.deleteTipoDocumento(id).subscribe({
        next: () => {
          this.cargarTiposDocumento();
        },
        error: (err) => {
          console.error('Error al eliminar tipo de documento', err);
          if (err.status === 403) {
            alert('No tiene permisos para eliminar tipos de documento. Esta acción requiere privilegios de administrador.');
          } else {
            alert('No se pudo eliminar el tipo de documento. Por favor intente nuevamente.');
          }
        }
      });
    }
  }
}
