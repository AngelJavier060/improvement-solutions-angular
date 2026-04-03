import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadoCarreteraService } from '../../../../../services/estado-carretera.service';

@Component({
  selector: 'app-nueva-estado-carretera',
  templateUrl: './nueva-estado-carretera.component.html',
  styleUrls: ['./nueva-estado-carretera.component.scss']
})
export class NuevaEstadoCarreteraComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: EstadoCarreteraService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/estado-carretera']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/estado-carretera']);
  }
}
