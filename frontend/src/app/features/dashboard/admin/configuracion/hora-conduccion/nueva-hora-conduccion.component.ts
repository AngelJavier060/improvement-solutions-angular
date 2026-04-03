import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HoraConduccionService } from '../../../../../services/hora-conduccion.service';

@Component({
  selector: 'app-nueva-hora-conduccion',
  templateUrl: './nueva-hora-conduccion.component.html',
  styleUrls: ['./nueva-hora-conduccion.component.scss']
})
export class NuevaHoraConduccionComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: HoraConduccionService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/hora-conduccion']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/hora-conduccion']);
  }
}
