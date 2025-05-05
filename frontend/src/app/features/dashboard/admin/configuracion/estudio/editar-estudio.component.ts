import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstudioService } from '../../../../../services/estudio.service';
import { Estudio } from '../../../../../models/estudio.model';

@Component({
  selector: 'app-editar-estudio',
  templateUrl: './editar-estudio.component.html',
  styleUrls: ['./editar-estudio.component.scss']
})
export class EditarEstudioComponent implements OnInit {
  estudioForm: FormGroup;
  estudioId: number;
  submitting = false;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private estudioService: EstudioService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.estudioId = +this.route.snapshot.paramMap.get('id')!;
    this.estudioForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.cargarEstudio();
  }

  cargarEstudio(): void {
    this.loading = true;
    this.estudioService.getEstudio(this.estudioId).subscribe({
      next: (estudio: Estudio) => {
        this.estudioForm.patchValue({
          name: estudio.name,
          description: estudio.description || ''
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar estudio', err);
        this.error = 'No se pudo cargar la información del estudio. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.estudioForm.invalid) {
      this.estudioForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    this.estudioService.updateEstudio(this.estudioId, this.estudioForm.value).subscribe({
      next: (estudio) => {
        this.successMessage = `El estudio "${estudio.name}" se ha actualizado correctamente`;
        this.submitting = false;
        setTimeout(() => {
          this.volverALista();
        }, 2000);
      },
      error: (err) => {
        console.error('Error al actualizar estudio', err);
        this.error = 'No se pudo actualizar el estudio. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.volverALista();
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/estudio']);
  }
}