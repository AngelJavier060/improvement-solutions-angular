import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Iso9001CatalogKey, Iso9001CatalogService } from '../../../../../services/iso-9001-catalog.service';
import { Iso9001CatalogRouteData } from './lista-iso-9001-catalog.component';

@Component({
  selector: 'app-nuevo-iso-9001-catalog',
  templateUrl: './nuevo-iso-9001-catalog.component.html',
  styleUrls: ['./iso-9001-catalog.shared.scss']
})
export class NuevoIso9001CatalogComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  catalogKey!: Iso9001CatalogKey;
  nuevoTitulo = '';
  nuevoSubtitulo = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogApi: Iso9001CatalogService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    const data = this.route.parent?.snapshot.data as Iso9001CatalogRouteData | undefined;
    if (data?.catalogKey) {
      this.catalogKey = data.catalogKey;
      this.nuevoTitulo = `Nuevo — ${data.listaTitulo}`;
      this.nuevoSubtitulo = 'Complete el formulario (nombre y descripción).';
    }
  }

  listaUrl(): string[] {
    return ['/dashboard/admin/configuracion', 'iso-9001', this.catalogKey];
  }

  onSubmit(): void {
    if (this.form.invalid || !this.catalogKey) {
      this.formSubmitted = true;
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    this.catalogApi.create(this.catalogKey, this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Registro creado correctamente';
        this.submitting = false;
        this.form.reset();
        this.formSubmitted = false;
        setTimeout(() => {
          this.router.navigate(this.listaUrl());
        }, 1200);
      },
      error: err => {
        console.error(err);
        if (err.status === 409) {
          this.error = 'Ya existe un registro con ese nombre en este catálogo.';
        } else if (err.status === 403) {
          this.error = 'No tiene permisos para crear registros.';
        } else if (err.status === 400) {
          this.error = 'Solicitud no válida. Verifique los datos.';
        } else {
          this.error = 'Error al guardar. Por favor, intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(this.listaUrl());
  }
}
