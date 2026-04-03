import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MedioComunicacionService } from '../../../../../services/medio-comunicacion.service';

@Component({
  selector: 'app-nueva-medio-comunicacion',
  templateUrl: './nueva-medio-comunicacion.component.html',
  styleUrls: ['./nueva-medio-comunicacion.component.scss']
})
export class NuevaMedioComunicacionComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: MedioComunicacionService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/medio-comunicacion']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/medio-comunicacion']);
  }
}
