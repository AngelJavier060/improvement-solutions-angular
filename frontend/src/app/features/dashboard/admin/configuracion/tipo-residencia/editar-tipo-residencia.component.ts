import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoResidenciaService } from '../../../../../services/tipo-residencia.service';
import { TipoResidencia } from '../../../../../models/tipo-residencia.model';

@Component({
  selector: 'app-editar-tipo-residencia',
  templateUrl: './editar-tipo-residencia.component.html',
  styleUrls: ['./editar-tipo-residencia.component.scss']
})
export class EditarTipoResidenciaComponent implements OnInit {
  tipoResidenciaForm: FormGroup;
  id: number;
  submitting = false;
  loading = true;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private tipoResidenciaService: TipoResidenciaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.id = +this.route.snapshot.params['id'];
    this.tipoResidenciaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.cargarTipoResidencia();
  }

  cargarTipoResidencia(): void {
    this.loading = true;
    this.error = null;
    
    this.tipoResidenciaService.getTipoResidencia(this.id).subscribe({
      next: (tipoResidencia: TipoResidencia) => {
        this.tipoResidenciaForm.patchValue({
          name: tipoResidencia.name,
          description: tipoResidencia.description
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar tipo de residencia', err);
        this.error = 'No se pudo cargar el tipo de residencia. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.tipoResidenciaForm.invalid) {
      this.tipoResidenciaForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const tipoResidenciaActualizado: TipoResidencia = {
      ...this.tipoResidenciaForm.value
    };

    this.tipoResidenciaService.updateTipoResidencia(this.id, tipoResidenciaActualizado).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/dashboard/admin/configuracion/tipo-residencia']);
      },
      error: (err: any) => {
        console.error('Error al actualizar tipo de residencia', err);
        this.error = 'No se pudo actualizar el tipo de residencia. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-residencia']);
  }
}
