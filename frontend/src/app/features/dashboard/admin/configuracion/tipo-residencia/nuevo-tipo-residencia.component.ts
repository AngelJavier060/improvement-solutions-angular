import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoResidenciaService } from '../../../../../services/tipo-residencia.service';

@Component({
  selector: 'app-nuevo-tipo-residencia',
  templateUrl: './nuevo-tipo-residencia.component.html',
  styleUrls: ['./nuevo-tipo-residencia.component.scss']
})
export class NuevoTipoResidenciaComponent {
  tipoResidenciaForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private tipoResidenciaService: TipoResidenciaService,
    private router: Router
  ) {
    this.tipoResidenciaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  onSubmit(): void {
    if (this.tipoResidenciaForm.invalid) {
      this.tipoResidenciaForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    
    this.tipoResidenciaService.createTipoResidencia(this.tipoResidenciaForm.value).subscribe({
      next: (tipoResidencia) => {
        this.successMessage = `El tipo de residencia "${tipoResidencia.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
      },
      error: (err) => {
        console.error('Error al crear tipo de residencia', err);
        this.error = 'No se pudo crear el tipo de residencia. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-residencia']);
  }
  
  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-residencia']);
  }
  
  crearNuevo(): void {
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
    this.tipoResidenciaForm.reset();
  }
}
