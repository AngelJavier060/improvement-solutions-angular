import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TypeContractService } from '../../../../../services/type-contract.service';

@Component({
  selector: 'app-editar-tipo-contrato',
  templateUrl: './editar-tipo-contrato.component.html',
  styleUrls: ['./editar-tipo-contrato.component.scss']
})
export class EditarTipoContratoComponent implements OnInit {
  tipoContratoForm: FormGroup;
  tipoContratoId: number = 0;
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private typeContractService: TypeContractService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.tipoContratoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.tipoContratoId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.tipoContratoId) {
      this.cargarTipoContrato();
    }
  }

  cargarTipoContrato(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.typeContractService.getTypeContract(this.tipoContratoId).subscribe({
      next: (typeContract) => {
        console.log('Tipo de contrato cargado:', typeContract);
        this.tipoContratoForm.patchValue({
          name: typeContract.name,
          description: typeContract.description
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar el tipo de contrato:', error);
        this.errorMessage = 'Error al cargar el tipo de contrato. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.tipoContratoForm.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const typeContractData = this.tipoContratoForm.value;

    this.typeContractService.updateTypeContract(this.tipoContratoId, typeContractData).subscribe({
      next: () => {
        this.successMessage = 'Tipo de contrato actualizado exitosamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/tipo-contrato']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error al actualizar el tipo de contrato:', error);
        if (error.status === 409) {
          this.errorMessage = 'Ya existe un tipo de contrato con ese nombre.';
        } else if (error.status === 403) {
          this.errorMessage = 'No tiene permisos para actualizar tipos de contrato.';
        } else {
          this.errorMessage = 'Error al actualizar el tipo de contrato. Por favor, intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-contrato']);
  }
}
