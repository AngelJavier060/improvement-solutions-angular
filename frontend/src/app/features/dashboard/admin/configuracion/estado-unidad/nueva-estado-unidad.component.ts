import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoUnidadService } from '../../../../../services/estado-unidad.service';

@Component({
  selector: 'app-nueva-estado-unidad',
  templateUrl: './nueva-estado-unidad.component.html',
  styleUrls: ['./nueva-estado-unidad.component.scss']
})
export class NuevaEstadoUnidadComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: EstadoUnidadService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/estado-unidad']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/estado-unidad']);
  }
}
