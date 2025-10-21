import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { InventoryProductService, InventoryProduct } from '../../../services/inventory-product.service';
import { FileService } from '../../../services/file.service';
import { InventorySupplierService, InventorySupplier } from '../../../services/inventory-supplier.service';
import { InventoryCategoryService, InventoryCategory } from '../../../services/inventory-category.service';
import { InventoryVariantService, InventoryVariant } from '../../../services/inventory-variant.service';

@Component({
  selector: 'app-inventario-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inventario-welcome.component.html',
  styleUrls: ['./inventario-welcome.component.scss']
})
export class InventarioWelcomeComponent implements OnInit {
  ruc: string = '';
  loading: boolean = false;
  products: InventoryProduct[] = [];
  suppliers: InventorySupplier[] = [];
  categoryOptions: string[] = [];
  selectedProduct: InventoryProduct | null = null;
  variants: InventoryVariant[] = [];
  form!: FormGroup;
  variantForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  uploadedImagePath: string = '';
  imagePreviewUrl: string = '';
  selectedFile: File | null = null;
  editingProduct: InventoryProduct | null = null;
  editingVariant: InventoryVariant | null = null;

  categories = ['EPP', 'PIEZA', 'HERRAMIENTA'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: InventoryProductService,
    private fileService: FileService,
    private supplierService: InventorySupplierService,
    private variantService: InventoryVariantService,
    private categoryService: InventoryCategoryService
  ) {
    this.ruc = this.resolveRucFromRoute();
  }

  delete(p: InventoryProduct): void {
    if (!p?.id || !this.ruc) return;
    const ok = confirm(`¿Eliminar el producto ${p.code} - ${p.name}?`);
    if (!ok) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.productService.delete(this.ruc, p.id).subscribe({
      next: () => {
        this.successMessage = 'Producto eliminado';
        this.loadProducts();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'No se pudo eliminar el producto';
      }
    });
  }

