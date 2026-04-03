import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UnidadMedidaService } from '../../../../../services/unidad-medida.service';

@Component({
  selector: 'app-nueva-unidad-medida',
  templateUrl: './nueva-unidad-medida.component.html',
  styleUrls: ['./nueva-unidad-medida.component.scss']
})
export class NuevaUnidadMedidaComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: UnidadMedidaService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/unidad-medida']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/unidad-medida']);
  }
}
