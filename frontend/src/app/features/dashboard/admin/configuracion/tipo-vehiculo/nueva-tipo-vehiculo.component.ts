import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TipoVehiculoService } from '../../../../../services/tipo-vehiculo.service';
import { TipoDocumentoVehiculoService } from '../../../../../services/tipo-documento-vehiculo.service';
import { TipoDocumentoVehiculo } from '../../../../../models/tipo-documento-vehiculo.model';

@Component({
  selector: 'app-nueva-tipo-vehiculo',
  templateUrl: './nueva-tipo-vehiculo.component.html',
  styleUrls: ['./nueva-tipo-vehiculo.component.scss']
})
export class NuevaTipoVehiculoComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  tiposDocumento: TipoDocumentoVehiculo[] = [];
  documentosSeleccionados: number[] = [];

  constructor(
    private fb: FormBuilder, 
    private service: TipoVehiculoService,
    private tipoDocumentoService: TipoDocumentoVehiculoService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      documentIds: [[]]  // Array de IDs de documentos seleccionados
    });
  }

  ngOnInit(): void {
    this.loadTiposDocumento();
  }

  loadTiposDocumento(): void {
    this.tipoDocumentoService.getAll().subscribe({
      next: (data) => {
        this.tiposDocumento = data;
      },
      error: (err) => {
        console.error('Error al cargar tipos de documento:', err);
      }
    });
  }

  toggleDocumento(documentoId: number): void {
    const index = this.documentosSeleccionados.indexOf(documentoId);
    if (index > -1) {
      this.documentosSeleccionados.splice(index, 1);
    } else {
      this.documentosSeleccionados.push(documentoId);
    }
    this.form.patchValue({ documentIds: this.documentosSeleccionados });
  }

  isDocumentoSeleccionado(documentoId: number): boolean {
    return this.documentosSeleccionados.includes(documentoId);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    
    const formData = {
      ...this.form.value,
      documentIds: this.documentosSeleccionados
    };
    
    this.service.create(formData).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al crear el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo']);
  }
}
