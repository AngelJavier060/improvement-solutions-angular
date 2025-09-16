import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';

@Component({
  selector: 'app-nueva-empresa-contratista',
  templateUrl: './nueva-empresa-contratista.component.html',
  styleUrls: ['./nueva-empresa-contratista.component.scss']
})
export class NuevaEmpresaContratistaComponent implements OnInit {
  empresaForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  currentUrl: string;

  constructor(
    private fb: FormBuilder,
    private contractorCompanyService: ContractorCompanyService,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    console.log('NuevaEmpresaContratistaComponent constructor - Current URL:', this.currentUrl);
    
    this.empresaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      code: ['', [Validators.maxLength(100)]],
      description: ['', Validators.maxLength(1000)],
      active: [true]
    });
  }

  ngOnInit(): void {
    console.log('NuevaEmpresaContratistaComponent - ngOnInit() - Componente inicializado');
  }

  onSubmit(): void {
    if (this.empresaForm.invalid) {
      this.formSubmitted = true;
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    console.log('NuevaEmpresaContratistaComponent - onSubmit() - Enviando datos:', this.empresaForm.value);

    this.contractorCompanyService.createCompany(this.empresaForm.value).subscribe({
      next: (response: any) => {
        console.log('NuevaEmpresaContratistaComponent - Empresa creada exitosamente:', response);
        this.successMessage = 'Empresa contratista creada exitosamente';
        this.submitting = false;
        this.formSubmitted = false;
        this.empresaForm.reset({ active: true });
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('Error al crear empresa contratista:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para crear empresas contratistas. Esta acción requiere privilegios de administrador.';
        } else if (err.status === 400 && err.error) {
          this.error = err.error;
        } else {
          this.error = 'No se pudo crear la empresa contratista. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    console.log('NuevaEmpresaContratistaComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
  }

  crearNueva(): void {
    console.log('NuevaEmpresaContratistaComponent - crearNueva() - Reiniciando formulario');
    this.empresaForm.reset({ active: true });
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }

  volverALista(): void {
    console.log('NuevaEmpresaContratistaComponent - volverALista() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.empresaForm.controls).forEach(key => {
      const control = this.empresaForm.get(key);
      control?.markAsTouched();
    });
  }

  // Métodos helper para validaciones en template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.empresaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.formSubmitted));
  }

  getFieldError(fieldName: string): string {
    const field = this.empresaForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['maxlength']) return `El campo ${fieldName} excede la longitud máxima`;
    }
    return '';
  }
}