import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TypeContractService } from '../../../../../services/type-contract.service';

@Component({
  selector: 'app-nuevo-tipo-contrato',
  templateUrl: './nuevo-tipo-contrato.component.html',
  styleUrls: ['./nuevo-tipo-contrato.component.scss']
})
export class NuevoTipoContratoComponent implements OnInit {
  tipoContratoForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private typeContractService: TypeContractService,
    private router: Router
  ) {
    this.tipoContratoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    console.log('NuevoTipoContratoComponent - ngOnInit() - Componente inicializado');
  }

  onSubmit(): void {
    if (this.tipoContratoForm.invalid) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('NuevoTipoContratoComponent - onSubmit() - Enviando datos:', this.tipoContratoForm.value);

    this.typeContractService.createTypeContract(this.tipoContratoForm.value).subscribe({
      next: (response) => {
        console.log('NuevoTipoContratoComponent - Tipo de contrato creado exitosamente:', response);
        this.successMessage = 'Tipo de contrato creado exitosamente';
        this.submitting = false;
        this.tipoContratoForm.reset();
        this.formSubmitted = false;
        
        // Redireccionar después de un breve retraso
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/tipo-contrato']);
        }, 1500);
      },
      error: (error) => {
        console.error('NuevoTipoContratoComponent - Error al crear tipo de contrato:', error);
        
        if (error.status === 409) {
          this.error = 'Ya existe un tipo de contrato con ese nombre.';
        } else if (error.status === 403) {
          this.error = 'No tiene permisos para crear tipos de contrato.';
        } else {
          this.error = 'Error al crear el tipo de contrato. Por favor, intente nuevamente.';
        }
        
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-contrato']);
  }
}
