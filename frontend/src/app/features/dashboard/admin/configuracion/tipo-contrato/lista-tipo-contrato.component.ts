import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TypeContractService } from '../../../../../services/type-contract.service';
import { TypeContract } from '../../../../../models/type-contract.model';

@Component({
  selector: 'app-lista-tipo-contrato',
  templateUrl: './lista-tipo-contrato.component.html',
  styleUrls: ['./lista-tipo-contrato.component.scss']
})
export class ListaTipoContratoComponent implements OnInit {
  typeContracts: TypeContract[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private typeContractService: TypeContractService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarTiposContrato();
  }

  cargarTiposContrato(): void {
    this.loading = true;
    this.error = null;

    this.typeContractService.getAllTypeContracts().subscribe({
      next: (data) => {
        this.typeContracts = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar tipos de contrato:', error);
        this.error = 'Error al cargar los tipos de contrato. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevoTipoContrato(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-contrato/nuevo']);
  }

  editarTipoContrato(id: number | undefined): void {
    if (id) {
      this.router.navigate([`/dashboard/admin/configuracion/tipo-contrato/editar/${id}`]);
    }
  }

  eliminarTipoContrato(id: number | undefined): void {
    if (!id) return;
    
    if (confirm('¿Está seguro que desea eliminar este tipo de contrato?')) {
      this.typeContractService.deleteTypeContract(id).subscribe({
        next: () => {
          this.cargarTiposContrato();
        },
        error: (error) => {
          console.error('Error al eliminar el tipo de contrato:', error);
          alert('Error al eliminar el tipo de contrato. Por favor, intente nuevamente.');
        }
      });
    }
  }

  volverAConfiguracion(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
