import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TipoDocumentoVehiculoService } from '../../../../../services/tipo-documento-vehiculo.service';

@Component({
  selector: 'app-editar-tipo-documento-vehiculo',
  templateUrl: './editar-tipo-documento-vehiculo.component.html',
  styleUrls: ['./editar-tipo-documento-vehiculo.component.scss']
})
export class EditarTipoDocumentoVehiculoComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;

  constructor(
    private fb: FormBuilder,
    private service: TipoDocumentoVehiculoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(this.id).subscribe({
      next: (data) => {
        this.form.patchValue({ name: data.name, description: data.description });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.service.update(this.id, this.form.value).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo']);
      },
      error: (err) => {
        this.error = 'Error al actualizar el registro';
        this.saving = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/tipo-documento-vehiculo']);
  }
}
