import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import { BusinessContextService } from '../../../../../core/services/business-context.service';

@Component({
  standalone: true,
  selector: 'app-inventario-categorias',
  templateUrl: './inventario-categorias.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class InventarioCategoriasComponent implements OnInit {
  ruc: string = '';
  list: InventoryCategory[] = [];
  form!: FormGroup;
  loading = false;
  error = '';
  ok = '';
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private categoryService: InventoryCategoryService,
    private businessCtx: BusinessContextService
  ) {}

  ngOnInit(): void {
    const active = this.businessCtx.getActiveBusiness();
    this.ruc = active?.ruc || '';
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['']
    });
    if (this.ruc) this.load(); else this.error = 'Seleccione una empresa activa para continuar.';
  }

  load(): void {
    this.loading = true;
    this.categoryService.list(this.ruc).subscribe({
      next: (data: any) => { this.list = (data || []) as InventoryCategory[]; this.loading = false; },
      error: (_err: any) => { this.loading = false; this.error = 'No se pudieron cargar las categorías'; }
    });
  }

  

  submit(): void {
    this.error = ''; this.ok = '';
    if (!this.ruc || this.form.invalid) return;
    this.loading = true;
    if (this.editingId != null) {
      const payload: InventoryCategory = { name: this.form.value.name, description: this.form.value.description };
      this.categoryService.update(this.ruc, this.editingId, payload).subscribe({
        next: () => {
          this.ok = 'Categoría actualizada';
          this.editingId = null;
          this.form.reset();
          this.load();
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || err?.message || 'No se pudo actualizar la categoría';
        }
      });
    } else {
      const payload: InventoryCategory = { name: this.form.value.name, description: this.form.value.description, active: false };
      this.categoryService.create(this.ruc, payload).subscribe({
        next: () => {
          this.ok = 'Categoría creada';
          this.form.reset();
          this.load();
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.error?.message || err?.message || 'No se pudo crear la categoría';
        }
      });
    }
  }

  startEdit(c: InventoryCategory): void {
    this.error = ''; this.ok = '';
    if (!c || c.id == null) return;
    this.editingId = Number(c.id);
    this.form.patchValue({ name: c.name || '', description: c.description || '' });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset();
  }

  remove(id?: number): void {
    this.error = ''; this.ok = '';
    if (!id || !this.ruc) return;
    this.loading = true;
    this.categoryService.delete(this.ruc, Number(id)).subscribe({
      next: () => {
        if (this.editingId === Number(id)) this.cancelEdit();
        this.load();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'No se pudo eliminar la categoría';
      }
    });
  }
}
