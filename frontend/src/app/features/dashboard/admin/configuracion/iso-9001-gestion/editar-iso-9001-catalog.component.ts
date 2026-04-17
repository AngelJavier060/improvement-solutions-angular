import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Iso9001CatalogKey, Iso9001CatalogService } from '../../../../../services/iso-9001-catalog.service';
import { Iso9001CatalogRouteData } from './lista-iso-9001-catalog.component';

@Component({
  selector: 'app-editar-iso-9001-catalog',
  templateUrl: './editar-iso-9001-catalog.component.html',
  styleUrls: ['./iso-9001-catalog.shared.scss']
})
export class EditarIso9001CatalogComponent implements OnInit {
  form: FormGroup;
  itemId = 0;
  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  catalogKey!: Iso9001CatalogKey;
  editarTitulo = '';
  editarSubtitulo = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly catalogApi: Iso9001CatalogService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    const data = this.route.parent?.snapshot.data as Iso9001CatalogRouteData | undefined;
    if (data?.catalogKey) {
      this.catalogKey = data.catalogKey;
      this.editarTitulo = `Editar — ${data.listaTitulo}`;
      this.editarSubtitulo = 'Modifique nombre y descripción del registro seleccionado.';
    }
    this.itemId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.catalogKey && this.itemId) {
      this.cargar();
    }
  }

  listaUrl(): string[] {
    return ['/dashboard/admin/configuracion', 'iso-9001', this.catalogKey];
  }

  cargar(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.catalogApi.getById(this.catalogKey, this.itemId).subscribe({
      next: row => {
        if (!row) {
          this.errorMessage = 'No se encontró el registro.';
          this.loading = false;
          return;
        }
        this.form.patchValue({
          name: row.name,
          description: row.description ?? ''
        });
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.errorMessage = 'Error al cargar los datos. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.catalogApi.update(this.catalogKey, this.itemId, this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Registro actualizado correctamente';
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate(this.listaUrl());
        }, 1200);
      },
      error: err => {
        console.error(err);
        if (err.status === 409) {
          this.errorMessage = 'Ya existe otro registro con ese nombre en este catálogo.';
        } else if (err.status === 403) {
          this.errorMessage = 'No tiene permisos para actualizar registros.';
        } else if (err.status === 404) {
          this.errorMessage = 'El registro no fue encontrado.';
        } else {
          this.errorMessage = 'Error al actualizar. Por favor, intente nuevamente.';
        }
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(this.listaUrl());
  }
}
