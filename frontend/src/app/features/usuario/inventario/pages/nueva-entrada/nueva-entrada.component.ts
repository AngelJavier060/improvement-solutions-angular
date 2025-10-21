import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryEntryService, InventoryEntry, InventoryEntryDetail } from '../../../../../services/inventory-entry.service';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';
import { FileService } from '../../../../../services/file.service';

@Component({
  selector: 'app-nueva-entrada',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './nueva-entrada.component.html',
  styleUrls: ['./nueva-entrada.component.scss']
})
export class NuevaEntradaComponent implements OnInit {
  ruc: string = '';
  entryForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  
  // Catálogos
  suppliers: InventorySupplier[] = [];
  products: InventoryProduct[] = [];
  
  // Detalles de entrada
  details: InventoryEntryDetail[] = [];
  
  // Selección de producto
  showProductModal = false;
  selectedProduct: InventoryProduct | null = null;
  variants: InventoryVariant[] = [];
  selectedVariant: InventoryVariant | null = null;
  
  // Tipos de entrada
  entryTypes = ['COMPRA', 'DEVOLUCION', 'TRANSFERENCIA', 'AJUSTE', 'DONACION'];
  itemConditions = ['NUEVO', 'USADO', 'REACONDICIONADO'];
  
  // Subida de documento
  selectedFile: File | null = null;
  documentFileName: string = '';
  documentFileSize: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private entryService: InventoryEntryService,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private supplierService: InventorySupplierService,
    private fileService: FileService
  ) {
    const today = new Date().toISOString().split('T')[0];
    const suggestedNumber = this.generateEntryNumber();
    this.entryForm = this.fb.group({
      entryNumber: [suggestedNumber, Validators.required],
      entryDate: [today, Validators.required],
      entryType: ['COMPRA', Validators.required],
      supplierId: [null],
      origin: [''],
      receivedBy: ['', Validators.required],
      authorizedBy: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadSuppliers();
    this.loadProducts();
  }

  loadSuppliers(): void {
    this.supplierService.list(this.ruc).subscribe({
      next: (data) => this.suppliers = data,
      error: () => this.suppliers = []
    });
  }

  loadProducts(): void {
    this.productService.list(this.ruc).subscribe({
      next: (data) => this.products = data,
      error: () => this.products = []
    });
  }

  openProductModal(): void {
    this.showProductModal = true;
    this.selectedProduct = null;
    this.selectedVariant = null;
    this.variants = [];
  }

  selectProduct(product: InventoryProduct): void {
    this.selectedProduct = product;
    if (product.id) {
      this.variantService.listByProduct(this.ruc, product.id).subscribe({
        next: (data) => this.variants = data,
        error: () => this.variants = []
      });
    }
  }

  selectVariant(variant: InventoryVariant): void {
    this.selectedVariant = variant;
  }

  addDetailLine(): void {
    if (!this.selectedVariant) return;
    
    const detail: InventoryEntryDetail = {
      variantId: this.selectedVariant.id!,
      quantity: 1,
      unitCost: 0,
      taxPercentage: 12,
      taxAmount: 0,
      totalCost: 0,
      itemCondition: 'NUEVO',
      productName: this.selectedProduct?.name,
      variantCode: this.selectedVariant.code,
      productImage: this.selectedProduct?.image
    };
    
    this.details.push(detail);
    this.showProductModal = false;
    this.selectedProduct = null;
    this.selectedVariant = null;
  }

  removeDetail(index: number): void {
    this.details.splice(index, 1);
  }

  calculateLineCost(detail: InventoryEntryDetail): void {
    if (detail.unitCost && detail.quantity) {
      // Calcular IVA
      detail.taxAmount = (detail.unitCost * detail.taxPercentage) / 100;
      // Calcular total
      detail.totalCost = detail.quantity * (detail.unitCost + detail.taxAmount);
    }
  }

  getTotalEntry(): number {
    return this.details.reduce((sum, d) => sum + (d.totalCost || 0), 0);
  }

  isHeaderValid(): boolean {
    const v = this.entryForm.value;
    return !!(v.entryNumber && v.entryDate && v.entryType && v.receivedBy);
  }

  generateEntryNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `ENT-${year}${month}${day}-${hour}${minute}${second}`;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        this.errorMessage = 'Solo se permiten archivos PDF';
        event.target.value = ''; // Limpiar el input
        this.selectedFile = null;
        this.documentFileName = '';
        this.documentFileSize = '';
        return;
      }
      
      // Validar tamaño máximo (20 MB)
      if (file.size > 20 * 1024 * 1024) {
        this.errorMessage = 'El archivo PDF no debe superar los 20 MB';
        event.target.value = '';
        this.selectedFile = null;
        this.documentFileName = '';
        this.documentFileSize = '';
        return;
      }
      
      this.selectedFile = file;
      this.documentFileName = file.name;
      this.documentFileSize = this.formatFileSize(file.size);
      this.errorMessage = ''; // Limpiar mensaje de error si había
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  submit(): void {
    if (this.entryForm.invalid) {
      this.errorMessage = 'Completa todos los campos requeridos';
      return;
    }
    if (this.details.length === 0) {
      this.errorMessage = 'Debes agregar al menos un producto';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    const raw = this.entryForm.value as any;
    const payload: any = {
      entryNumber: raw.entryNumber,
      entryDate: raw.entryDate,
      entryType: raw.entryType,
      supplier: raw.supplierId ? { id: raw.supplierId } : null,
      origin: raw.origin || null,
      receivedBy: raw.receivedBy,
      authorizedBy: raw.authorizedBy || null,
      notes: raw.notes || null,
      status: 'CONFIRMADO',
      details: this.details.map(d => ({
        variant: { id: d.variantId },
        quantity: d.quantity,
        unitCost: d.unitCost,
        taxPercentage: d.taxPercentage,
        taxAmount: d.taxAmount,
        totalCost: d.totalCost,
        lotNumber: d.lotNumber || null,
        manufacturingDate: d.manufacturingDate || null,
        expirationDate: d.expirationDate || null,
        warehouseLocation: d.warehouseLocation || null,
        itemCondition: d.itemCondition || 'NUEVO',
        notes: d.notes || null
      }))
    };

    this.entryService.create(this.ruc, payload).subscribe({
      next: (created) => {
        if (this.selectedFile) {
          this.uploadDocument(created.id!);
        } else {
          this.onSuccess();
        }
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          this.errorMessage = err?.error?.message || 'El número de documento ya existe. Por favor use un número único.';
        } else {
          this.errorMessage = err?.error?.message || 'Error al registrar la entrada';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  uploadDocument(entryId: number): void {
    if (!this.selectedFile) {
      this.onSuccess();
      return;
    }
    
    this.fileService.uploadFileToDirectory('inventory_entries', this.selectedFile).subscribe({
      next: () => this.onSuccess(),
      error: () => this.onSuccess() // Continuar aunque falle la subida de imagen
    });
  }

  onSuccess(): void {
    this.loading = false;
    this.successMessage = 'Entrada registrada exitosamente. Stock y costos actualizados.';
    setTimeout(() => {
      this.router.navigate([`/usuario/${this.ruc}/inventario/historial-entradas`]);
    }, 2000);
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/img/company-placeholder.svg';
    if (imagePath.startsWith('http')) return imagePath;
    return `/api/files/${imagePath}`;
  }
}
