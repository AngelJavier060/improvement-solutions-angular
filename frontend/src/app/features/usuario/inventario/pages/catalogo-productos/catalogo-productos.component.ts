import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryVariantAttributeService, VariantAttribute } from '../../../../../services/inventory-variant-attribute.service';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import { FileService } from '../../../../../services/file.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  
  // Atributos de variante (para el formulario)
  attrRows: { name: string; value: string; id?: number }[] = [];
  variantAttributes: { [variantId: number]: VariantAttribute[] } = {};

  // Subida de imagen
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  // Panel de formulario de producto
  showProductForm = false;
  panelPos = { x: 0, y: 0 };
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private panelStart = { x: 0, y: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private attrService: InventoryVariantAttributeService,
    private supplierService: InventorySupplierService,
    private categoryService: InventoryCategoryService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.initForm();
    this.initVariantForm();
    this.loadProducts();
    // Cargar listas globales (se reflejan las pantallas de configuración)
    this.loadSuppliers();
    this.loadCategories();
  }

  private toNum(val: any): number {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/,/g, '.'));
      return isNaN(n) ? 0 : n;
    }
    // Intentar BigDecimal serializado como objeto { value: "123.45" }
    const maybe = (val as any).value ?? (val as any)._value ?? null;
    if (maybe != null) {
      const n = parseFloat(String(maybe).replace(/,/g, '.'));
      return isNaN(n) ? 0 : n;
    }
    const n = Number(val);
    return isNaN(n) ? 0 : n;
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
      const name = this.getProductCategory(p);
      if (name) cats.add(name);
    });
    this.categoryNames = Array.from(cats).sort();
  }

  getProductCategory(p: InventoryProduct): string {
    if (p.categoryRef?.name) return p.categoryRef.name;
    return p.category || '';
  }

  getFilteredProducts(): InventoryProduct[] {
    return this.products.filter(p => {
      const catName = this.getProductCategory(p);
      const matchesSearch = !this.searchTerm || 
        p.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        catName.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesCategory = !this.filterCategory || catName === this.filterCategory;
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
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.productVariants = list.map(v => ({
          ...v,
          currentQty: this.toNum((v as any).currentQty),
          minQty: this.toNum((v as any).minQty),
          salePrice: this.toNum((v as any).salePrice)
        }));
        // Load attributes for each variant
        this.productVariants.forEach(v => { if (v.id) this.loadVariantAttributes(v.id); });
      },
      error: () => this.productVariants = []
    });
  }

  loadVariantAttributes(variantId: number): void {
    this.attrService.list(this.ruc, variantId).subscribe({
      next: (attrs) => { this.variantAttributes[variantId] = attrs || []; },
      error: () => { this.variantAttributes[variantId] = []; }
    });
  }

  getVariantAttributes(variantId?: number): VariantAttribute[] {
    if (!variantId) return [];
    return this.variantAttributes[variantId] || [];
  }

  addAttrRow(): void {
    this.attrRows.push({ name: '', value: '' });
  }

  removeAttrRow(i: number): void {
    this.attrRows.splice(i, 1);
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
    this.showProductForm = true;
  }

  openNewProductForm(): void {
    this.cancelEdit();
    this.showProductForm = true;
    this.loadSuppliers();
    this.loadCategories();
    this.setDefaultPanelPosition();
  }

  openEditProductForm(product: InventoryProduct): void {
    this.fillForm(product);
    this.showProductForm = true;
    this.selectedProduct = null;
    this.loadSuppliers();
    this.loadCategories();
    this.setDefaultPanelPosition();
  }

  getInactiveCount(): number {
    return this.products.filter(p => p.status === 'INACTIVO' || p.status === 'DESCONTINUADO').length;
  }

  createVariant(): void {
    if (!this.selectedProduct) return;
    this.showVariantForm = true;
    this.editingVariant = null;
    this.attrRows = [];
    this.variantForm.reset({ code: '', sizeLabel: '', dimensions: '', salePrice: 0, minQty: 0 });
  }

  editVariant(variant: InventoryVariant): void {
    this.showVariantForm = true;
    this.editingVariant = variant;
    this.variantForm.patchValue({
      code: variant.code,
      sizeLabel: variant.sizeLabel || '',
      dimensions: variant.dimensions || '',
      salePrice: variant.salePrice || 0,
      minQty: variant.minQty || 0
    });
    // Load existing attributes into attrRows
    if (variant.id) {
      const existing = this.variantAttributes[variant.id] || [];
      this.attrRows = existing.map(a => ({ id: a.id, name: a.attributeName, value: a.attributeValue }));
    } else {
      this.attrRows = [];
    }
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
      categoryName: ['', Validators.required],
      unitOfMeasure: [''],
      minStock: [null],
      maxStock: [null],
      status: ['ACTIVO', Validators.required],
      supplierId: [null],
      brand: [''],
      model: [''],
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
    this.attrRows = [];
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

    const saveAttributes = (variantId: number) => {
      const validAttrs = this.attrRows.filter(a => a.name.trim() && a.value.trim());
      if (!validAttrs.length) return;
      const calls = validAttrs.map(a =>
        a.id
          ? this.attrService.update(this.ruc, variantId, a.id, { attributeName: a.name, attributeValue: a.value })
          : this.attrService.create(this.ruc, variantId, { attributeName: a.name, attributeValue: a.value })
      );
      forkJoin(calls).subscribe({ next: () => {}, error: () => {} });
    };

    if (this.editingVariant?.id) {
      this.variantService.update(this.ruc, this.editingVariant.id!, payload).subscribe({
        next: (updated) => {
          saveAttributes(updated.id!);
          this.successMessage = 'Variante actualizada correctamente';
          this.loadVariants(this.selectedProduct!.id!);
          this.cancelVariantEdit();
        },
        error: (err) => this.errorMessage = err?.error?.message || 'Error al actualizar la variante'
      });
    } else {
      this.variantService.create(this.ruc, payload).subscribe({
        next: (created) => {
          saveAttributes(created.id!);
          this.successMessage = 'Variante creada correctamente';
          this.loadVariants(this.selectedProduct!.id!);
          this.cancelVariantEdit();
        },
        error: (err) => this.errorMessage = err?.error?.message || 'Error al crear la variante'
      });
    }
  }

  loadSuppliers(): void {
    forkJoin([
      this.supplierService.listGlobal().pipe(catchError(() => of([] as any[]))),
      this.supplierService.listCatalog().pipe(catchError(() => of([] as any[]))),
      this.supplierService.list(this.ruc).pipe(catchError(() => of([] as any[])))
    ]).subscribe(([global, catalog, byRuc]) => {
      const map = new Map<string, InventorySupplier & { name: string }>();
      [...(global||[]), ...(catalog||[]), ...(byRuc||[])].forEach((s: any) => {
        const name = (s?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, { ...s, name });
      });
      this.suppliers = Array.from(map.values()).sort((a, b) => (a.name||'').localeCompare(b.name||''));
    }, () => this.suppliers = []);
  }

  loadCategories(): void {
    forkJoin([
      this.categoryService.listGlobal().pipe(catchError(() => of([] as any[]))),
      this.categoryService.listCatalog().pipe(catchError(() => of([] as any[]))),
      this.categoryService.list(this.ruc).pipe(catchError(() => of([] as any[])))
    ]).subscribe(([global, catalog, byRuc]) => {
      const set = new Map<string, InventoryCategory & { name: string }>();

      // Global/catalog categories: solo nombre, sin ID (el ID es de otra tabla)
      [...(global||[]), ...(catalog||[])].forEach((c: any) => {
        const name = (c?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!set.has(key)) set.set(key, { name, id: undefined as any });
      });

      // Categorías de la empresa: tienen ID válido para categoryRef → siempre sobreescriben
      [...(byRuc||[])].forEach((c: any) => {
        const name = (c?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        set.set(key, { ...c, name });
      });

      this.categories = Array.from(set.values()).sort((a, b) => (a.name||'').localeCompare(b.name||''));
    }, () => this.categories = []);
  }

  getCategoryName(categoryId: number | null): string {
    if (!categoryId) return '';
    const cat = this.categories.find(c => c.id === categoryId);
    return cat?.name || '';
  }

  /** Obtiene el categoryRef (id de InventoryCategory) por nombre, solo si existe en categorías de empresa */
  getCategoryRefByName(name: string): { id: number } | null {
    if (!name) return null;
    const cat = this.categories.find(c => c.name?.toLowerCase() === name.toLowerCase() && c.id);
    return cat?.id ? { id: cat.id } : null;
  }

  suggestCode(): void {
    const catName = this.productForm.value.categoryName || 'PRD';
    const cat = catName.toUpperCase().slice(0, 3);
    const now = new Date();
    const y = now.getFullYear();
    const ts = now.getTime().toString().slice(-5);
    this.productForm.patchValue({ code: `${cat}-${y}-${ts}` });
  }

  fillForm(p: InventoryProduct): void {
    this.editingProductId = p.id || null;
    // Resolve category name: prioritize categoryRef.name, then category string, then lookup
    let catName = '';
    if (p.categoryRef?.name) {
      catName = p.categoryRef.name;
    } else if ((p as any).categoryRef?.id) {
      const found = this.categories.find(c => c.id === (p as any).categoryRef.id);
      catName = found?.name || p.category || '';
    } else if (p.category) {
      catName = p.category;
    }
    this.productForm.reset({
      code: p.code,
      name: p.name,
      categoryName: catName,
      brand: p.brand || '',
      model: p.model || '',
      unitOfMeasure: p.unitOfMeasure || '',
      minStock: p.minStock ?? null,
      maxStock: p.maxStock ?? null,
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
    this.showProductForm = false;
    this.productForm.reset({
      code: '',
      name: '',
      categoryName: '',
      unitOfMeasure: '',
      minStock: null,
      maxStock: null,
      status: 'ACTIVO',
      supplierId: null,
      brand: '',
      model: '',
      description: ''
    });
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
  }

  private setDefaultPanelPosition(): void {
    try {
      const width = 720; // panel más amplio para reducir scroll
      const x = Math.max(16, Math.round((window.innerWidth - width) / 2));
      const y = 48;
      this.panelPos = { x, y };
    } catch {
      this.panelPos = { x: 24, y: 64 };
    }
  }

  onPanelHeaderMouseDown(event: MouseEvent): void {
    this.dragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.panelStart = { ...this.panelPos };
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    const width = 720;
    const margin = 8;
    const maxX = Math.max(margin, (typeof window !== 'undefined' ? window.innerWidth : 1200) - width - margin);
    const maxY = Math.max(margin, (typeof window !== 'undefined' ? window.innerHeight : 800) - 120 - margin);
    let x = this.panelStart.x + dx;
    let y = this.panelStart.y + dy;
    x = Math.min(Math.max(margin, x), maxX);
    y = Math.max(margin, y);
    this.panelPos = { x, y };
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.dragging = false;
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    // Si el usuario regresó desde las pantallas de configuración, refrescar listas
    this.loadSuppliers();
    this.loadCategories();
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
    const categoryName: string = (raw.categoryName || '').trim();
    // Solo usar categoryRef si la categoría tiene un ID válido de InventoryCategory (de la empresa)
    const categoryRef = this.getCategoryRefByName(categoryName);
    const payload: InventoryProduct = {
      code: raw.code,
      name: raw.name,
      category: categoryName,
      categoryRef,
      unitOfMeasure: raw.unitOfMeasure || undefined,
      minStock: raw.minStock ?? undefined,
      maxStock: raw.maxStock ?? undefined,
      brand: raw.brand || undefined,
      model: raw.model || undefined,
      status: raw.status,
      supplier: raw.supplierId ? { id: raw.supplierId } : null,
      description: raw.description || undefined
    };

    if (this.editingProductId) {
      // Actualizar: construir payload completo para no perder imagen ni otros campos
      const existing = this.products.find(p => p.id === this.editingProductId) || {} as InventoryProduct;
      const payloadFull: InventoryProduct = {
        ...existing,
        code: raw.code,
        name: raw.name,
        category: categoryName,
        categoryRef,
        unitOfMeasure: raw.unitOfMeasure || existing.unitOfMeasure,
        minStock: raw.minStock ?? undefined,
        maxStock: raw.maxStock ?? undefined,
        brand: raw.brand || existing.brand,
        model: raw.model || existing.model,
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
