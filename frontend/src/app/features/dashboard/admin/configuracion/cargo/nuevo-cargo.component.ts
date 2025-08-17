import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CargoService } from '../../../../../services/cargo.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { Position } from '../../../../../models/position.model';

@Component({
  selector: 'app-nuevo-cargo',
  templateUrl: './nuevo-cargo.component.html',
  styleUrls: ['./nuevo-cargo.component.scss']
})
export class NuevoCargoComponent implements OnInit {
  cargoForm: FormGroup;
  submitting = false;  error: string | null = null;  successMessage: string | null = null;
  formSubmitted = false;
  currentUrl: string;
  departamentos: Department[] = [];  constructor(
    private fb: FormBuilder,
    private cargoService: CargoService,
    private departmentService: DepartmentService,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    console.log('NuevoCargoComponent constructor - Current URL:', this.currentUrl);
      this.cargoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)],
      departmentId: ['', Validators.required],
      active: [true]
    });
  }  ngOnInit(): void {
    console.log('NuevoCargoComponent - ngOnInit() - Componente inicializado');
    this.cargarDepartamentos();
  }
  
  cargarDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => {
        console.log('Departamentos cargados:', data);
        this.departamentos = data;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        this.error = 'Error al cargar los departamentos. Por favor, inténtelo de nuevo.';
      }
    });
  }

  onSubmit(): void {
    if (this.cargoForm.invalid) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('NuevoCargoComponent - onSubmit() - Enviando datos:', this.cargoForm.value);

    this.cargoService.createCargo(this.cargoForm.value).subscribe({
      next: (response) => {
        console.log('NuevoCargoComponent - Cargo creado exitosamente:', response);
        this.successMessage = 'Cargo creado exitosamente';
        this.submitting = false;        this.formSubmitted = false;
        this.cargoForm.reset({ active: true });
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/cargos']);
        }, 2000);
      },
      error: (err) => {
        console.error('Error al crear cargo:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para crear cargos. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudo crear el cargo. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    console.log('NuevoCargoComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/cargos']);
  }
  crearNuevo(): void {
    console.log('NuevoCargoComponent - crearNuevo() - Reiniciando formulario');
    this.cargoForm.reset({ active: true });
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }
} 