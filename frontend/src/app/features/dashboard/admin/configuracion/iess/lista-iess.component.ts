import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IessService } from '../../../../../services/iess.service';
import { Iess } from '../../../../../models/iess.model';

@Component({
  selector: 'app-lista-iess',
  templateUrl: './lista-iess.component.html',
  styleUrls: ['./lista-iess.component.scss']
})
export class ListaIessComponent implements OnInit {
  iessItems: Iess[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private iessService: IessService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('ListaIessComponent - ngOnInit() - Componente inicializado');
    this.cargarIess();
  }

  cargarIess(): void {
    this.loading = true;
    this.error = null;
    console.log('ListaIessComponent - cargarIess() - Cargando lista de IESS');

    this.iessService.getIessItems().subscribe({
      next: (data) => {
        console.log('ListaIessComponent - IESS cargados exitosamente:', data);
        this.iessItems = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar IESS:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para ver los ítems IESS. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudieron cargar los ítems IESS. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }

  eliminarIess(id: number): void {
    console.log(`ListaIessComponent - eliminarIess() - Intentando eliminar IESS ID: ${id}`);
    
    if (confirm('¿Está seguro que desea eliminar este ítem IESS?')) {
      this.iessService.deleteIess(id).subscribe({
        next: () => {
          console.log('ListaIessComponent - IESS eliminado exitosamente');
          this.iessItems = this.iessItems.filter(item => item.id !== id);
        },
        error: (err) => {
          console.error('Error al eliminar IESS:', err);
          if (err.status === 403) {
            alert('No tiene permisos para eliminar ítems IESS. Esta acción requiere privilegios de administrador.');
          } else {
            alert('No se pudo eliminar el ítem IESS. Por favor intente nuevamente.');
          }
        }
      });
    }
  }

  editarIess(id: number): void {
    console.log(`ListaIessComponent - editarIess() - Navegando a editar IESS ID: ${id}`);
    this.router.navigate(['/dashboard/admin/configuracion/iess/editar', id]);
  }

  nuevoIess(): void {
    console.log('ListaIessComponent - nuevoIess() - Navegando a crear nuevo IESS');
    this.router.navigate(['/dashboard/admin/configuracion/iess/nuevo']);
  }

  volverAConfiguracion(): void {
    console.log('ListaIessComponent - volverAConfiguracion() - Navegando de vuelta a configuración');
    this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
