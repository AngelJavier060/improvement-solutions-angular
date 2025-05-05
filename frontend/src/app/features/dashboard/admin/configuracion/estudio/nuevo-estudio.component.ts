import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EstudioService } from '../../../../../services/estudio.service';

@Component({
  selector: 'app-nuevo-estudio',
  templateUrl: './nuevo-estudio.component.html',
  styleUrls: ['./nuevo-estudio.component.scss']
})
export class NuevoEstudioComponent {
  estudioForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private estudioService: EstudioService,
    private router: Router
  ) {
    this.estudioForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  onSubmit(): void {
    if (this.estudioForm.invalid) {
      this.estudioForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    this.estudioService.createEstudio(this.estudioForm.value).subscribe({
      next: (estudio) => {
        this.successMessage = `El estudio "${estudio.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
      },
      error: (err) => {
        console.error('Error al crear estudio', err);
        this.error = 'No se pudo crear el estudio. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estudio']);
  }
  
  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estudio']);
  }
  
  crearNuevo(): void {
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
    this.estudioForm.reset();
  }
}