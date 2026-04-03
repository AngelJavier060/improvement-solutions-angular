import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoDocumentoVehiculoService } from '../../../../../services/tipo-documento-vehiculo.service';

@Component({
  selector: 'app-nueva-tipo-documento-vehiculo',
  templateUrl: './nueva-tipo-documento-vehiculo.component.html',
  styleUrls: ['./nueva-tipo-documento-vehiculo.component.scss']
})
export class NuevaTipoDocumentoVehiculoComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: TipoDocumentoVehiculoService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo']);
  }
}
