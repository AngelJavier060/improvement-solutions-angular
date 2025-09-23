import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CardService } from '../../../../../services/card.service';

@Component({
  selector: 'app-nuevo-tarjetas',
  templateUrl: './nuevo-tarjetas.component.html',
  styleUrls: ['./nuevo-tarjetas.component.scss']
})
export class NuevoTarjetasComponent {
  form: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private service: CardService,
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
        this.successMessage = `Tarjeta "${resp.name}" creada correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
        setTimeout(() => this.volverALista(), 1200);
      },
      error: (err) => {
        this.error = err?.status === 409 ? 'Ya existe una tarjeta con ese nombre' : 'No se pudo crear la tarjeta';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tarjetas']);
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tarjetas']);
  }

  crearNuevo(): void {
    this.form.reset();
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }
}
