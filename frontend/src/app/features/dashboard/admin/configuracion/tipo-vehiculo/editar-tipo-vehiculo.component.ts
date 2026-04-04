import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoVehiculoService } from '../../../../../services/tipo-vehiculo.service';
import { TipoDocumentoVehiculoService } from '../../../../../services/tipo-documento-vehiculo.service';
import { TipoDocumentoVehiculo } from '../../../../../models/tipo-documento-vehiculo.model';

@Component({
  selector: 'app-editar-tipo-vehiculo',
  templateUrl: './editar-tipo-vehiculo.component.html',
  styleUrls: ['./editar-tipo-vehiculo.component.scss']
})
export class EditarTipoVehiculoComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;
  tiposDocumento: TipoDocumentoVehiculo[] = [];
  documentosSeleccionados: number[] = [];

  constructor(
    private fb: FormBuilder,
    private service: TipoVehiculoService,
    private tipoDocumentoService: TipoDocumentoVehiculoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      documentIds: [[]]
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTiposDocumento();
    this.loadTipoVehiculo();
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

  loadTipoVehiculo(): void {
    this.service.getById(this.id).subscribe({
      next: (data: any) => {
        this.form.patchValue({ 
          name: data.name, 
          description: data.description 
        });
        
        // Cargar documentos asociados
        if (data.documentos && Array.isArray(data.documentos)) {
          this.documentosSeleccionados = data.documentos.map((doc: any) => doc.id);
          this.form.patchValue({ documentIds: this.documentosSeleccionados });
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el registro';
        this.loading = false;
        console.error(err);
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
    this.saving = true;
    
    const formData = {
      ...this.form.value,
      documentIds: this.documentosSeleccionados
    };
    
    this.service.update(this.id, formData).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al actualizar el registro';
        this.saving = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-vehiculo']);
  }
}
