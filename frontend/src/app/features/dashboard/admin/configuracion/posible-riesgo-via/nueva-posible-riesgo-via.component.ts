import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PosibleRiesgoViaService } from '../../../../../services/posible-riesgo-via.service';

@Component({
  selector: 'app-nueva-posible-riesgo-via',
  templateUrl: './nueva-posible-riesgo-via.component.html',
  styleUrls: ['../hora-conduccion/nueva-hora-conduccion.component.scss']
})
export class NuevaPosibleRiesgoViaComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: PosibleRiesgoViaService, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.service.create(this.form.value).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via']);
  }
}
