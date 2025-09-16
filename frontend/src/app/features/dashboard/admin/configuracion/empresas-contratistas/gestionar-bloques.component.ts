import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../../services/contractor-block.service';
import { ContractorCompany, ContractorBlock } from '../../../../../models/contractor-company.model';

@Component({
  selector: 'app-gestionar-bloques',
  templateUrl: './gestionar-bloques.component.html',
  styleUrls: ['./gestionar-bloques.component.scss']
})
export class GestionarBloquesComponent implements OnInit {
  empresa: ContractorCompany | null = null;
  bloques: ContractorBlock[] = [];
  bloqueForm: FormGroup;
  
  loading = true;
  loadingBloques = false;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  empresaId: number;
  editingBlock: ContractorBlock | null = null;
  showForm = false;

  constructor(
    private fb: FormBuilder,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
    console.log('GestionarBloquesComponent constructor - ID Empresa:', this.empresaId);
    
    this.bloqueForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      code: ['', [Validators.maxLength(100)]],
      description: ['', Validators.maxLength(1000)],
      active: [true]
    });
  }

  ngOnInit(): void {
    console.log('GestionarBloquesComponent - ngOnInit() - Componente inicializado');
    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.loading = true;
    this.error = null;

    this.contractorCompanyService.getCompanyById(this.empresaId).subscribe({
      next: (empresa) => {
        console.log('GestionarBloquesComponent - Empresa cargada:', empresa);
        this.empresa = empresa;
        this.cargarBloques();
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        if (err.status === 404) {
          this.error = 'La empresa contratista no fue encontrada.';
        } else {
          this.error = 'Error al cargar los datos de la empresa contratista.';
        }
        this.loading = false;
      }
    });
  }

  cargarDatos(): void {
    console.log('GestionarBloquesComponent - cargarDatos() - Recargando datos');
    this.cargarEmpresa();
  }

  cargarBloques(): void {
    this.loadingBloques = true;

    this.contractorBlockService.getBlocksByCompanyId(this.empresaId).subscribe({
      next: (bloques) => {
        console.log('GestionarBloquesComponent - Bloques cargados:', bloques);
        this.bloques = bloques;
        this.loading = false;
        this.loadingBloques = false;
      },
      error: (err) => {
        console.error('Error al cargar bloques:', err);
        this.error = 'Error al cargar los bloques de la empresa.';
        this.loading = false;
        this.loadingBloques = false;
      }
    });
  }

  mostrarFormulario(): void {
    this.showForm = true;
    this.editingBlock = null;
    this.bloqueForm.reset({ active: true });
    this.error = null;
    this.successMessage = null;
  }

  editarBloque(bloque: ContractorBlock): void {
    this.editingBlock = bloque;
    this.showForm = true;
    this.bloqueForm.patchValue({
      name: bloque.name,
      code: bloque.code || '',
      description: bloque.description || '',
      active: bloque.active
    });
    this.error = null;
    this.successMessage = null;
  }

  cancelarFormulario(): void {
    this.showForm = false;
    this.editingBlock = null;
    this.bloqueForm.reset({ active: true });
    this.error = null;
    this.successMessage = null;
  }

  onSubmit(): void {
    if (this.bloqueForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    const bloqueData = {
      ...this.bloqueForm.value,
      contractorCompanyId: this.empresaId
    };

    console.log('GestionarBloquesComponent - onSubmit() - Datos del bloque:', bloqueData);

    if (this.editingBlock) {
      // Actualizar bloque existente
      this.contractorBlockService.updateBlock(this.editingBlock.id!, bloqueData).subscribe({
        next: (response) => {
          console.log('GestionarBloquesComponent - Bloque actualizado:', response);
          this.successMessage = 'Bloque actualizado exitosamente';
          this.submitting = false;
          this.cancelarFormulario();
          this.cargarBloques();
        },
        error: (err) => this.handleFormError(err)
      });
    } else {
      // Crear nuevo bloque
      this.contractorBlockService.createBlock(bloqueData).subscribe({
        next: (response) => {
          console.log('GestionarBloquesComponent - Bloque creado:', response);
          this.successMessage = 'Bloque creado exitosamente';
          this.submitting = false;
          this.cancelarFormulario();
          this.cargarBloques();
        },
        error: (err) => this.handleFormError(err)
      });
    }
  }

  eliminarBloque(bloqueId: number): void {
    const bloque = this.bloques.find(b => b.id === bloqueId);
    if (!bloque) return;

    const mensaje = `¿Está seguro que desea eliminar el bloque "${bloque.name}"?`;
    const subMensaje = bloque.totalEmployees && bloque.totalEmployees > 0 
      ? `\n\nAdvertencia: Este bloque tiene ${bloque.totalEmployees} empleado(s) asociado(s).`
      : '';
    
    if (confirm(mensaje + subMensaje)) {
      this.contractorBlockService.deleteBlock(bloqueId).subscribe({
        next: () => {
          console.log('GestionarBloquesComponent - Bloque eliminado');
          this.successMessage = 'Bloque eliminado exitosamente';
          this.cargarBloques();
        },
        error: (err) => {
          console.error('Error al eliminar bloque:', err);
          if (err.error && typeof err.error === 'string') {
            this.error = err.error;
          } else {
            this.error = 'No se pudo eliminar el bloque. Por favor intente nuevamente.';
          }
        }
      });
    }
  }

  toggleEstadoBloque(bloque: ContractorBlock): void {
    const accion = bloque.active ? 'desactivar' : 'activar';
    if (confirm(`¿Está seguro que desea ${accion} el bloque "${bloque.name}"?`)) {
      this.contractorBlockService.toggleBlockStatus(bloque.id!).subscribe({
        next: () => {
          console.log('GestionarBloquesComponent - Estado del bloque actualizado');
          this.successMessage = `Bloque ${accion}do exitosamente`;
          this.cargarBloques();
        },
        error: (err) => {
          console.error('Error al cambiar estado del bloque:', err);
          this.error = 'No se pudo cambiar el estado del bloque.';
        }
      });
    }
  }

  private handleFormError(err: any): void {
    console.error('Error en formulario de bloque:', err);
    if (err.status === 400 && err.error) {
      this.error = err.error;
    } else {
      this.error = this.editingBlock 
        ? 'No se pudo actualizar el bloque. Por favor intente nuevamente.'
        : 'No se pudo crear el bloque. Por favor intente nuevamente.';
    }
    this.submitting = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.bloqueForm.controls).forEach(key => {
      const control = this.bloqueForm.get(key);
      control?.markAsTouched();
    });
  }

  // Métodos helper para validaciones en template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.bloqueForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.bloqueForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `El campo ${fieldName} es requerido`;
      if (field.errors['maxlength']) return `El campo ${fieldName} excede la longitud máxima`;
    }
    return '';
  }

  volver(): void {
    this.router.navigate(['/dashboard/admin/configuracion/empresas-contratistas']);
  }
}