  ngOnInit(): void {
    // Asegurar que el RUC se obtenga correctamente
    this.ruc = this.resolveRucFromRoute();
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['', Validators.required],
      supplier: [null],
      unitOfMeasure: [''],
      description: [''],
      minStock: [0, [Validators.min(0)]]
    });
    this.variantForm = this.fb.group({
      code: ['', Validators.required],
      sizeLabel: [''],
      dimensions: [''],
      salePrice: [0, Validators.min(0)],
      minQty: [0, Validators.min(0)]
    });
    this.loadProducts();
    this.loadSuppliers();
    this.loadCategories();
  }

  private resolveRucFromRoute(): string {
    const direct = this.route.snapshot.paramMap.get('ruc');
    if (direct) return direct;
    let p = this.route.parent;
    while (p) {
      const val = p.snapshot.paramMap.get('ruc');
      if (val) return val;
      p = p.parent as ActivatedRoute | null;
    }
    const m = this.router.url.match(/\/usuario\/([^\/]+)/);
    return m && m[1] ? m[1] : '';
  }

  loadProducts(): void {
    if (!this.ruc) return;
    this.loading = true;
    this.productService.list(this.ruc).subscribe({
      next: (data) => {
        this.products = data || [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'No se pudo cargar el inventario.';
      }
    });
  }

  loadSuppliers(): void {
    if (!this.ruc) { this.suppliers = []; return; }
    this.supplierService.list(this.ruc).subscribe({
      next: (data) => {
        this.suppliers = data || [];
        if (!this.suppliers.length) {
          this.supplierService.listCatalog().subscribe({
            next: (cat) => {
              this.suppliers = (cat || []).map((s: any) => ({ name: s?.name } as any));
            },
            error: () => {}
          });
        }
      },
      error: () => {
        this.suppliers = [];
        this.supplierService.listCatalog().subscribe({
          next: (cat) => {
            this.suppliers = (cat || []).map((s: any) => ({ name: s?.name } as any));
          },
          error: () => {}
        });
      }
    });
  }

  loadCategories(): void {
    if (!this.ruc) return;
    this.categoryService.list(this.ruc).subscribe({
      next: (list) => {
        // Mostrar todas las categorías (aunque estén inactivas) para pruebas iniciales
        const names = (list || []).map((c: any) => c?.name).filter(Boolean) as string[];
        if (names.length) {
          this.categoryOptions = names;
          const current = this.form.get('category')?.value;
          if (!current && this.categoryOptions.length) {
            this.form.patchValue({ category: this.categoryOptions[0] });
          }
        } else {
          this.categoryService.listCatalog().subscribe({
            next: (cat) => {
              const fallback = (cat || []).map((c: any) => c?.name).filter(Boolean) as string[];
              this.categoryOptions = fallback.length ? fallback : ['EPP', 'PIEZA', 'HERRAMIENTA'];
              const current = this.form.get('category')?.value;
              if (!current && this.categoryOptions.length) {
                this.form.patchValue({ category: this.categoryOptions[0] });
              }
            },
            error: () => {
              this.categoryOptions = ['EPP', 'PIEZA', 'HERRAMIENTA'];
              if (!this.form.get('category')?.value) {
                this.form.patchValue({ category: this.categoryOptions[0] });
              }
            }
          });
        }
      },
      error: () => {
        this.categoryService.listCatalog().subscribe({
          next: (cat) => {
            const fallback = (cat || []).map((c: any) => c?.name).filter(Boolean) as string[];
            this.categoryOptions = fallback.length ? fallback : ['EPP', 'PIEZA', 'HERRAMIENTA'];
            if (!this.form.get('category')?.value && this.categoryOptions.length) {
              this.form.patchValue({ category: this.categoryOptions[0] });
            }
          },
          error: () => {
            this.categoryOptions = ['EPP', 'PIEZA', 'HERRAMIENTA'];
            if (!this.form.get('category')?.value) {
              this.form.patchValue({ category: this.categoryOptions[0] });
            }
          }
        });
      }
    });
  }

  selectProduct(p: InventoryProduct): void {
    this.selectedProduct = p;
    this.editingVariant = null;
    this.variantForm.reset({ minQty: 0, salePrice: 0 });
    this.loadVariants();
  }

  loadVariants(): void {
    if (!this.ruc || !this.selectedProduct?.id) { this.variants = []; return; }
    this.variantService.listByProduct(this.ruc, this.selectedProduct.id).subscribe({
      next: (data) => this.variants = data || [],
      error: () => this.variants = []
    });
  }

  submitVariant(): void {
    if (this.variantForm.invalid || !this.selectedProduct?.id || !this.ruc) return;
    this.loading = true;
    this.errorMessage = '';
    const raw = this.variantForm.value;
    const payload: any = {
      productId: this.selectedProduct.id,
      code: raw.code,
      sizeLabel: raw.sizeLabel,
      dimensions: raw.dimensions,
      salePrice: raw.salePrice || 0,
      minQty: raw.minQty || 0
    };

    const operation$ = this.editingVariant
      ? this.variantService.update(this.ruc, this.editingVariant.id!, payload)
      : this.variantService.create(this.ruc, payload);

    operation$.subscribe({
      next: () => {
        const wasEditing = !!this.editingVariant;
        this.variantForm.reset({ minQty: 0, salePrice: 0 });
        this.editingVariant = null;
        this.successMessage = wasEditing ? 'Variante actualizada exitosamente' : 'Variante creada exitosamente';
        this.loadVariants();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'No se pudo guardar la variante';
      }
    });
  }

  editVariant(variant: InventoryVariant): void {
    this.editingVariant = variant;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Cargar datos en el formulario de variantes
    this.variantForm.patchValue({
      code: variant.code,
      sizeLabel: variant.sizeLabel,
      dimensions: variant.dimensions,
      salePrice: variant.salePrice || 0,
      minQty: variant.minQty || 0
    });
  }

  cancelVariantEdit(): void {
    this.editingVariant = null;
    this.variantForm.reset({ minQty: 0, salePrice: 0 });
    this.errorMessage = '';
    this.successMessage = '';
  }

  deleteVariant(variant: InventoryVariant): void {
    if (!variant?.id || !this.ruc || !this.selectedProduct?.id) return;
    const ok = confirm(`¿Eliminar la variante ${variant.code}?\n\nNOTA: Esta acción solo es posible si la variante no tiene movimientos de inventario.`);
    if (!ok) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.variantService.delete(this.ruc, this.selectedProduct.id, variant.id).subscribe({
      next: () => {
        this.successMessage = 'Variante eliminada exitosamente';
        this.loadVariants();
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'No se pudo eliminar la variante';
      }
    });
  }

  submit(): void {
    if (this.form.invalid || !this.ruc) return;
    this.loading = true;
    const raw = this.form.value;
    const payload: any = {
      code: raw.code,
      name: raw.name,
      category: raw.category,
      unitOfMeasure: raw.unitOfMeasure || null,
      description: raw.description || null,
      minStock: raw.minStock || 0,
      status: 'ACTIVO'
    };
    if (raw.supplier) {
      payload.supplier = { id: raw.supplier };
    }

    // Si estamos editando, usar update; si no, crear
    const operation$ = this.editingProduct
      ? this.productService.update(this.ruc, this.editingProduct.id!, payload)
      : this.productService.create(this.ruc, payload);

    operation$
      .pipe(
        switchMap(result => {
          if (this.selectedFile) {
            return this.fileService.uploadFileToDirectory('inventory_products', this.selectedFile)
              .pipe(
                map(resp => {
                  const updatePayload = { ...result, image: resp.url };
                  return this.productService.update(this.ruc, result.id!, updatePayload);
                }),
                switchMap(obs => obs)
              );
          }
          return of(result);
        }),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: () => {
          const wasEditing = !!this.editingProduct;
          this.form.reset({ minStock: 0 });
          this.selectedFile = null;
          this.imagePreviewUrl = '';
          this.editingProduct = null;
          this.successMessage = wasEditing ? 'Producto actualizado exitosamente' : 'Producto guardado exitosamente';
          // Recargar lista para mostrar el nuevo producto con imagen
          this.loadProducts();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al guardar el producto.';
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  edit(product: InventoryProduct): void {
    this.editingProduct = product;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Cargar datos en el formulario
    this.form.patchValue({
      code: product.code,
      name: product.name,
      category: product.category,
      supplier: product.supplier?.id || null,
      unitOfMeasure: product.unitOfMeasure,
      description: product.description || '',
      minStock: product.minStock || 0
    });

    // Si tiene imagen, mostrar preview
    if (product.image) {
      this.imagePreviewUrl = this.getImageUrl(product.image);
    }

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingProduct = null;
    this.form.reset({ minStock: 0 });
    this.selectedFile = null;
    this.imagePreviewUrl = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // Si ya es una URL completa, devolverla tal cual
    if (imagePath.startsWith('http')) return imagePath;
    // Si es una ruta relativa, construir la URL completa
    return `/api/files/${imagePath}`;
  }

  goBack(): void {
    if (this.ruc) {
      this.router.navigate([`/usuario/${this.ruc}/welcome`]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
