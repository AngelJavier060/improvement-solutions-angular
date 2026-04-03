import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoCombustibleService } from '../../../../../services/tipo-combustible.service';

@Component({
  selector: 'app-nueva-tipo-combustible',
  templateUrl: './nueva-tipo-combustible.component.html',
  styleUrls: ['./nueva-tipo-combustible.component.scss']
})
export class NuevaTipoCombustibleComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: TipoCombustibleService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/tipo-combustible']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-combustible']);
  }
}
