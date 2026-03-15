import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkScheduleService } from '../../../../../services/work-schedule.service';

@Component({
  selector: 'app-nueva-jornada-trabajo',
  templateUrl: './nueva-jornada-trabajo.component.html'
})
export class NuevaJornadaTrabajoComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private workScheduleService: WorkScheduleService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      active: [true]
    });
  }

  ngOnInit(): void {}

  goBack(): void {
    this.router.navigate(['/dashboard/admin/configuracion/jornadas-trabajo']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = null;
    this.workScheduleService.create(this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Jornada de trabajo creada exitosamente.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard/admin/configuracion/jornadas-trabajo']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al crear la jornada de trabajo.';
        this.loading = false;
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
