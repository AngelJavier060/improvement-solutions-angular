import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClaseVehiculoService } from '../../../../../services/clase-vehiculo.service';

@Component({
  selector: 'app-nueva-clase-vehiculo',
  templateUrl: './nueva-clase-vehiculo.component.html',
  styleUrls: ['./nueva-clase-vehiculo.component.scss']
})
export class NuevaClaseVehiculoComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: ClaseVehiculoService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/clase-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/clase-vehiculo']);
  }
}
