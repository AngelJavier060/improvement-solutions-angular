import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';

@Component({
  selector: 'app-nuevo-tipo-documento',
  templateUrl: './nuevo-tipo-documento.component.html',
  styleUrls: ['./nuevo-tipo-documento.component.scss']
})
export class NuevoTipoDocumentoComponent implements OnInit {
  tipoDocumentoForm: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  currentUrl: string;

  constructor(
    private fb: FormBuilder,
    private tipoDocumentoService: TipoDocumentoService,
    private router: Router
  ) {
    this.currentUrl = this.router.url;
    console.log('NuevoTipoDocumentoComponent constructor - Current URL:', this.currentUrl);
    
    this.tipoDocumentoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }
  
  ngOnInit(): void {
    console.log('NuevoTipoDocumentoComponent - ngOnInit() - Componente inicializado');
  }

  onSubmit(): void {
    console.log('NuevoTipoDocumentoComponent - onSubmit() - Formulario enviado', this.tipoDocumentoForm.value);
    
    if (this.tipoDocumentoForm.invalid) {
      this.tipoDocumentoForm.markAllAsTouched();
      console.log('NuevoTipoDocumentoComponent - Formulario inválido', this.tipoDocumentoForm.errors);
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    
    console.log('NuevoTipoDocumentoComponent - Enviando datos al servicio');
    
    this.tipoDocumentoService.createTipoDocumento(this.tipoDocumentoForm.value).subscribe({      next: (tipoDocumento) => {
        console.log('NuevoTipoDocumentoComponent - Tipo de documento creado exitosamente:', tipoDocumento);
        this.successMessage = `El tipo de documento "${tipoDocumento.name}" se ha creado correctamente`;
        this.submitting = false;
        this.formSubmitted = true;
        
        // Redirigir a la lista después de mostrar el mensaje de éxito durante 1.5 segundos
        setTimeout(() => {
          this.volverALista();
        }, 1500);
      },
      error: (err) => {
        console.error('Error al crear tipo de documento', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para crear tipos de documento. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudo crear el tipo de documento. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    console.log('NuevoTipoDocumentoComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/tipo-documento']);
  }
  
  volverALista(): void {
    console.log('NuevoTipoDocumentoComponent - volverALista() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/tipo-documento']);
  }
  
  crearNuevo(): void {
    console.log('NuevoTipoDocumentoComponent - crearNuevo() - Reiniciando formulario');
    this.tipoDocumentoForm.reset();
    this.formSubmitted = false;
    this.successMessage = null;
    this.error = null;
  }
}
