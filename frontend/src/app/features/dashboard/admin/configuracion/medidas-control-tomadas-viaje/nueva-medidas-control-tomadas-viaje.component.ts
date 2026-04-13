import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MedidaControlTomadaViajeService } from '../../../../../services/medida-control-tomada-viaje.service';

@Component({
  selector: 'app-nueva-medidas-control-tomadas-viaje',
  templateUrl: './nueva-medidas-control-tomadas-viaje.component.html',
  styleUrls: ['./nueva-medidas-control-tomadas-viaje.component.scss']
})
export class NuevaMedidasControlTomadasViajeComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private service: MedidaControlTomadaViajeService, private router: Router) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.service.create(this.form.value).subscribe({
      next: () => void this.router.navigate(['/dashboard/admin/configuracion/medidas-control-tomadas-viaje']),
      error: () => {
        this.error = 'Error al crear el registro';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/medidas-control-tomadas-viaje']);
  }
}
