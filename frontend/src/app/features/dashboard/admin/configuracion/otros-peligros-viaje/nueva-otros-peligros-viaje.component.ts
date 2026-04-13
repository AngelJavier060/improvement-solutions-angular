import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { OtrosPeligrosViajeService } from '../../../../../services/otros-peligros-viaje.service';

@Component({
  selector: 'app-nueva-otros-peligros-viaje',
  templateUrl: './nueva-otros-peligros-viaje.component.html',
  styleUrls: ['./nueva-otros-peligros-viaje.component.scss']
})
export class NuevaOtrosPeligrosViajeComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: OtrosPeligrosViajeService, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.service.create(this.form.value).subscribe({
      next: () => void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje']),
      error: () => {
        this.error = 'Error al crear el registro';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje']);
  }
}
