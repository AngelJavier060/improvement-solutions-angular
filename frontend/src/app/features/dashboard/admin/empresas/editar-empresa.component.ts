import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { FileService } from '../../../../services/file.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-editar-empresa',
  templateUrl: './editar-empresa.component.html',
  styleUrls: ['./editar-empresa.component.scss']
})
export class EditarEmpresaComponent implements OnInit {
  empresaForm: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  empresaId: number;
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  logoError: string | null = null;
  empresaActual: Business | null = null;

  constructor(
    private fb: FormBuilder,
    private businessService: BusinessService,
    private fileService: FileService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
    
    this.empresaForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameShort: ['', [Validators.maxLength(50)]],
      legalRepresentative: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.email]],
      address: ['', [Validators.maxLength(200)]],
      phone: ['', [Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.loading = true;
    this.businessService.getById(this.empresaId).subscribe({
      next: (empresa: Business) => {
        this.empresaActual = empresa;
        this.empresaForm.patchValue({
          ruc: empresa.ruc,
          name: empresa.name,
          nameShort: empresa.nameShort,
          legalRepresentative: empresa.legalRepresentative,
          email: empresa.email,
          address: empresa.address,
          phone: empresa.phone
        });
        if (empresa.logo) {
          const filename = (empresa.logo || '').split('/').pop() || '';
          this.logoPreviewUrl = filename ? this.fileService.getFileDirectoryUrl('logos', filename, true) : '';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la empresa';
        console.error(err);
        this.loading = false;
      }
    });
  }  get f(): any {
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

    if (this.empresaForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Si hay un nuevo logo, súbelo primero
    if (this.logoFile) {
      this.fileService.uploadFileToDirectory('logos', this.logoFile).subscribe({
        next: (response) => {
          const empresaData = {
            ...this.empresaForm.value,
            logo: response.url
          };
          this.actualizarEmpresa(empresaData);
        },
        error: (err) => {
          const backendMsg = this.extractErrorMessage(err);
          this.error = backendMsg ? `Error al subir el logo: ${backendMsg}` : 'Error al subir el logo';
          this.loading = false;
          console.error('Error al subir logo:', err);
        }
      });
    } else {
      // Si no hay nuevo logo, mantener el logo actual
      const empresaData = {
        ...this.empresaForm.value,
        logo: this.empresaActual?.logo
      };
      this.actualizarEmpresa(empresaData);
    }
  }

  private actualizarEmpresa(empresaData: any): void {
    this.businessService.update(this.empresaId, empresaData).subscribe({
      next: () => {
        // Volver a la lista de empresas usando la ruta completa
        this.router.navigate(['/dashboard/admin/empresas']);
      },
      error: (err) => {
        const backendMsg = this.extractErrorMessage(err);
        this.error = backendMsg ? `Error al actualizar la empresa: ${backendMsg}` : 'Error al actualizar la empresa';
        console.error('Actualizar empresa error:', err);
        this.loading = false;
      }
    });
  }

  private extractErrorMessage(err: any): string {
    try {
      if (!err) return '';
      // HttpErrorResponse suele traer el payload en err.error
      const payload = (err && 'error' in err) ? err.error : err;

      // Si es string directo (p.ej. texto plano del backend)
      if (typeof payload === 'string' && payload.trim()) return payload.trim();

      // Mensaje típico en { message: '...'}
      if (payload && typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message.trim();
      }

      // Errores de validación comunes: arrays
      if (Array.isArray(payload?.errors)) {
        const msgs = payload.errors
          .map((x: any) => {
            if (typeof x === 'string') return x;
            if (x?.defaultMessage) return x.defaultMessage;
            if (x?.message) return x.message;
            const field = x?.field ? `${x.field}: ` : '';
            return field + (x?.error || x?.code || '').toString();
          })
          .filter((m: any) => !!m && String(m).trim());
        if (msgs.length) return msgs.join('; ');
      }

      // Otra convención: fieldErrors
      if (Array.isArray(payload?.fieldErrors)) {
        const msgs = payload.fieldErrors
          .map((fe: any) => `${fe.field || ''}: ${fe.message || fe.defaultMessage || fe.error || ''}`.trim())
          .filter((m: any) => !!m && String(m).trim());
        if (msgs.length) return msgs.join('; ');
      }

      // Detalle alternativo
      if (typeof payload?.details === 'string' && payload.details.trim()) return payload.details.trim();
      if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail.trim();

      // Si viene como Error simple arrojado por interceptores/servicios
      if (typeof err?.message === 'string' && err.message.trim()) return err.message.trim();

      // Último recurso: serializar un resumen
      if (payload && typeof payload === 'object') {
        return JSON.stringify(payload);
      }
      return '';
    } catch {
      return '';
    }
  }

  cancelar(): void {
    // Volver a la lista de empresas usando la ruta completa
    this.router.navigate(['/dashboard/admin/empresas']);
  }
}
