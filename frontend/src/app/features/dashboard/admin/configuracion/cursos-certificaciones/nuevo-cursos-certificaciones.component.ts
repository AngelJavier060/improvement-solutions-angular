import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CourseCertificationService } from '../../../../../services/course-certification.service';

@Component({
  selector: 'app-nuevo-cursos-certificaciones',
  templateUrl: './nuevo-cursos-certificaciones.component.html',
  styleUrls: ['./nuevo-cursos-certificaciones.component.scss']
})
export class NuevoCursosCertificacionesComponent {
  form: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private service: CourseCertificationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.error = null;
    this.service.create(this.form.value).subscribe({
      next: (resp) => {
        this.successMessage = `Registro "${resp.name}" creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
        setTimeout(() => this.volverALista(), 1200);
      },
      error: (err) => {
        this.error = err?.status === 409 ? 'Ya existe un registro con ese nombre' : 'No se pudo crear el registro';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/cursos-certificaciones']);
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/cursos-certificaciones']);
  }

  crearNuevo(): void {
    this.form.reset();
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }
}
