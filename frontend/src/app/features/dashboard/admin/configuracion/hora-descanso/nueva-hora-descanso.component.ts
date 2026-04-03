import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HoraDescansoService } from '../../../../../services/hora-descanso.service';

@Component({
  selector: 'app-nueva-hora-descanso',
  templateUrl: './nueva-hora-descanso.component.html',
  styleUrls: ['./nueva-hora-descanso.component.scss']
})
export class NuevaHoraDescansoComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: HoraDescansoService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/hora-descanso']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/hora-descanso']);
  }
}
