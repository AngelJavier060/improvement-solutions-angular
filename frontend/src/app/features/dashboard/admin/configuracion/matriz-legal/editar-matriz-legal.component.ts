import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { ObligationMatrix } from '../../../../../models/obligation-matrix.model';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';

@Component({
  selector: 'app-editar-matriz-legal',
  templateUrl: './editar-matriz-legal.component.html',
  styleUrls: ['./editar-matriz-legal.component.scss']
})
export class EditarMatrizLegalComponent implements OnInit {
  matrizLegalForm: FormGroup;
  id: number;
  submitting = false;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  departments: Department[] = [];

  constructor(
    private fb: FormBuilder,
    private obligationMatrixService: ObligationMatrixService,
    private departmentService: DepartmentService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.id = +this.route.snapshot.params['id'];
    this.matrizLegalForm = this.fb.group({
      legalCompliance: ['', [Validators.required, Validators.maxLength(255)]],
      legalRegulation: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      departmentId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargarMatrizLegal();
  }

  cargarDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments: Department[]) => {
        this.departments = departments;
      },
      error: (error: Error) => {
        console.error('Error al cargar departamentos', error);
        this.error = 'No se pudieron cargar los departamentos. Por favor intente nuevamente.';
      }
    });
  }

  cargarMatrizLegal(): void {
    this.loading = true;
    this.error = null;
    
    this.obligationMatrixService.getObligationMatrix(this.id).subscribe({
      next: (matrizLegal: ObligationMatrix) => {
        this.matrizLegalForm.patchValue({
          legalCompliance: matrizLegal.legalCompliance,
          legalRegulation: matrizLegal.legalRegulation,
          description: matrizLegal.description,
          departmentId: matrizLegal.departmentId
        });
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Error al cargar matriz legal', error);
        this.error = 'No se pudo cargar la información de la matriz legal. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.matrizLegalForm.invalid) {
      this.matrizLegalForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    this.obligationMatrixService.updateObligationMatrix(this.id, this.matrizLegalForm.value).subscribe({
      next: () => {
        this.successMessage = 'La matriz legal se ha actualizado correctamente';
        this.submitting = false;
        setTimeout(() => {
          this.volverALista();
        }, 2000);
      },
      error: (err) => {
        console.error('Error al actualizar matriz legal', err);
        this.error = 'No se pudo actualizar la matriz legal. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.volverALista();
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/matriz-legal']);
  }
}
