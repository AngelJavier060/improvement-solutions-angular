import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InventorySupplierService } from '../../../../../services/inventory-supplier.service';

@Component({
  selector: 'app-nuevo-inventario-proveedor',
  templateUrl: './form-inventario-proveedor.component.html',
  styleUrls: ['./epp-catalog.shared.scss']
})
export class NuevoInventarioProveedorComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  titulo = 'Nuevo — Proveedores';
  subtitulo = 'Complete los datos del proveedor.';
  modoEdicion = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly supplierApi: InventorySupplierService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      ruc: ['', Validators.maxLength(20)],
      phone: ['', Validators.maxLength(50)],
      email: ['', [Validators.maxLength(150), Validators.email]],
      address: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {}

  listaUrl(): string[] {
    return ['/dashboard/admin/configuracion', 'equipo-proteccion-personal', 'proveedores'];
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.formSubmitted = true;
      return;
    }
    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    const v = this.form.value;
    this.supplierApi.createGlobal({
      name: String(v.name || '').trim(),
      ruc: String(v.ruc || '').trim() || undefined,
      phone: String(v.phone || '').trim() || undefined,
      email: String(v.email || '').trim() || undefined,
      address: String(v.address || '').trim() || undefined
    }).subscribe({
      next: () => {
        this.successMessage = 'Proveedor creado correctamente';
        this.submitting = false;
        setTimeout(() => void this.router.navigate(this.listaUrl()), 900);
      },
      error: (err: any) => {
        this.error = err?.error?.message || err?.message || 'Error al guardar. Intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    void this.router.navigate(this.listaUrl());
  }
}
