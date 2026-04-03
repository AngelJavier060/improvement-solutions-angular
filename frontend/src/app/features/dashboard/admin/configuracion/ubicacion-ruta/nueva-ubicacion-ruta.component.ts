import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UbicacionRutaService } from '../../../../../services/ubicacion-ruta.service';

@Component({
  selector: 'app-nueva-ubicacion-ruta',
  templateUrl: './nueva-ubicacion-ruta.component.html',
  styleUrls: ['./nueva-ubicacion-ruta.component.scss']
})
export class NuevaUbicacionRutaComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: UbicacionRutaService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/ubicacion-ruta']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/ubicacion-ruta']);
  }
}
