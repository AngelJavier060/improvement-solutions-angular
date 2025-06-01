import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { ObligationMatrix } from '../../../../../models/obligation-matrix.model';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-lista-matriz-legal',
  templateUrl: './lista-matriz-legal.component.html',
  styleUrls: ['./lista-matriz-legal.component.scss']
})
export class ListaMatrizLegalComponent implements OnInit {
  matrices: ObligationMatrix[] = [];
  departments: { [key: number]: string } = {};
  loading = false;
  error: string | null = null;

  constructor(
    private obligationMatrixService: ObligationMatrixService,
    private departmentService: DepartmentService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargarMatrices();
  }

  cargarDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments: Department[]) => {
        departments.forEach(dep => {
          this.departments[dep.id] = dep.name;
        });
      },
      error: (error: Error) => {
        console.error('Error al cargar departamentos:', error);
      }
    });
  }

  cargarMatrices(): void {
    this.loading = true;
    this.error = null;

    this.obligationMatrixService.getObligationMatrices().subscribe({
      next: (matrices: ObligationMatrix[]) => {
        this.matrices = matrices;
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Error al cargar matrices:', error);
        this.error = 'Error al cargar las matrices legales. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevaMatriz(): void {
    this.router.navigate(['/dashboard/admin/configuracion/matriz-legal/nuevo']);
  }

  editarMatriz(id: number): void {
    this.router.navigate(['/dashboard/admin/configuracion/matriz-legal/editar', id]);
  }

  eliminarMatriz(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: '¿Está seguro de que desea eliminar esta matriz legal?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        this.error = null;
        
        this.obligationMatrixService.deleteObligationMatrix(id).subscribe({
          next: () => {
            this.matrices = this.matrices.filter(m => m.id !== id);
            this.loading = false;
          },
          error: (error: Error) => {
            console.error('Error al eliminar matriz:', error);
            this.error = 'Error al eliminar la matriz legal. Por favor, intente nuevamente.';
            this.loading = false;
          }
        });
      }
    });
  }

  volverAConfiguracion(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }

  getDepartmentName(id: number): string {
    return this.departments[id] || 'N/A';
  }
}
