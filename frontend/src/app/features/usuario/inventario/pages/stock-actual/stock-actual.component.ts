import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import { FileService } from '../../../../../services/file.service';

@Component({
  selector: 'app-stock-actual',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-boxes me-2 text-primary"></i>Stock Actual</h2>
            <div class="text-muted">Inventario disponible en tiempo real</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="reload()" [disabled]="loading">
              <i class="fas fa-sync-alt me-2" [class.fa-spin]="loading"></i>Actualizar
            </button>
          </div>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-search"></i></span>
            <input type="text" class="form-control" [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Buscar por producto, variante, código, talla">
          </div>
        </div>
        <div class="col-md-3">
          <select class="form-select" [(ngModel)]="selectedCategory" (change)="applyFilters()">
            <option [ngValue]="''">Todas las categorías</option>
            <option *ngFor="let c of categories" [ngValue]="c.name">{{ c.name }}</option>
          </select>
        </div>
        <div class="col-md-3 d-flex align-items-center">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" [(ngModel)]="onlyUnderMin" (change)="applyFilters()" id="underMinChk">
            <label class="form-check-label" for="underMinChk">Solo por debajo del mínimo</label>
          </div>
        </div>
        <div class="col-md-2">
          <select class="form-select" [(ngModel)]="pageSize" (change)="goToPage(1)">
            <option [ngValue]="10">10</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option>
          </select>
        </div>
      </div>

      <div class="row" *ngIf="errorMessage">
        <div class="col-12">
          <div class="alert alert-danger alert-dismissible fade show">
            <i class="fas fa-exclamation-circle me-2"></i>{{ errorMessage }}
            <button type="button" class="btn-close" (click)="errorMessage = ''"></button>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:60px"></th>
                  <th (click)="setSort('productName')" role="button">Producto</th>
                  <th (click)="setSort('variantCode')" role="button" style="width:160px">Variante</th>
                  <th (click)="setSort('sizeLabel')" role="button" style="width:100px">Talla</th>
                  <th (click)="setSort('currentQty')" role="button" class="text-end" style="width:120px">Stock</th>
                  <th style="width:120px" class="text-end">Mínimo</th>
                  <th style="width:160px">Ubicación</th>
                  <th style="width:160px">Categoría</th>
                  <th style="width:130px"></th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let r of visibleRecords">
                  <tr>
                    <td>
                      <img [src]="getImageUrl(r.productImage)" alt="img" class="rounded" style="width:40px;height:40px;object-fit:cover;">
                    </td>
                    <td>
                      <div class="fw-semibold">{{ r.productName }}</div>
                      <div class="text-muted small">{{ r.productCode }}</div>
                    </td>
                    <td>
                      <div class="fw-semibold">{{ r.variantCode }}</div>
                    </td>
                    <td>{{ r.sizeLabel || '—' }}</td>
                    <td class="text-end" [class.text-danger]="isUnderMin(r)">{{ r.currentQty | number:'1.0-2' }}</td>
                    <td class="text-end">{{ r.minQty ?? 0 }}</td>
                    <td>{{ r.location || '—' }}</td>
                    <td>{{ r.category || '—' }}</td>
                    <td class="text-end">
                      <button class="btn btn-outline-primary btn-sm" (click)="toggleLots(r)"><i class="fas fa-layer-group me-1"></i>Lotes</button>
                    </td>
                  </tr>
                  <tr *ngIf="expanded[r.variantId]">
                    <td colspan="9" class="p-0">
                      <div class="bg-light p-3">
                        <div class="fw-semibold mb-2">Lotes disponibles</div>
                        <div *ngIf="!lotOptions[r.variantId]?.length" class="text-muted small">Sin lotes</div>
                        <div class="table-responsive" *ngIf="lotOptions[r.variantId]?.length">
                          <table class="table table-sm">
                            <thead>
                              <tr>
                                <th style="width:160px">Lote</th>
                                <th style="width:140px">Fabricación</th>
                                <th style="width:140px">Expira</th>
                                <th style="width:120px">Ubicación</th>
                                <th class="text-end" style="width:120px">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr *ngFor="let l of lotOptions[r.variantId]">
                                <td>{{ l.lotNumber }}</td>
                                <td>{{ l.manufacturingDate || '—' }}</td>
                                <td>{{ l.expirationDate || '—' }}</td>
                                <td>{{ l.warehouseLocation || '—' }}</td>
                                <td class="text-end">{{ l.currentQty }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>
                <tr *ngIf="!loading && visibleRecords.length === 0">
                  <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <div>No hay resultados</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div class="text-muted">Mostrando {{ startIndex + 1 }} - {{ endIndex }} de {{ totalRecords }}</div>
          <div class="btn-group">
            <button class="btn btn-outline-secondary btn-sm" (click)="prevPage()" [disabled]="pageIndex === 1">Anterior</button>
            <button class="btn btn-outline-secondary btn-sm" (click)="nextPage()" [disabled]="pageIndex * pageSize >= totalRecords">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    th[role="button"] { cursor: pointer; }
  `]
})
export class StockActualComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  categories: InventoryCategory[] = [];
  selectedCategory: string = '';
  searchTerm: string = '';
  onlyUnderMin = false;
  pageSize = 10;
  pageIndex = 1;
  totalRecords = 0;
  startIndex = 0;
  endIndex = 0;
  sortKey: 'productName' | 'variantCode' | 'sizeLabel' | 'currentQty' = 'productName';
  sortDir: 'asc' | 'desc' = 'asc';

  records: Array<{
    productId: number;
    productName: string;
    productCode: string;
    productImage?: string;
    category?: string;
    variantId: number;
    variantCode: string;
    sizeLabel?: string;
    currentQty: number;
    minQty?: number;
    location?: string;
  }> = [];
  filteredRecords: typeof this.records = [];
  visibleRecords: typeof this.records = [];
  expanded: { [variantId: number]: boolean } = {};
  lotOptions: { [variantId: number]: InventoryLotDto[] } = {};

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private lotService: InventoryLotService,
    private categoryService: InventoryCategoryService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    this.categories = [];
    this.records = [];
    this.filteredRecords = [];
    this.visibleRecords = [];
    forkJoin({
      products: this.productService.list(this.ruc),
      categories: this.categoryService.list(this.ruc)
    }).subscribe({
      next: (res) => {
        this.categories = res.categories || [];
        const products = res.products || [];
        if (!products.length) {
          this.loading = false;
          this.applyFilters();
          return;
        }
        const calls = products.map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(calls.length ? calls : [of([] as InventoryVariant[])]).subscribe({
          next: (variantsLists) => {
            const list = Array.isArray(variantsLists) ? variantsLists : [];
            let idx = 0;
            for (const p of products) {
              const variants = (list[idx] || []) as InventoryVariant[];
              idx++;
              for (const v of variants) {
                this.records.push({
                  productId: p.id!,
                  productName: p.name,
                  productCode: p.code,
                  productImage: p.image,
                  category: p.category,
                  variantId: v.id!,
                  variantCode: v.code,
                  sizeLabel: v.sizeLabel,
                  currentQty: Number(v.currentQty || 0),
                  minQty: (v.minQty != null ? v.minQty : (p.minStock != null ? p.minStock : undefined)) as any,
                  location: v.location
                });
              }
            }
            this.loading = false;
            this.applyFilters();
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'No se pudo cargar el inventario';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar el inventario';
      }
    });
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').toLowerCase();
    let arr = this.records.slice();
    if (this.selectedCategory) arr = arr.filter(r => (r.category || '').toLowerCase() === this.selectedCategory.toLowerCase());
    if (term) arr = arr.filter(r => (
      (r.productName || '').toLowerCase().includes(term) ||
      (r.productCode || '').toLowerCase().includes(term) ||
      (r.variantCode || '').toLowerCase().includes(term) ||
      (r.sizeLabel || '').toLowerCase().includes(term)
    ));
    if (this.onlyUnderMin) arr = arr.filter(r => this.isUnderMin(r));
    this.filteredRecords = this.sortRecords(arr);
    this.goToPage(1);
  }

  sortRecords(arr: typeof this.records): typeof this.records {
    const key = this.sortKey;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      const av = (a as any)[key] ?? '';
      const bv = (b as any)[key] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  setSort(key: 'productName' | 'variantCode' | 'sizeLabel' | 'currentQty'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.filteredRecords = this.sortRecords(this.filteredRecords.slice());
    this.goToPage(this.pageIndex);
  }

  goToPage(page: number): void {
    this.pageIndex = page;
    this.totalRecords = this.filteredRecords.length;
    this.startIndex = (this.pageIndex - 1) * this.pageSize;
    let end = this.startIndex + this.pageSize;
    if (end > this.totalRecords) end = this.totalRecords;
    this.endIndex = end;
    this.visibleRecords = this.filteredRecords.slice(this.startIndex, this.endIndex);
  }

  prevPage(): void { if (this.pageIndex > 1) this.goToPage(this.pageIndex - 1); }
  nextPage(): void { if (this.pageIndex * this.pageSize < this.totalRecords) this.goToPage(this.pageIndex + 1); }

  isUnderMin(r: { currentQty: number; minQty?: number }): boolean {
    const m = Number(r.minQty || 0);
    if (!m) return false;
    return Number(r.currentQty || 0) < m;
  }

  toggleLots(r: { variantId: number }): void {
    const id = r.variantId;
    this.expanded[id] = !this.expanded[id];
    if (this.expanded[id] && !this.lotOptions[id]) {
      this.lotService.listAvailable(this.ruc, id).subscribe({
        next: (lots) => this.lotOptions[id] = lots || [],
        error: () => this.lotOptions[id] = []
      });
    }
  }

  getImageUrl(imagePath?: string): string {
    if (!imagePath) return 'assets/img/company-placeholder.svg';
    if (imagePath.startsWith('http')) return imagePath;
    return this.fileService.getFileUrl(imagePath);
  }
}
