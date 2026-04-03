import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MarcaVehiculoService } from '../../../../../services/marca-vehiculo.service';

@Component({
  selector: 'app-nueva-marca-vehiculo',
  templateUrl: './nueva-marca-vehiculo.component.html',
  styleUrls: ['./nueva-marca-vehiculo.component.scss']
})
export class NuevaMarcaVehiculoComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: MarcaVehiculoService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/marca-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/marca-vehiculo']);
  }
}
