import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventorySupplierService } from '../../../../../services/inventory-supplier.service';

@Component({
  selector: 'app-editar-inventario-proveedor',
  templateUrl: './form-inventario-proveedor.component.html',
  styleUrls: ['./epp-catalog.shared.scss']
})
export class EditarInventarioProveedorComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  loading = true;
  error: string | null = null;
  successMessage: string | null = null;
  formSubmitted = false;
  titulo = 'Editar — Proveedores';
  subtitulo = 'Actualice los datos del proveedor.';
  modoEdicion = true;
  itemId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
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

  ngOnInit(): void {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const id = idRaw ? Number(idRaw) : NaN;
    if (!id || isNaN(id)) {
      this.error = 'Identificador inválido.';
      this.loading = false;
      return;
    }
    this.itemId = id;
    this.supplierApi.listGlobal().subscribe({
      next: (rows) => {
        const item = (rows || []).find((r) => Number(r.id) === id);
        if (!item) {
          this.error = 'No se encontró el proveedor.';
          this.loading = false;
          return;
        }
        this.form.patchValue({
          name: item.name || '',
          ruc: item.ruc || '',
          phone: item.phone || '',
          email: item.email || '',
          address: item.address || ''
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el proveedor.';
        this.loading = false;
      }
    });
  }

  listaUrl(): string[] {
    return ['/dashboard/admin/configuracion', 'equipo-proteccion-personal', 'proveedores'];
  }

  onSubmit(): void {
    if (this.form.invalid || !this.itemId) {
      this.formSubmitted = true;
      return;
    }
    this.submitting = true;
    this.error = null;
    this.successMessage = null;
    const v = this.form.value;
    this.supplierApi.updateGlobal(this.itemId, {
      name: String(v.name || '').trim(),
      ruc: String(v.ruc || '').trim() || undefined,
      phone: String(v.phone || '').trim() || undefined,
      email: String(v.email || '').trim() || undefined,
      address: String(v.address || '').trim() || undefined
    }).subscribe({
      next: () => {
        this.successMessage = 'Proveedor actualizado correctamente';
        this.submitting = false;
        setTimeout(() => void this.router.navigate(this.listaUrl()), 900);
      },
      error: (err: any) => {
        this.error = err?.error?.message || err?.message || 'Error al actualizar. Intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    void this.router.navigate(this.listaUrl());
  }
}
