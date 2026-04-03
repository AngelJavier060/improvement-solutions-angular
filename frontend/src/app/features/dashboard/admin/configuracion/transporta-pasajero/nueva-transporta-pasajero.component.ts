import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TransportaPasajeroService } from '../../../../../services/transporta-pasajero.service';

@Component({
  selector: 'app-nueva-transporta-pasajero',
  templateUrl: './nueva-transporta-pasajero.component.html',
  styleUrls: ['./nueva-transporta-pasajero.component.scss']
})
export class NuevaTransportaPasajeroComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: TransportaPasajeroService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/transporta-pasajero']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/transporta-pasajero']);
  }
}
