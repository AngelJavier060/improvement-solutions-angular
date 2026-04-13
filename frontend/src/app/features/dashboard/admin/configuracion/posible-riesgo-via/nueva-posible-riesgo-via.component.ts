import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PosibleRiesgoViaService } from '../../../../../services/posible-riesgo-via.service';

@Component({
  selector: 'app-nueva-posible-riesgo-via',
  templateUrl: './nueva-posible-riesgo-via.component.html',
  styleUrls: ['./nueva-posible-riesgo-via.component.scss']
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
      next: () => void this.router.navigate(['/dashboard/admin/configuracion/posible-riesgo-via']),
      error: () => {
        this.error = 'Error al crear el registro';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/posible-riesgo-via']);
  }
}
