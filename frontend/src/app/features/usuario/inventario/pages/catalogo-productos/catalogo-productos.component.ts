import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import { FileService } from '../../../../../services/file.service';

@Component({
  selector: 'app-catalogo-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalogo-productos.component.html',
  styleUrls: ['./catalogo-productos.component.scss']
})
export class CatalogoProductosComponent implements OnInit {
  ruc: string = '';
  products: InventoryProduct[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Filtros
  searchTerm = '';
  filterCategory = '';
  filterStatus = 'ACTIVO';
  categories: InventoryCategory[] = [];
  categoryNames: string[] = [];

  // Modal de detalle
  selectedProduct: InventoryProduct | null = null;
  productVariants: InventoryVariant[] = [];
  // Gestión de variantes (en modal)
  variantForm!: FormGroup;
  editingVariant: InventoryVariant | null = null;
  showVariantForm = false;

  // Formulario (columna izquierda)
  productForm!: FormGroup;
  editingProductId: number | null = null;
  suppliers: InventorySupplier[] = [];
  statusOptions = ['ACTIVO', 'INACTIVO', 'DESCONTINUADO'];
  
  // Subida de imagen
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private supplierService: InventorySupplierService,
    private categoryService: InventoryCategoryService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.initForm();
    this.initVariantForm();
    this.loadProducts();
    this.loadSuppliers();
    this.loadCategories();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.productService.list(this.ruc).subscribe({
      next: (data) => {
        this.products = data;
        this.extractCategories();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al cargar los productos';
        this.loading = false;
      }
    });
  }

  extractCategories(): void {
    const cats = new Set<string>();
    this.products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    this.categoryNames = Array.from(cats).sort();
  }

