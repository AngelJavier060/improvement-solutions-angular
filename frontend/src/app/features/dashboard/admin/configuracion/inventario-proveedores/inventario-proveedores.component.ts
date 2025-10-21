import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';

@Component({
  standalone: true,
  selector: 'app-inventario-proveedores',
  templateUrl: './inventario-proveedores.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class InventarioProveedoresComponent implements OnInit {
  ruc: string = '';
  list: InventorySupplier[] = [];
  form!: FormGroup;
  loading = false;
  error = '';
  ok = '';
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private supplierService: InventorySupplierService,
    private businessCtx: BusinessContextService
  ) {}

  ngOnInit(): void {
    const active = this.businessCtx.getActiveBusiness();
    this.ruc = active?.ruc || '';
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      ruc: [''],
      phone: [''],
      email: [''],
      address: ['']
    });
    if (this.ruc) this.load(); else this.error = 'Seleccione una empresa activa para continuar.';
  }

  load(): void {
    this.loading = true;
    this.supplierService.list(this.ruc).subscribe({
      next: (data: any) => { this.list = (data || []) as InventorySupplier[]; this.loading = false; },
      error: (_err: any) => { this.loading = false; this.error = 'No se pudieron cargar los proveedores'; }
    });
  }

  submit(): void {
    this.error = ''; this.ok = '';
    if (!this.ruc || this.form.invalid) return;
    const base: InventorySupplier = {
      name: this.form.value.name,
      ruc: this.form.value.ruc,
      phone: this.form.value.phone,
      email: this.form.value.email,
      address: this.form.value.address
    };
    this.loading = true;
    if (this.editingId != null) {
      this.supplierService.update(this.ruc, this.editingId, base).subscribe({
        next: () => {
          this.ok = 'Proveedor actualizado';
          this.editingId = null;
          this.form.reset();
          this.load();
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || err?.message || 'No se pudo actualizar el proveedor';
        }
      });
    } else {
      const createPayload: InventorySupplier = { ...base, active: false };
      this.supplierService.create(this.ruc, createPayload).subscribe({
        next: () => {
          this.ok = 'Proveedor creado';
          this.form.reset();
          this.load();
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || err?.message || 'No se pudo crear el proveedor';
        }
      });
    }
  }

  startEdit(s: InventorySupplier): void {
    this.error = ''; this.ok = '';
    if (!s || s.id == null) return;
    this.editingId = Number(s.id);
    this.form.patchValue({
      name: s.name || '',
      ruc: s.ruc || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || ''
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset();
  }

  remove(id?: number): void {
    this.error = ''; this.ok = '';
    if (!id || !this.ruc) return;
    this.loading = true;
    this.supplierService.delete(this.ruc, Number(id)).subscribe({
      next: () => {
        if (this.editingId === Number(id)) this.cancelEdit();
        this.load();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'No se pudo eliminar el proveedor';
      }
    });
  }
}
