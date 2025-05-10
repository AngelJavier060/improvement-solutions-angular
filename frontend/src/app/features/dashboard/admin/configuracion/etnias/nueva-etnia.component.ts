import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EtniaService } from '../../../../../services/etnia.service';

@Component({
  selector: 'app-nueva-etnia',
  templateUrl: './nueva-etnia.component.html',
  styleUrls: ['./nueva-etnia.component.scss']
})
export class NuevaEtniaComponent {
  etniaForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private etniaService: EtniaService,
    private router: Router
  ) {
    this.etniaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  onSubmit(): void {
    if (this.etniaForm.invalid) {
      this.etniaForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    
    this.etniaService.createEtnia(this.etniaForm.value).subscribe({
      next: (etnia) => {
        this.successMessage = `La etnia "${etnia.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
      },
      error: (err) => {
        console.error('Error al crear etnia', err);
        this.error = 'No se pudo crear la etnia. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/etnias']);
  }
  
  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/etnias']);
  }
  
  crearNuevo(): void {
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
    this.etniaForm.reset();
  }
}
