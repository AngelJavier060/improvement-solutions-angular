import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ObligationMatrixService } from 'src/app/services/obligation-matrix.service';
import { DepartmentService } from 'src/app/services/department.service';
import { ObligationMatrix } from 'src/app/models/obligation-matrix.model';
import { Department } from 'src/app/models/department.model';

@Component({
  selector: 'app-matriz-legal-form',
  templateUrl: './matriz-legal-form.component.html',
  styleUrls: ['./matriz-legal-form.component.scss']
})
export class MatrizLegalFormComponent implements OnInit {
  form: FormGroup;
  departamentos: Department[] = [];
  loading = false;
  success = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private obligationMatrixService: ObligationMatrixService,
    private departmentService: DepartmentService
  ) {
    this.form = this.fb.group({
      description: ['', Validators.required],
      legal_compliance: ['', Validators.required],
      legal_regulation: ['', Validators.required],
      department_id: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadDepartamentos();
  }

  loadDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data: Department[]) => {
        this.departamentos = data;
      },
      error: (error: any) => {
        console.error('Error al cargar departamentos:', error);
        this.error = 'No se pudieron cargar los departamentos.';
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    
    this.loading = true;
    this.error = null;
    const payload: ObligationMatrix = {
      description: this.form.value.description,
      legalCompliance: this.form.value.legal_compliance,
      legalRegulation: this.form.value.legal_regulation,
      departmentId: Number(this.form.value.department_id) // Asegurarnos que sea un número
    };
    
    this.obligationMatrixService.createObligationMatrix(payload).subscribe({
      next: (response: any) => {
        this.success = true;
        this.form.reset();
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'No se pudo guardar la matriz de obligación. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }
}