  getFilteredProducts(): InventoryProduct[] {
    return this.products.filter(p => {
      const matchesSearch = !this.searchTerm || 
        p.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = !this.filterCategory || p.category === this.filterCategory;
      const matchesStatus = !this.filterStatus || p.status === this.filterStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  selectProduct(product: InventoryProduct): void {
    this.selectedProduct = product;
    this.loadVariants(product.id!);
    this.showVariantForm = false;
    this.editingVariant = null;
    this.variantForm.reset({ code: '', sizeLabel: '', dimensions: '', salePrice: 0, minQty: 0 });
  }

  loadVariants(productId: number): void {
    this.variantService.listByProduct(this.ruc, productId).subscribe({
      next: (data) => this.productVariants = data,
      error: () => this.productVariants = []
    });
  }

  viewProductDetails(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    this.selectProduct(product);
  }

  getVariantCount(productId: number): number {
    // Esto es un placeholder, idealmente debería venir del backend
    return 0;
  }

  editProduct(product: InventoryProduct): void {
    this.fillForm(product);
  }

  createVariant(): void {
    if (!this.selectedProduct) return;
    this.showVariantForm = true;
    this.editingVariant = null;
    this.variantForm.reset({ code: '', sizeLabel: '', dimensions: '', salePrice: 0, minQty: 0 });
  }

  editVariant(variant: InventoryVariant): void {
    // Editar en línea dentro del modal
    this.showVariantForm = true;
    this.editingVariant = variant;
    this.variantForm.patchValue({
      code: variant.code,
      sizeLabel: variant.sizeLabel || '',
      dimensions: variant.dimensions || '',
      salePrice: variant.salePrice || 0,
      minQty: variant.minQty || 0
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/img/company-placeholder.svg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/api/files')) return imagePath;
    return `/api/files/${imagePath}`;
  }

  getSupplierName(supplierId?: number): string {
    if (!supplierId) return '-';
    const supplier = this.suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  }

  confirmDelete(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    
    const confirmMsg = `¿Estás seguro de eliminar el producto "${product.name}"?\n\nCódigo: ${product.code}\nEsta acción no se puede deshacer.`;
    
    if (confirm(confirmMsg)) {
      this.deleteProduct(product.id!);
    }
  }

  confirmDeactivate(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    const msg = `¿Deseas desactivar el producto "${product.name}"?\n\nCódigo: ${product.code}`;
    if (!confirm(msg)) return;

    // Traer payload completo y guardar con estado INACTIVO
    this.productService.getById(this.ruc, product.id!).subscribe({
      next: (prodFull) => {
        const payload: InventoryProduct = { ...prodFull, status: 'INACTIVO' };
        this.productService.update(this.ruc, product.id!, payload).subscribe({
          next: (saved) => {
            const idx = this.products.findIndex(p => p.id === product.id);
            if (idx >= 0) this.products[idx] = { ...this.products[idx], status: saved.status };
            this.successMessage = 'Producto desactivado correctamente';
          },
          error: (err) => {
            this.errorMessage = err?.error?.message || 'No se pudo desactivar el producto';
          }
        });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo leer el producto';
      }
    });
  }

  deleteProduct(productId: number): void {
    this.productService.delete(this.ruc, productId).subscribe({
      next: () => {
        // Con la nueva semántica del backend: si el producto estaba INACTIVO, ya está eliminado físicamente.
        // Remover de la lista local sin llamadas adicionales.
        this.products = this.products.filter(p => p.id !== productId);
        this.successMessage = 'Producto eliminado definitivamente';
        if (this.editingProductId === productId) this.cancelEdit();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo eliminar el producto. Verifique dependencias (variantes/movimientos).';
      }
    });
  }

  // ====== LÓGICA DE FORMULARIO (COLUMNA IZQUIERDA) ======
  initForm(): void {
    this.productForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      category: ['', [Validators.required, Validators.maxLength(50)]],
      unitOfMeasure: [''],
      minStock: [0],
      status: ['ACTIVO', Validators.required],
      supplierId: [null],
      description: ['']
    });
  }

  // ====== VARIANTES (FORM EN MODAL) ======
  initVariantForm(): void {
    this.variantForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      sizeLabel: [''],
      dimensions: [''],
      salePrice: [0],
      minQty: [0]
    });
  }

  openVariants(product: InventoryProduct, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectProduct(product);
  }

  cancelVariantEdit(): void {
    this.showVariantForm = false;
    this.editingVariant = null;
    if (this.variantForm) {
      this.variantForm.reset({ code: '', sizeLabel: '', dimensions: '', salePrice: 0, minQty: 0 });
    }
  }

  submitVariant(): void {
    if (!this.selectedProduct?.id) return;
    if (this.variantForm.invalid) { this.errorMessage = 'Completa correctamente el formulario de variante'; return; }

    const raw = this.variantForm.value as any;
    const payload: any = {
      productId: this.selectedProduct.id,
      code: raw.code,
      sizeLabel: raw.sizeLabel || undefined,
      dimensions: raw.dimensions || undefined,
      salePrice: raw.salePrice || 0,
      minQty: raw.minQty || 0
    };

    if (this.editingVariant?.id) {
      this.variantService.update(this.ruc, this.editingVariant.id!, payload).subscribe({
        next: () => {
          this.successMessage = 'Variante actualizada correctamente';
          this.loadVariants(this.selectedProduct!.id!);
          this.cancelVariantEdit();
        },
        error: (err) => this.errorMessage = err?.error?.message || 'Error al actualizar la variante'
      });
    } else {
      this.variantService.create(this.ruc, payload).subscribe({
        next: () => {
          this.successMessage = 'Variante creada correctamente';
          this.loadVariants(this.selectedProduct!.id!);
          this.cancelVariantEdit();
        },
        error: (err) => this.errorMessage = err?.error?.message || 'Error al crear la variante'
      });
    }
  }

  loadSuppliers(): void {
    this.supplierService.list(this.ruc).subscribe({
      next: (data) => this.suppliers = data,
      error: () => this.suppliers = []
    });
  }

  loadCategories(): void {
    this.categoryService.list(this.ruc).subscribe({
      next: (data) => {
        this.categories = data.filter(c => c.active !== false);
      },
      error: () => this.categories = []
    });
  }

  suggestCode(): void {
    const cat = (this.productForm.value.category || 'PRD').toString().toUpperCase().slice(0, 3);
    const now = new Date();
    const y = now.getFullYear();
    const ts = now.getTime().toString().slice(-5);
    this.productForm.patchValue({ code: `${cat}-${y}-${ts}` });
  }

  fillForm(p: InventoryProduct): void {
    this.editingProductId = p.id || null;
    this.productForm.reset({
      code: p.code,
      name: p.name,
      category: p.category,
      unitOfMeasure: p.unitOfMeasure || '',
      minStock: p.minStock || 0,
      status: p.status || 'ACTIVO',
      supplierId: p.supplier?.id || null,
      description: p.description || ''
    });
    // Mostrar imagen actual si existe
    if (p.image) {
      this.imagePreviewUrl = this.getImageUrl(p.image);
    } else {
      this.imagePreviewUrl = null;
    }
    this.selectedImageFile = null;
    this.successMessage = '';
    this.errorMessage = '';
    // Cerrar el modal de detalles si estaba abierto
    this.selectedProduct = null;
  }

  cancelEdit(): void {
    this.editingProductId = null;
    this.productForm.reset({
      code: '',
      name: '',
      category: '',
      unitOfMeasure: '',
      minStock: 0,
      status: 'ACTIVO',
      supplierId: null,
      description: ''
    });
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  onImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Solo se permiten archivos de imagen';
        event.target.value = '';
        return;
      }
      // Validar tamaño (5 MB máx)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe superar los 5 MB';
        event.target.value = '';
        return;
      }
      this.selectedImageFile = file;
      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this.errorMessage = '';
    }
  }

  submitProduct(): void {
    if (this.productForm.invalid) {
      this.errorMessage = 'Completa correctamente el formulario del producto';
      return;
    }
    this.errorMessage = '';
    const raw = this.productForm.value;
    const payload: InventoryProduct = {
      code: raw.code,
      name: raw.name,
      category: raw.category,
      unitOfMeasure: raw.unitOfMeasure || undefined,
      minStock: raw.minStock,
      status: raw.status,
      supplier: raw.supplierId ? { id: raw.supplierId } : null,
      description: raw.description || undefined
    };

    if (this.editingProductId) {
      // Actualizar (enviar payload completo para no borrar campos como image/brand/model)
      const existing = this.products.find(p => p.id === this.editingProductId) || {} as InventoryProduct;
      const payloadFull: InventoryProduct = {
        ...existing,
        code: raw.code,
        name: raw.name,
        category: raw.category,
        unitOfMeasure: raw.unitOfMeasure || existing.unitOfMeasure,
        minStock: raw.minStock,
        status: raw.status,
        supplier: raw.supplierId ? { id: raw.supplierId } : null,
        description: raw.description || existing.description,
        image: (existing as InventoryProduct).image
      };
      this.productService.update(this.ruc, this.editingProductId, payloadFull).subscribe({
        next: (updated) => {
          if (this.selectedImageFile) {
            // Si hay nueva imagen, subirla
            this.uploadProductImage(updated.id!);
          } else {
            // Sin nueva imagen: preservar la imagen actual del producto
            const idx = this.products.findIndex(p => p.id === this.editingProductId);
            if (idx >= 0) {
              // Mantener la imagen existente al actualizar
              this.products[idx] = { ...this.products[idx], ...updated, image: this.products[idx].image };
            }
            this.successMessage = 'Producto actualizado correctamente';
            this.cancelEdit();
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al actualizar el producto';
        }
      });
    } else {
      // Crear
      this.productService.create(this.ruc, payload).subscribe({
        next: (created) => {
          if (this.selectedImageFile) {
            this.uploadProductImage(created.id!);
          } else {
            this.products.unshift(created);
            this.successMessage = 'Producto creado correctamente';
            this.cancelEdit();
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al crear el producto';
        }
      });
    }
  }

  uploadProductImage(productId: number): void {
    if (!this.selectedImageFile) return;
    
    this.fileService.uploadFileToDirectory('inventory_products', this.selectedImageFile).subscribe({
      next: (response) => {
        // Obtener el producto completo y enviar un PUT con el payload completo + imagen
        this.productService.getById(this.ruc, productId).subscribe({
          next: (productFull) => {
            const payloadWithImage: InventoryProduct = { ...productFull, image: response.url };
            this.productService.update(this.ruc, productId, payloadWithImage).subscribe({
              next: (saved) => {
                const idx = this.products.findIndex(p => p.id === productId);
                if (idx >= 0) {
                  this.products[idx] = { ...saved };
                } else {
                  this.products.unshift(saved);
                }
                this.successMessage = this.editingProductId ? 'Producto actualizado correctamente' : 'Producto creado correctamente';
                this.cancelEdit();
              },
              error: () => {
                // Fallback local (no ideal, pero evita perder preview)
                const idx = this.products.findIndex(p => p.id === productId);
                if (idx >= 0) this.products[idx] = { ...this.products[idx], image: response.url };
                this.errorMessage = 'Imagen subida, pero no se pudo guardar en el producto';
                this.cancelEdit();
              }
            });
          },
          error: () => {
            // Si no se pudo obtener el producto, no enviamos PUT parcial para evitar borrar campos
            this.errorMessage = 'No se pudo leer el producto para asociar la imagen. Intenta de nuevo.';
            this.cancelEdit();
          }
        });
      },
      error: () => {
        this.errorMessage = 'Error al subir la imagen. El producto se guardó sin imagen.';
        this.cancelEdit();
      }
    });
  }
}
