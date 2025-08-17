import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CargoService } from '../../../../../services/cargo.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { Position } from '../../../../../models/position.model';

@Component({
  selector: 'app-editar-cargo',
  templateUrl: './editar-cargo.component.html',
  styleUrls: ['./editar-cargo.component.scss']
})
export class EditarCargoComponent implements OnInit {
  cargoForm: FormGroup;
  cargoId: number = 0;  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  departamentos: Department[] = [];  constructor(
    private fb: FormBuilder,
    private cargoService: CargoService,
    private departmentService: DepartmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {    this.cargoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      departmentId: ['', Validators.required],
      active: [true]
    });
  }
  ngOnInit(): void {
    this.cargarDepartamentos();
    this.cargoId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.cargoId) {
      this.cargarCargo();
    }
  }
  
  cargarDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data: Department[]) => {
        console.log('Departamentos cargados:', data);
        this.departamentos = data;
      },
      error: (error: any) => {
        console.error('Error al cargar departamentos:', error);
        this.errorMessage = 'Error al cargar los departamentos. Por favor, inténtelo de nuevo.';
      }
    });
  }
  cargarCargo(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cargoService.getCargo(this.cargoId).subscribe({
      next: (cargo: Position) => {
        console.log('Cargo cargado:', cargo);        this.cargoForm.patchValue({
          name: cargo.name,
          description: cargo.description,
          departmentId: cargo.department?.id || '',
          active: cargo.active
        });
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar el cargo:', error);
        this.errorMessage = 'Error al cargar el cargo. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.cargoForm.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const cargoData = this.cargoForm.value;

    this.cargoService.updateCargo(this.cargoId, cargoData).subscribe({
      next: () => {
        this.successMessage = 'Cargo actualizado exitosamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/cargos']);
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error al actualizar el cargo:', error);
        this.errorMessage = 'Error al actualizar el cargo. Por favor, intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/cargos']);
  }
} 