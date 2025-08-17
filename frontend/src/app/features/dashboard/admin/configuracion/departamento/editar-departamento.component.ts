import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../../../services/department.service';

@Component({
  selector: 'app-editar-departamento',
  templateUrl: './editar-departamento.component.html',
  styleUrls: ['./editar-departamento.component.scss']
})
export class EditarDepartamentoComponent implements OnInit {
  departamentoForm: FormGroup;
  departamentoId!: number;
  loading = false;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private departmentService: DepartmentService
  ) {
    this.departamentoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)],
      active: [true]
    });
  }

  ngOnInit(): void {
    console.log('EditarDepartamentoComponent - ngOnInit() - Componente inicializado');
    
    // Obtener el ID del departamento desde la URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.departamentoId = +id;
      console.log('EditarDepartamentoComponent - ID recibido:', this.departamentoId);
      this.cargarDepartamento();
    } else {
      this.error = 'ID de departamento no válido';
      console.error('EditarDepartamentoComponent - ID no válido en los parámetros de ruta');
    }
  }
  
  cargarDepartamento(): void {
    this.loading = true;
    console.log(`EditarDepartamentoComponent - cargarDepartamento() - Cargando departamento ID: ${this.departamentoId}`);
    
    this.departmentService.getDepartmentById(this.departamentoId).subscribe({
      next: (departamento) => {
        console.log('EditarDepartamentoComponent - Datos recibidos:', departamento);
        this.departamentoForm.patchValue(departamento);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar departamento', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para acceder a este departamento. Esta acción requiere privilegios de administrador.';
        } else if (err.status === 404) {
          this.error = 'El departamento solicitado no existe.';
        } else {
          this.error = 'No se pudo cargar la información del departamento. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.departamentoForm.invalid) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('EditarDepartamentoComponent - onSubmit() - Enviando datos:', this.departamentoForm.value);

    this.departmentService.updateDepartment(this.departamentoId, this.departamentoForm.value).subscribe({
      next: (response) => {
        console.log('EditarDepartamentoComponent - Departamento actualizado exitosamente:', response);
        this.successMessage = 'Departamento actualizado exitosamente';
        this.submitting = false;
        this.formSubmitted = false;
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/departamentos']);
        }, 2000);
      },
      error: (err) => {
        console.error('Error al actualizar departamento:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para actualizar departamentos. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudo actualizar el departamento. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  volverALista(): void {
    console.log('EditarDepartamentoComponent - volverALista() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/departamentos']);
  }
} 