import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CargoService } from '../../../../../services/cargo.service';

@Component({
  selector: 'app-lista-cargo',
  templateUrl: './lista-cargo.component.html',
  styleUrls: ['./lista-cargo.component.scss']
})
export class ListaCargoComponent implements OnInit {
  cargos: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private cargoService: CargoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('ListaCargoComponent - ngOnInit() - Componente inicializado');
    this.cargarCargos();
  }

  cargarCargos(): void {
    this.loading = true;
    this.error = null;
    console.log('ListaCargoComponent - cargarCargos() - Cargando lista de cargos');

    this.cargoService.getCargos().subscribe({
      next: (data) => {
        console.log('ListaCargoComponent - Cargos cargados exitosamente:', data);
        this.cargos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar cargos:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para ver los cargos. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudieron cargar los cargos. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }

  eliminarCargo(id: number): void {
    console.log(`ListaCargoComponent - eliminarCargo() - Intentando eliminar cargo ID: ${id}`);
    
    if (confirm('¿Está seguro que desea eliminar este cargo?')) {
      this.cargoService.deleteCargo(id).subscribe({
        next: () => {
          console.log('ListaCargoComponent - Cargo eliminado exitosamente');
          this.cargos = this.cargos.filter(cargo => cargo.id !== id);
        },
        error: (err) => {
          console.error('Error al eliminar cargo:', err);
          if (err.status === 403) {
            alert('No tiene permisos para eliminar cargos. Esta acción requiere privilegios de administrador.');
          } else {
            alert('No se pudo eliminar el cargo. Por favor intente nuevamente.');
          }
        }
      });
    }
  }

  editarCargo(id: number): void {
    console.log(`ListaCargoComponent - editarCargo() - Navegando a editar cargo ID: ${id}`);
    this.router.navigate(['/dashboard/admin/configuracion/cargos/editar', id]);
  }

  nuevoCargo(): void {
    console.log('ListaCargoComponent - nuevoCargo() - Navegando a crear nuevo cargo');
    this.router.navigate(['/dashboard/admin/configuracion/cargos/nuevo']);
  }

  volverAConfiguracion(): void {
    console.log('ListaCargoComponent - volverAConfiguracion() - Navegando de vuelta a configuración');
    this.router.navigate(['/dashboard/admin/configuracion']);
  }
} 