import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoCivilService } from '../../../../../services/estado-civil.service';

@Component({
  selector: 'app-nuevo-estado-civil',
  templateUrl: './nuevo-estado-civil.component.html',
  styleUrls: ['./nuevo-estado-civil.component.scss']
})
export class NuevoEstadoCivilComponent {
  estadoCivilForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private estadoCivilService: EstadoCivilService,
    private router: Router
  ) {
    this.estadoCivilForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  onSubmit(): void {
    if (this.estadoCivilForm.invalid) {
      this.estadoCivilForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    this.estadoCivilService.createEstadoCivil(this.estadoCivilForm.value).subscribe({
      next: (estadoCivil) => {
        this.successMessage = `El estado civil "${estadoCivil.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
      },
      error: (err) => {
        console.error('Error al crear estado civil', err);
        this.error = 'No se pudo crear el estado civil. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estado-civil']);
  }
  
  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estado-civil']);
  }
  
  crearNuevo(): void {
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
    this.estadoCivilForm.reset();
  }
}