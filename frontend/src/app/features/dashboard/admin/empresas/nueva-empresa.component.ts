import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { FileService } from '../../../../services/file.service';
import { environment } from '../../../../../environments/environment';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-nueva-empresa',
  templateUrl: './nueva-empresa.component.html',
  styleUrls: ['./nueva-empresa.component.scss']
})
export class NuevaEmpresaComponent implements OnInit {
  empresaForm: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  logoError: string | null = null;
  constructor(
    private fb: FormBuilder,
    private businessService: BusinessService,
    private fileService: FileService,
    private router: Router,
    public dialogRef: MatDialogRef<NuevaEmpresaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.empresaForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
      taxId: ['', [Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameShort: ['', [Validators.maxLength(50)]],
      legalRepresentative: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      website: ['', [Validators.pattern(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/)]],
      address: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.maxLength(100)]],
      province: ['', [Validators.maxLength(100)]],
      country: ['Ecuador', [Validators.maxLength(100)]],
      postalCode: ['', [Validators.maxLength(20)]],
      phone: ['', [Validators.required, Validators.maxLength(20)]],
      sector: ['', [Validators.maxLength(100)]],
      employeesCount: [null, [Validators.min(0), Validators.max(1000000)]],
      description: ['', [Validators.maxLength(500)]],
      status: ['active']
    });
  }

  ngOnInit(): void {
  }
  get f(): any {
    return this.empresaForm.controls;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar el tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.logoError = 'Por favor seleccione una imagen válida';
        this.logoFile = null;
        this.logoPreviewUrl = null;
        return;
      }

      // Validar el tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.logoError = 'La imagen no debe exceder 2MB';
        this.logoFile = null;
        this.logoPreviewUrl = null;
        return;
      }

      this.logoFile = file;
      this.logoError = null;

      // Crear preview
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  onSubmit(): void {
    this.submitted = true;
    this.error = '';

    if (this.empresaForm.invalid) {
      // Resaltamos los campos con error
      Object.keys(this.empresaForm.controls).forEach(key => {
        const control = this.empresaForm.get(key);
        if (control?.invalid) {
          control.markAsDirty();
        }
      });
      return;
    }

    this.loading = true;// Si hay un logo seleccionado, súbelo primero
    if (this.logoFile) {
      // Crear FormData objeto explícitamente para asegurar que la solicitud multipart se forme correctamente
      const formData = new FormData();
      formData.append('file', this.logoFile);
      
      // Usar el método HTTP directamente para asegurar que se envíe como multipart/form-data
      this.fileService.uploadFileToDirectory('logos', this.logoFile).subscribe({
        next: (response) => {
          // Agregar la URL del logo al formulario
          const empresaData = {
            ...this.empresaForm.value,
            logo: response.url
          };
          this.createBusiness(empresaData);
        },
        error: (err) => {
          this.error = 'Error al subir el logo: ' + (err.error?.message || err.message || 'Error desconocido');
          this.loading = false;
          console.error('Error al subir logo:', err);
        }
      });
    } else {
      // Si no hay logo, crear la empresa directamente
      this.createBusiness(this.empresaForm.value);
    }
  }  private createBusiness(empresaData: any): void {
    console.log('Intentando crear empresa con datos:', JSON.stringify(empresaData, null, 2));
    this.businessService.create(empresaData).subscribe({
      next: (response: any) => {
        console.log('Empresa creada con éxito, ID:', response.id);
        
        // Deshabilitar el indicador de carga
        this.loading = false;
        
        // Almacenar ID de empresa para verificar éxito de la operación
        if (response.id) {
          localStorage.setItem('last_created_business_id', response.id.toString());
        }
          // Usar navegación Angular con ruta relativa
        this.router.navigateByUrl('/dashboard/admin/empresas/lista').then(() => {
          console.log('Navegación exitosa a la lista de empresas');
        }).catch(err => {
          console.error('Error en navegación:', err);
        });
        this.dialogRef.close('refresh');
      },
      error: (err) => {
        this.error = 'Error al crear la empresa';
        console.error('Error en createBusiness:', err);
        this.loading = false;
      }
    });
  }
  cancelar(): void {
    this.dialogRef.close();
  }
}
