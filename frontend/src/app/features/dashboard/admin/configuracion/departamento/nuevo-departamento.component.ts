import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DepartamentoService } from '../../../../../services/departamento.service';

@Component({
  selector: 'app-nuevo-departamento',
  templateUrl: './nuevo-departamento.component.html',
  styleUrls: ['./nuevo-departamento.component.scss']
})
export class NuevoDepartamentoComponent implements OnInit {
  departamentoForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  currentUrl: string;

  constructor(
    private fb: FormBuilder,
    private departamentoService: DepartamentoService,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    console.log('NuevoDepartamentoComponent constructor - Current URL:', this.currentUrl);
    
    this.departamentoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)],
      active: [true]
    });
  }

  ngOnInit(): void {
    console.log('NuevoDepartamentoComponent - ngOnInit() - Componente inicializado');
  }

  onSubmit(): void {
    if (this.departamentoForm.invalid) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('NuevoDepartamentoComponent - onSubmit() - Enviando datos:', this.departamentoForm.value);

    this.departamentoService.createDepartamento(this.departamentoForm.value).subscribe({
      next: (response) => {
        console.log('NuevoDepartamentoComponent - Departamento creado exitosamente:', response);
        this.successMessage = 'Departamento creado exitosamente';
        this.submitting = false;
        this.formSubmitted = false;
        this.departamentoForm.reset({ active: true });
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/departamentos']);
        }, 2000);
      },
      error: (err) => {
        console.error('Error al crear departamento:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para crear departamentos. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudo crear el departamento. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    console.log('NuevoDepartamentoComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/departamentos']);
  }

  crearNuevo(): void {
    console.log('NuevoDepartamentoComponent - crearNuevo() - Reiniciando formulario');
    this.departamentoForm.reset({ active: true });
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }
} 