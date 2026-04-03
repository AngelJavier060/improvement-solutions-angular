import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HorarioCirculacionService } from '../../../../../services/horario-circulacion.service';

@Component({
  selector: 'app-nueva-horario-circulacion',
  templateUrl: './nueva-horario-circulacion.component.html',
  styleUrls: ['./nueva-horario-circulacion.component.scss']
})
export class NuevaHorarioCirculacionComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: HorarioCirculacionService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/horario-circulacion']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/horario-circulacion']);
  }
}
