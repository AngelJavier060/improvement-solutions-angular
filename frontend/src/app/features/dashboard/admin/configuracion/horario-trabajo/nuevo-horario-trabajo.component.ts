import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkShiftService } from '../../../../../services/work-shift.service';

@Component({
  selector: 'app-nuevo-horario-trabajo',
  templateUrl: './nuevo-horario-trabajo.component.html'
})
export class NuevoHorarioTrabajoComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private workShiftService: WorkShiftService,
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
    this.router.navigate(['/dashboard/admin/configuracion/horarios-trabajo']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = null;
    this.workShiftService.create(this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Horario de trabajo creado exitosamente.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard/admin/configuracion/horarios-trabajo']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al crear el horario de trabajo.';
        this.loading = false;
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
