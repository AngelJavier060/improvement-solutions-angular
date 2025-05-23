import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoDocumentoService } from '../../../../../services/tipo-documento.service';

@Component({
  selector: 'app-editar-tipo-documento',
  templateUrl: './editar-tipo-documento.component.html',
  styleUrls: ['./editar-tipo-documento.component.scss']
})
export class EditarTipoDocumentoComponent implements OnInit {
  tipoDocumentoId!: number;
  tipoDocumentoForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  currentUrl: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tipoDocumentoService: TipoDocumentoService
  ) { 
    this.currentUrl = this.router.url;
    console.log('EditarTipoDocumentoComponent constructor - Current URL:', this.currentUrl);
  }

  ngOnInit(): void {
    console.log('EditarTipoDocumentoComponent - ngOnInit() - Componente inicializado');
    
    // Inicializar el formulario vacío
    this.tipoDocumentoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
    
    // Obtener el ID del tipo de documento desde la URL
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tipoDocumentoId = +id;
      console.log('EditarTipoDocumentoComponent - ID recibido:', this.tipoDocumentoId);
      this.cargarTipoDocumento();
    } else {
      this.error = 'ID de tipo de documento no válido';
      console.error('EditarTipoDocumentoComponent - ID no válido en los parámetros de ruta');
    }
  }
  
  cargarTipoDocumento(): void {
    this.loading = true;
    console.log(`EditarTipoDocumentoComponent - cargarTipoDocumento() - Cargando tipo de documento ID: ${this.tipoDocumentoId}`);
    
    this.tipoDocumentoService.getTipoDocumento(this.tipoDocumentoId).subscribe({
      next: (tipoDocumento) => {
        console.log('EditarTipoDocumentoComponent - Datos recibidos:', tipoDocumento);
        this.tipoDocumentoForm.patchValue(tipoDocumento);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar tipo de documento', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para acceder a este tipo de documento. Esta acción requiere privilegios de administrador.';
        } else if (err.status === 404) {
          this.error = 'El tipo de documento solicitado no existe.';
        } else {
          this.error = 'No se pudo cargar la información del tipo de documento. Por favor intente nuevamente.';
        }
        this.loading = false;
      }
    });
  }
  
  onSubmit(): void {
    console.log('EditarTipoDocumentoComponent - onSubmit() - Intentando actualizar tipo de documento');
    
    if (this.tipoDocumentoForm.invalid) {
      this.tipoDocumentoForm.markAllAsTouched();
      console.log('EditarTipoDocumentoComponent - Formulario inválido', this.tipoDocumentoForm.errors);
      return;
    }
    
    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    
    console.log('EditarTipoDocumentoComponent - Enviando actualización:', this.tipoDocumentoForm.value);
    
    this.tipoDocumentoService.updateTipoDocumento(this.tipoDocumentoId, this.tipoDocumentoForm.value).subscribe({      next: (tipoDocumento) => {
        console.log('EditarTipoDocumentoComponent - Tipo de documento actualizado exitosamente:', tipoDocumento);
        this.successMessage = `El tipo de documento "${tipoDocumento.name}" se ha actualizado correctamente`;
        this.submitting = false;
        
        // Redirigir a la lista después de mostrar el mensaje de éxito durante 1.5 segundos
        setTimeout(() => {
          this.volverALista();
        }, 1500);
      },
      error: (err) => {
        console.error('Error al actualizar tipo de documento', err);
        if (err.status === 403) {
          this.error = 'No tiene permisos para actualizar tipos de documento. Esta acción requiere privilegios de administrador.';
        } else {
          this.error = 'No se pudo actualizar el tipo de documento. Por favor intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }
  
  cancelar(): void {
    console.log('EditarTipoDocumentoComponent - cancelar() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/tipo-documento']);
  }
  
  volverALista(): void {
    console.log('EditarTipoDocumentoComponent - volverALista() - Navegando de vuelta a la lista');
    this.router.navigate(['/dashboard/admin/configuracion/tipo-documento']);
  }
}
