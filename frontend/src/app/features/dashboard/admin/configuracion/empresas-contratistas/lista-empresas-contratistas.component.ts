import { Component, OnInit } from '@angular/core';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorCompany } from '../../../../../models/contractor-company.model';

@Component({
  selector: 'app-lista-empresas-contratistas',
  templateUrl: './lista-empresas-contratistas.component.html',
  styleUrls: ['./lista-empresas-contratistas.component.scss']
})
export class ListaEmpresasContratistasComponent implements OnInit {
  empresas: ContractorCompany[] = [];
  loading = false;
  error: string | null = null;

  constructor(private contractorCompanyService: ContractorCompanyService) { }

  ngOnInit(): void {
    console.log('ListaEmpresasContratistasComponent - ngOnInit() - Iniciando componente');
    this.cargarEmpresas();
  }

  cargarEmpresas(): void {
    this.loading = true;
    this.error = null;
    console.log('ListaEmpresasContratistasComponent - cargarEmpresas() - Solicitando datos...');
    
    this.contractorCompanyService.getAllCompanies().subscribe({
      next: (data) => {
        console.log('ListaEmpresasContratistasComponent - Datos recibidos:', data);
        this.empresas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar empresas contratistas', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para ver las empresas contratistas. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudieron cargar las empresas contratistas. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }

  eliminarEmpresa(id: number): void {
    if (confirm('¿Está seguro que desea eliminar esta empresa contratista? Esta acción también eliminará todos sus bloques asociados.')) {
      this.contractorCompanyService.deleteCompany(id).subscribe({
        next: () => {
          console.log('Empresa eliminada correctamente');
          this.cargarEmpresas();
        },
        error: (err) => {
          console.error('Error al eliminar empresa contratista', err);
          if (err.error && typeof err.error === 'string') {
            alert(err.error);
          } else {
            alert('No se pudo eliminar la empresa contratista. Por favor intente nuevamente.');
          }
        }
      });
    }
  }

  toggleEstado(empresa: ContractorCompany): void {
    if (!empresa.id) return;
    
    const accion = empresa.active ? 'desactivar' : 'activar';
    if (confirm(`¿Está seguro que desea ${accion} esta empresa contratista?`)) {
      this.contractorCompanyService.toggleCompanyStatus(empresa.id).subscribe({
        next: () => {
          console.log('Estado actualizado correctamente');
          this.cargarEmpresas();
        },
        error: (err) => {
          console.error('Error al cambiar estado', err);
          alert('No se pudo cambiar el estado de la empresa contratista.');
        }
      });
    }
  }
}