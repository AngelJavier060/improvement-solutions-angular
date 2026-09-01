import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EppCatalogKey, EppCatalogService } from '../../../../../services/epp-catalog.service';
import { EppCatalogRouteData } from './lista-epp-catalog.component';

@Component({
  selector: 'app-nuevo-epp-catalog',
  templateUrl: './nuevo-epp-catalog.component.html',
  styleUrls: ['./epp-catalog.shared.scss']
})
export class NuevoEppCatalogComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;

  catalogKey!: EppCatalogKey;
  nuevoTitulo = '';
  nuevoSubtitulo = '';
  codePlaceholder = 'Ej. EPP';
  namePlaceholder = 'Ingrese el nombre';
  descriptionPlaceholder = 'Ingrese una descripción';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly catalogApi: EppCatalogService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]{2,20}$/)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    const data = this.route.parent?.snapshot.data as EppCatalogRouteData | undefined;
    if (data?.catalogKey) {
      this.catalogKey = data.catalogKey;
      this.nuevoTitulo = `Nuevo — ${data.listaTitulo}`;
      this.nuevoSubtitulo = this.catalogApi.isNameOnly(this.catalogKey)
        ? (this.catalogKey === 'estado-epi'
          ? 'Complete nombre y descripción. Ej.: Buen estado, Desgaste normal, Deteriorado / Roto.'
          : this.catalogKey === 'tipo-acontecimiento'
          ? 'Complete nombre y descripción. Ej.: Solicitud de EPP, Incumplimiento de uso, Deterioro prematuro.'
          : this.catalogKey === 'tipo-salida'
            ? 'Complete nombre y descripción. Ej.: Entrega de EPP a trabajador, Préstamo de herramienta, Baja de productos.'
            : 'Complete nombre y descripción. Ej.: Compra, Devolución, Transferencia, Ajuste o Donación.')
        : 'Complete nombre, código y descripción.';
      this.namePlaceholder = this.catalogKey === 'tipo-entrada'
        ? 'Ej. Compra'
        : this.catalogKey === 'tipo-salida'
          ? 'Ej. Entrega de EPP a trabajador'
          : this.catalogKey === 'tipo-acontecimiento'
            ? 'Ej. Solicitud de EPP'
            : this.catalogKey === 'estado-epi'
              ? 'Ej. Buen estado (Solo falta de uso)'
            : 'Ingrese el nombre';
      this.descriptionPlaceholder = this.catalogKey === 'tipo-entrada'
        ? 'Ej. Compra a proveedor con factura o guía de remisión'
        : this.catalogKey === 'tipo-salida'
          ? 'Ej. Dotación / entrega de EPP al personal'
          : this.catalogKey === 'tipo-acontecimiento'
            ? 'Ej. Pedido o reposición de equipo de protección personal'
            : this.catalogKey === 'estado-epi'
              ? 'Ej. El EPP está en buen estado; solo falta de uso'
            : 'Ingrese una descripción';
      this.codePlaceholder =
        this.catalogKey === 'familia' ? 'Ej. EPP'
        : this.catalogKey === 'seccion' ? 'Ej. CAS'
        : 'Ej. COMPRA';
      if (this.catalogApi.isNameOnly(this.catalogKey)) {
        this.form.get('code')?.clearValidators();
        this.form.get('code')?.updateValueAndValidity({ emitEvent: false });
      } else if (this.catalogKey === 'familia' || this.catalogKey === 'seccion') {
        this.form.get('code')?.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9]{2,4}$/)]);
        this.form.get('code')?.updateValueAndValidity({ emitEvent: false });
      }
    }
  }

  /** Normaliza el código a mayúsculas al salir del campo. */
  onCodeBlur(): void {
    const ctrl = this.form.get('code');
    if (!ctrl) return;
    const v = String(ctrl.value || '').trim().toUpperCase();
    if (ctrl.value !== v) {
      ctrl.setValue(v, { emitEvent: false });
    }
  }

  skuPreview(): string {
    const code = String(this.form.get('code')?.value || '').trim().toUpperCase();
    if (this.catalogApi.isNameOnly(this.catalogKey)) {
      const tag = this.catalogKey === 'tipo-salida' ? 'Salida'
        : this.catalogKey === 'tipo-acontecimiento' ? 'Acontecimiento'
        : this.catalogKey === 'estado-epi' ? 'Estado EPI'
        : 'Entrada';
      return code ? `${tag} · ${code}` : '';
    }
    if (!code || !/^[A-Z0-9]{2,4}$/.test(code)) return '';
    if (this.catalogKey === 'familia') {
      return `${code}-XXX-001`;
    }
    return `EPP-${code}-001`;
  }

  listaUrl(): string[] {
    return ['/dashboard/admin/configuracion', 'equipo-proteccion-personal', this.catalogKey];
  }

  private conflictMessage(err: any): string {
    const msg = String(err?.error?.message || err?.message || '').toLowerCase();
    if (msg.includes('código') || msg.includes('codigo') || msg.includes('code')) {
      return 'Ya existe un registro con ese código.';
    }
    return 'Ya existe un registro con ese nombre o código.';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.catalogKey) {
      this.formSubmitted = true;
      return;
    }
    this.onCodeBlur();
    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    this.catalogApi.create(this.catalogKey, this.form.value).subscribe({
      next: () => {
        this.successMessage = 'Registro creado correctamente';
        this.submitting = false;
        this.form.reset();
        this.formSubmitted = false;
        setTimeout(() => void this.router.navigate(this.listaUrl()), 900);
      },
      error: (err: any) => {
        this.error = err?.status === 409
          ? this.conflictMessage(err)
          : (err?.error?.message || err?.message || 'Error al guardar. Intente nuevamente.');
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    void this.router.navigate(this.listaUrl());
  }
}
