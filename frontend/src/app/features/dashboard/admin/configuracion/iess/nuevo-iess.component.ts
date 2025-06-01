import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IessService } from '../../../../../services/iess.service';

@Component({
  selector: 'app-nuevo-iess',
  templateUrl: './nuevo-iess.component.html',
  styleUrls: ['./nuevo-iess.component.scss']
})
export class NuevoIessComponent implements OnInit {
  iessForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  currentUrl: string;

  constructor(
    private fb: FormBuilder,
    private iessService: IessService,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    console.log('NuevoIessComponent constructor - Current URL:', this.currentUrl);
      this.iessForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    console.log('NuevoIessComponent - ngOnInit() - Componente inicializado');
  }

  onSubmit(): void {
    if (this.iessForm.invalid) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('NuevoIessComponent - onSubmit() - Enviando datos:', this.iessForm.value);

    this.iessService.createIess(this.iessForm.value).subscribe({
      next: (response) => {
        console.log('NuevoIessComponent - IESS creado exitosamente:', response);
        this.successMessage = 'Ítem IESS creado exitosamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/iess']);
        }, 1500);
      },
      error: (err) => {
        console.error('Error al crear IESS:', err);
        if (err.status === 409) {
          this.error = 'Ya existe un ítem IESS con ese nombre.';
        } else if (err.status === 403) {
          this.error = 'No tiene permisos para crear ítems IESS.';
        } else {
          this.error = 'Error al crear el ítem IESS. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/iess']);
  }
}
