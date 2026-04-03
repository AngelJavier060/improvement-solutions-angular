import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PaisOrigenService } from '../../../../../services/pais-origen.service';

@Component({
  selector: 'app-nueva-pais-origen',
  templateUrl: './nueva-pais-origen.component.html',
  styleUrls: ['./nueva-pais-origen.component.scss']
})
export class NuevaPaisOrigenComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: PaisOrigenService, private router: Router) {
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
        this.router.navigate(['dashboard/admin/configuracion/pais-origen']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/pais-origen']);
  }
}
