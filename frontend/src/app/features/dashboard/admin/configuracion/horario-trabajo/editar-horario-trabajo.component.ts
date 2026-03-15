import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkShiftService } from '../../../../../services/work-shift.service';

@Component({
  selector: 'app-editar-horario-trabajo',
  templateUrl: './editar-horario-trabajo.component.html'
})
export class EditarHorarioTrabajoComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingData = true;
  error: string | null = null;
  successMessage: string | null = null;
  id!: number;

  constructor(
    private fb: FormBuilder,
    private workShiftService: WorkShiftService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.workShiftService.getById(this.id).subscribe({
      next: (data) => {
        this.form.patchValue({
          name: data.name,
          description: data.description || '',
          active: data.active !== false
        });
        this.loadingData = false;
      },
      error: () => {
        this.error = 'Error al cargar el horario de trabajo.';
        this.loadingData = false;
      }
    });
  }

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
    this.workShiftService.update(this.id, this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Horario de trabajo actualizado exitosamente.';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard/admin/configuracion/horarios-trabajo']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al actualizar el horario de trabajo.';
        this.loading = false;
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
