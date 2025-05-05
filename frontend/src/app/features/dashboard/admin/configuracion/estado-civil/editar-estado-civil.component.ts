import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstadoCivilService } from '../../../../../services/estado-civil.service';
import { EstadoCivil } from '../../../../../models/estado-civil.model';

@Component({
  selector: 'app-editar-estado-civil',
  templateUrl: './editar-estado-civil.component.html',
  styleUrls: ['./editar-estado-civil.component.scss']
})
export class EditarEstadoCivilComponent implements OnInit {
  estadoCivilForm: FormGroup;
  estadoCivilId: number;
  submitting = false;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private estadoCivilService: EstadoCivilService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.estadoCivilId = +this.route.snapshot.paramMap.get('id')!;
    this.estadoCivilForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.cargarEstadoCivil();
  }

  cargarEstadoCivil(): void {
    this.loading = true;
    this.estadoCivilService.getEstadoCivil(this.estadoCivilId).subscribe({
      next: (estadoCivil: EstadoCivil) => {
        this.estadoCivilForm.patchValue({
          name: estadoCivil.name,
          description: estadoCivil.description || ''
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar estado civil', err);
        this.error = 'No se pudo cargar la información del estado civil. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.estadoCivilForm.invalid) {
      this.estadoCivilForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    this.estadoCivilService.updateEstadoCivil(this.estadoCivilId, this.estadoCivilForm.value).subscribe({
      next: (estadoCivil) => {
        this.successMessage = `El estado civil "${estadoCivil.name}" se ha actualizado correctamente`;
        this.submitting = false;
        setTimeout(() => {
          this.volverALista();
        }, 2000);
      },
      error: (err) => {
        console.error('Error al actualizar estado civil', err);
        this.error = 'No se pudo actualizar el estado civil. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.volverALista();
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estado-civil']);
  }
}