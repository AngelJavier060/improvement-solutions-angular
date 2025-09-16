import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorCompany } from '../../../../../models/contractor-company.model';

@Component({
  selector: 'app-editar-empresa-contratista',
  templateUrl: './editar-empresa-contratista.component.html',
  styleUrls: ['./editar-empresa-contratista.component.scss']
})
export class EditarEmpresaContratistaComponent implements OnInit {
  empresaForm: FormGroup;
  submitting = false;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  empresaId: number;
  empresa: ContractorCompany | null = null;

  constructor(
    private fb: FormBuilder,
    private contractorCompanyService: ContractorCompanyService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
    console.log('EditarEmpresaContratistaComponent constructor - ID:', this.empresaId);
    
    this.empresaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      code: ['', [Validators.maxLength(100)]],
      description: ['', Validators.maxLength(1000)],
      active: [true]
    });
  }

  ngOnInit(): void {
    console.log('EditarEmpresaContratistaComponent - ngOnInit() - Componente inicializado');
    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.loading = true;
    this.error = null;

    this.contractorCompanyService.getCompanyById(this.empresaId).subscribe({
      next: (empresa) => {
        console.log('EditarEmpresaContratistaComponent - Empresa cargada:', empresa);
        this.empresa = empresa;
        this.empresaForm.patchValue({
          name: empresa.name,
          code: empresa.code || '',
          description: empresa.description || '',
          active: empresa.active
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        if (err.status === 404) {
          this.error = 'La empresa contratista no fue encontrada.';
        } else if (err.status === 403) {
          this.error = 'No tiene permisos para ver esta empresa contratista.';
        } else {
          this.error = 'Error al cargar los datos de la empresa contratista.';
        }
        this.loading = false;
      }
    });
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

    console.log('EditarEmpresaContratistaComponent - onSubmit() - Enviando datos:', this.empresaForm.value);

    this.contractorCompanyService.updateCompany(this.empresaId, this.empresaForm.value).subscribe({
      next: (response: any) => {
        console.log('EditarEmpresaContratistaComponent - Empresa actualizada exitosamente:', response);
        this.successMessage = 'Empresa contratista actualizada exitosamente';
        this.submitting = false;
        this.formSubmitted = false;
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('Error al actualizar empresa contratista:', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para modificar empresas contratistas. Esta acción requiere privilegios de administrador.';
        } else if (err.status === 400 && err.error) {
          this.error = err.error;
        } else if (err.status === 404) {
          this.error = 'La empresa contratista no fue encontrada.';
        } else {
          this.error = 'No se pudo actualizar la empresa contratista. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    console.log('EditarEmpresaContratistaComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
  }

  continuarEditando(): void {
    console.log('EditarEmpresaContratistaComponent - continuarEditando() - Reiniciando estado del formulario');
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }

  volverALista(): void {
    console.log('EditarEmpresaContratistaComponent - volverALista() - Navegando de vuelta a la lista');
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