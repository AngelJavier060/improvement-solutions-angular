import { Component, OnInit } from '@angular/core';
import { DepartamentoService } from '../../../../../services/departamento.service';
import { Department } from '../../../../../models/department.model';

@Component({
  selector: 'app-lista-departamento',
  templateUrl: './lista-departamento.component.html',
  styleUrls: ['./lista-departamento.component.scss']
})
export class ListaDepartamentoComponent implements OnInit {
  departamentos: Department[] = [];
  loading = false;
  error: string | null = null;

  constructor(private departamentoService: DepartamentoService) { }

  ngOnInit(): void {
    console.log('ListaDepartamentoComponent - ngOnInit() - Iniciando componente');
    this.cargarDepartamentos();
  }

  cargarDepartamentos(): void {
    this.loading = true;
    this.error = null;
    console.log('ListaDepartamentoComponent - cargarDepartamentos() - Solicitando datos...');
    
    this.departamentoService.getDepartamentos().subscribe({
      next: (data) => {
        console.log('ListaDepartamentoComponent - Datos recibidos:', data);
        this.departamentos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar departamentos', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para ver los departamentos. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudieron cargar los departamentos. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }

  eliminarDepartamento(id: number): void {
    if (confirm('¿Está seguro que desea eliminar este departamento?')) {
      this.departamentoService.deleteDepartamento(id).subscribe({
        next: () => {
          this.cargarDepartamentos();
        },
        error: (err) => {
          console.error('Error al eliminar departamento', err);
          alert('No se pudo eliminar el departamento. Por favor intente nuevamente.');
        }
      });
    }
  }
} 