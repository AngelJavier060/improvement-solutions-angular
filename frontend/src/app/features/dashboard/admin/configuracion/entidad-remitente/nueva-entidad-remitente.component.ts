import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EntidadRemitenteService } from '../../../../../services/entidad-remitente.service';

@Component({
  selector: 'app-nueva-entidad-remitente',
  templateUrl: './nueva-entidad-remitente.component.html',
  styleUrls: ['./nueva-entidad-remitente.component.scss']
})
export class NuevaEntidadRemitenteComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: EntidadRemitenteService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/entidad-remitente']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/entidad-remitente']);
  }
}
