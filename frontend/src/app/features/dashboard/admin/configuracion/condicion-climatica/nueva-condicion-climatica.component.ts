import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CondicionClimaticaService } from '../../../../../services/condicion-climatica.service';

@Component({
  selector: 'app-nueva-condicion-climatica',
  templateUrl: './nueva-condicion-climatica.component.html',
  styleUrls: ['./nueva-condicion-climatica.component.scss']
})
export class NuevaCondicionClimaticaComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: CondicionClimaticaService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/condicion-climatica']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/condicion-climatica']);
  }
}
