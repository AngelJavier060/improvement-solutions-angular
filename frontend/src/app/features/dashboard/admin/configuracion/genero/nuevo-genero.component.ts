import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GeneroService } from '../../../../../services/genero.service';

@Component({
  selector: 'app-nuevo-genero',
  templateUrl: './nuevo-genero.component.html',
  styleUrls: ['./nuevo-genero.component.scss']
})
export class NuevoGeneroComponent {
  generoForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false; // Nueva propiedad para controlar la visibilidad del formulario

  constructor(
    private fb: FormBuilder,
    private generoService: GeneroService,
    private router: Router
  ) {
    this.generoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  onSubmit(): void {
    if (this.generoForm.invalid) {
      this.generoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    
    this.generoService.createGenero(this.generoForm.value).subscribe({
      next: (genero) => {
        this.successMessage = `El género "${genero.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true; // Marcar como enviado para ocultar el formulario
      },
      error: (err) => {
        console.error('Error al crear género', err);
        this.error = 'No se pudo crear el género. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    // Dirigir directamente a la lista de géneros en lugar de la navegación relativa
    this.router.navigate(['/dashboard/admin/configuracion/genero']);
  }
  
  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/genero']);
  }
  
  crearNuevo(): void {
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
    this.generoForm.reset();
  }
}