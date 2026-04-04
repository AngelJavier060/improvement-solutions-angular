import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NumeroEjeService } from '../../../../../services/numero-eje.service';

@Component({
  selector: 'app-nueva-numero-eje',
  templateUrl: './nueva-numero-eje.component.html',
  styleUrls: ['../marca-vehiculo/nueva-marca-vehiculo.component.scss']
})
export class NuevaNumeroEjeComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: NumeroEjeService, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.service.create(this.form.value).subscribe({
      next: () => this.router.navigate(['dashboard/admin/configuracion/numero-eje']),
      error: () => { this.error = 'Error al crear el registro'; this.loading = false; }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/numero-eje']);
  }
}
