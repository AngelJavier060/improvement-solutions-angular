import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IessService } from '../../../../../services/iess.service';

@Component({
  selector: 'app-editar-iess',
  templateUrl: './editar-iess.component.html',
  styleUrls: ['./editar-iess.component.scss']
})
export class EditarIessComponent implements OnInit {
  iessForm: FormGroup;
  iessId: number = 0;
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private iessService: IessService,
    private route: ActivatedRoute,
    private router: Router
  ) {    this.iessForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.iessId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.iessId) {
      this.cargarIess();
    }
  }

  cargarIess(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.iessService.getIess(this.iessId).subscribe({
      next: (iess) => {
        console.log('IESS cargado:', iess);        this.iessForm.patchValue({
          code: iess.code,
          description: iess.description
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar el IESS:', error);
        this.errorMessage = 'Error al cargar el ítem IESS. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.iessForm.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const iessData = this.iessForm.value;

    this.iessService.updateIess(this.iessId, iessData).subscribe({
      next: () => {
        this.successMessage = 'Ítem IESS actualizado exitosamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/iess']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error al actualizar el IESS:', error);
        if (error.status === 409) {
          this.errorMessage = 'Ya existe un ítem IESS con ese nombre.';
        } else if (error.status === 403) {
          this.errorMessage = 'No tiene permisos para actualizar ítems IESS.';
        } else {
          this.errorMessage = 'Error al actualizar el ítem IESS. Por favor, intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/iess']);
  }
}
