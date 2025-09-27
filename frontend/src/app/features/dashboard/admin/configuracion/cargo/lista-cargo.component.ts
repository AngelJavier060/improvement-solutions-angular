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
        // Mostrar activos e inactivos para permitir desactivar y luego eliminar
        this.cargos = data || [];
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
    console.log(`ListaCargoComponent - eliminarCargo() - Intentando ELIMINAR cargo ID: ${id}`);
    const current = this.cargos.find(c => Number(c.id) === Number(id));
    if (!current) {
      alert('No se encontró el cargo en la lista.');
      return;
    }

    if (!confirm('¿Está seguro que desea eliminar este cargo definitivamente?')) {
      return;
    }

    this.cargoService.detachAndDeleteCargo(id).subscribe({
      next: () => {
        console.log('ListaCargoComponent - Cargo eliminado definitivamente');
        this.cargos = this.cargos.filter(cargo => Number(cargo.id) !== Number(id));
      },
      error: (err) => {
        console.error('Error al eliminar cargo:', err);
        if (err.status === 403) {
          alert('No tiene permisos para eliminar cargos. Esta acción requiere privilegios de administrador.');
          return;
        }
        // 409: en uso (contratos u otros)
        if (err.status === 409) {
          const backendMsg = (err?.error?.message) || 'El cargo está en uso por otros registros (empleados, contratos o empresas).';
          const desactivar = confirm(`${backendMsg}\n\n¿Desea marcar este cargo como INACTIVO y mantenerlo visible para eliminarlo más tarde?`);
          if (desactivar) {
            const payload = { ...current, active: false };
            this.cargoService.updateCargo(id, payload).subscribe({
              next: () => {
                // Mantener en la lista, solo actualizar estado visible
                this.cargos = this.cargos.map(c => Number(c.id) === Number(id) ? { ...c, active: false } : c);
                alert('Cargo marcado como INACTIVO. Puede gestionar las referencias y volver a intentar eliminar.');
              },
              error: (e2) => {
                console.error('Error al desactivar cargo:', e2);
                alert('No se pudo desactivar el cargo.');
              }
            });
          }
        } else {
          alert('No se pudo eliminar el cargo. Por favor intente nuevamente.');
        }
      }
    });
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