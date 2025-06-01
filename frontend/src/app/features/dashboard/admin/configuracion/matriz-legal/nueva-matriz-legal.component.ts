import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ObligationMatrixService } from '../../../../../services/obligation-matrix.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';

@Component({
  selector: 'app-nueva-matriz-legal',
  templateUrl: './nueva-matriz-legal.component.html',
  styleUrls: ['./nueva-matriz-legal.component.scss']
})
export class NuevaMatrizLegalComponent implements OnInit {
  matrizLegalForm: FormGroup;
  departments: Department[] = [];
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private matrizLegalService: ObligationMatrixService,
    private departmentService: DepartmentService,
    private router: Router
  ) {
    this.matrizLegalForm = this.fb.group({
      legalCompliance: ['', [Validators.required]],
      legalRegulation: ['', [Validators.required]],
      description: ['', [Validators.required]],
      departmentId: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.cargarDepartamentos();
  }

  cargarDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        this.error = 'Error al cargar los departamentos. Por favor, intente nuevamente.';
      }
    });
  }

  onSubmit(): void {
    if (this.matrizLegalForm.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    this.matrizLegalService.createObligationMatrix(this.matrizLegalForm.value).subscribe({
      next: () => {
        this.successMessage = 'Matriz legal creada exitosamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/matriz-legal']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error al crear matriz legal:', error);
        this.error = 'Error al crear la matriz legal. Por favor, intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/matriz-legal']);
  }
}
