import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import {
  InventoryVariantAttributeService,
  VariantAttribute
} from '../../../../../services/inventory-variant-attribute.service';
import { FileService } from '../../../../../services/file.service';

interface StockVariantRow {
  variantId: number;
  variantCode: string;
  sizeLabel?: string;
  currentQty: number;
  minQty?: number;
  location?: string;
  brand?: string;
  attrsLabel?: string;
}

interface StockProductGroup {
  productId: number;
  productName: string;
  productCode: string;
  productImage?: string;
  category?: string;
  totalQty: number;
  variantCount: number;
  underMin: boolean;
  variants: StockVariantRow[];
}

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
            <div class="text-muted">Un renglón por producto · total en bodega · detalle por marca/talla al expandir</div>
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
            <input type="text" class="form-control" [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()"
              placeholder="Buscar por producto, código, marca, talla">
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
            <table class="table align-middle mb-0 stock-table">
              <thead class="table-light">
                <tr>
                  <th style="width:44px"></th>
                  <th style="width:60px"></th>
                  <th (click)="setSort('productName')" role="button">Producto</th>
                  <th style="width:140px">Categoría</th>
                  <th style="width:110px" class="text-center">Variantes</th>
                  <th (click)="setSort('totalQty')" role="button" class="text-end" style="width:130px">Stock total</th>
                  <th style="width:120px"></th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let g of visibleGroups">
                  <tr class="stock-product-row" [class.stock-product-row--open]="expandedProducts[g.productId]" (click)="toggleProduct(g)">
                    <td class="text-center">
                      <i class="fas" [class.fa-chevron-right]="!expandedProducts[g.productId]" [class.fa-chevron-down]="expandedProducts[g.productId]"></i>
                    </td>
                    <td>
                      <img [src]="getImageUrl(g.productImage)" alt="img" class="rounded" style="width:40px;height:40px;object-fit:cover;">
                    </td>
                    <td>
                      <div class="fw-semibold">{{ g.productName }}</div>
                      <div class="text-muted small">{{ g.productCode }}</div>
                    </td>
                    <td>{{ g.category || '—' }}</td>
                    <td class="text-center">
                      <span class="badge text-bg-light border">{{ g.variantCount }}</span>
                    </td>
                    <td class="text-end fw-bold" [class.text-danger]="g.underMin">
                      {{ g.totalQty | number:'1.0-2' }}
                    </td>
                    <td class="text-end" (click)="$event.stopPropagation()">
                      <button type="button" class="btn btn-outline-primary btn-sm" (click)="toggleProduct(g)">
                        <i class="fas fa-list me-1"></i>
                        {{ expandedProducts[g.productId] ? 'Ocultar' : 'Detalle' }}
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="expandedProducts[g.productId]" class="stock-detail-row">
                    <td colspan="7" class="p-0">
                      <div class="stock-detail">
                        <div class="fw-semibold mb-2 small text-muted text-uppercase">
                          Detalle por marca / talla · total producto: {{ g.totalQty | number:'1.0-2' }}
                        </div>
                        <div class="table-responsive">
                          <table class="table table-sm mb-0">
                            <thead>
                              <tr>
                                <th>Código variante</th>
                                <th>Marca</th>
                                <th>Talla</th>
                                <th class="text-end">Stock</th>
                                <th class="text-end">Mínimo</th>
                                <th>Ubicación</th>
                                <th style="width:110px"></th>
                              </tr>
                            </thead>
                            <tbody>
                              <ng-container *ngFor="let v of g.variants">
                                <tr>
                                  <td><code>{{ v.variantCode }}</code></td>
                                  <td>
                                    <span *ngIf="v.brand" class="badge text-bg-info-subtle border">{{ v.brand }}</span>
                                    <span *ngIf="!v.brand && attrsLoading[g.productId]" class="text-muted small">…</span>
                                    <span *ngIf="!v.brand && !attrsLoading[g.productId]">—</span>
                                    <div *ngIf="v.attrsLabel" class="text-muted small">{{ v.attrsLabel }}</div>
                                  </td>
                                  <td>{{ v.sizeLabel || '—' }}</td>
                                  <td class="text-end" [class.text-danger]="isUnderMin(v)">{{ v.currentQty | number:'1.0-2' }}</td>
                                  <td class="text-end">{{ v.minQty ?? 0 }}</td>
                                  <td>{{ v.location || '—' }}</td>
                                  <td class="text-end">
                                    <button type="button" class="btn btn-outline-secondary btn-sm" (click)="toggleLots(v)">
                                      <i class="fas fa-layer-group me-1"></i>Lotes
                                    </button>
                                  </td>
                                </tr>
                                <tr *ngIf="expandedLots[v.variantId]">
                                  <td colspan="7" class="bg-white">
                                    <div class="px-2 py-2">
                                      <div class="fw-semibold mb-1 small">Lotes — {{ v.variantCode }}</div>
                                      <div *ngIf="!lotOptions[v.variantId]?.length" class="text-muted small">Sin lotes</div>
                                      <table class="table table-sm mb-0" *ngIf="lotOptions[v.variantId]?.length">
                                        <thead>
                                          <tr>
                                            <th>Lote</th>
                                            <th>Fabricación</th>
                                            <th>Expira</th>
                                            <th>Ubicación</th>
                                            <th class="text-end">Cantidad</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr *ngFor="let l of lotOptions[v.variantId]">
                                            <td>{{ l.lotNumber }}</td>
                                            <td>{{ l.manufacturingDate || '—' }}</td>
                                            <td>{{ l.expirationDate || '—' }}</td>
                                            <td>{{ l.warehouseLocation || '—' }}</td>
                                            <td class="text-end">{{ l.currentQty }}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </ng-container>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </ng-container>

                <tr *ngIf="!loading && visibleGroups.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <div>No hay resultados</div>
                  </td>
                </tr>
                <tr *ngIf="loading">
                  <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-spinner fa-spin me-2"></i>Cargando inventario…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div class="text-muted">Mostrando {{ startIndex + 1 }} - {{ endIndex }} de {{ totalRecords }} productos</div>
          <div class="btn-group">
            <button class="btn btn-outline-secondary btn-sm" (click)="prevPage()" [disabled]="pageIndex === 1">Anterior</button>
            <button class="btn btn-outline-secondary btn-sm" (click)="nextPage()" [disabled]="pageIndex * pageSize >= totalRecords">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    th[role="button"] { cursor: pointer; user-select: none; }
    .stock-product-row { cursor: pointer; }
    .stock-product-row:hover { background: #f8fafc; }
    .stock-product-row--open { background: #f1f5f9; }
    .stock-detail {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding: .85rem 1rem 1rem 3.25rem;
    }
    .text-bg-info-subtle {
      background: #e0f2fe;
      color: #0369a1;
    }
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
  sortKey: 'productName' | 'totalQty' = 'productName';
  sortDir: 'asc' | 'desc' = 'asc';

  groups: StockProductGroup[] = [];
  filteredGroups: StockProductGroup[] = [];
  visibleGroups: StockProductGroup[] = [];

  expandedProducts: { [productId: number]: boolean } = {};
  expandedLots: { [variantId: number]: boolean } = {};
  lotOptions: { [variantId: number]: InventoryLotDto[] } = {};
  attrsLoading: { [productId: number]: boolean } = {};
  attrsLoaded: { [productId: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private lotService: InventoryLotService,
    private categoryService: InventoryCategoryService,
    private attrService: InventoryVariantAttributeService,
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
    this.groups = [];
    this.filteredGroups = [];
    this.visibleGroups = [];
    this.expandedProducts = {};
    this.expandedLots = {};
    this.attrsLoaded = {};
    this.attrsLoading = {};

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
        const calls = products.map(p =>
          this.variantService.listByProduct(this.ruc, p.id!).pipe(catchError(() => of([] as InventoryVariant[])))
        );
        forkJoin(calls).subscribe({
          next: (variantsLists) => {
            const list = Array.isArray(variantsLists) ? variantsLists : [];
            let idx = 0;
            for (const p of products) {
              const variants = (list[idx] || []) as InventoryVariant[];
              idx++;
              const rows: StockVariantRow[] = (variants || [])
                .filter(v => !!v?.id)
                .map(v => ({
                  variantId: v.id!,
                  variantCode: v.code,
                  sizeLabel: v.sizeLabel,
                  currentQty: Number(v.currentQty || 0),
                  minQty: v.minQty != null ? Number(v.minQty) : undefined,
                  location: v.location
                }));
              if (!rows.length) continue;
              const totalQty = rows.reduce((acc, v) => acc + Number(v.currentQty || 0), 0);
              const underMin = rows.some(v => this.isUnderMin(v));
              this.groups.push({
                productId: p.id!,
                productName: p.name,
                productCode: p.code,
                productImage: p.image,
                category: p.category,
                totalQty,
                variantCount: rows.length,
                underMin,
                variants: rows
              });
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
    const term = (this.searchTerm || '').toLowerCase().trim();
    let arr = this.groups.slice();
    if (this.selectedCategory) {
      arr = arr.filter(g => (g.category || '').toLowerCase() === this.selectedCategory.toLowerCase());
    }
    if (term) {
      arr = arr.filter(g => {
        if ((g.productName || '').toLowerCase().includes(term)) return true;
        if ((g.productCode || '').toLowerCase().includes(term)) return true;
        return g.variants.some(v =>
          (v.variantCode || '').toLowerCase().includes(term) ||
          (v.sizeLabel || '').toLowerCase().includes(term) ||
          (v.brand || '').toLowerCase().includes(term) ||
          (v.attrsLabel || '').toLowerCase().includes(term)
        );
      });
    }
    if (this.onlyUnderMin) arr = arr.filter(g => g.underMin);
    this.filteredGroups = this.sortGroups(arr);
    this.goToPage(1);
  }

  sortGroups(arr: StockProductGroup[]): StockProductGroup[] {
    const key = this.sortKey;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      if (key === 'totalQty') return (a.totalQty - b.totalQty) * dir;
      return String(a.productName || '').localeCompare(String(b.productName || '')) * dir;
    });
  }

  setSort(key: 'productName' | 'totalQty'): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.filteredGroups = this.sortGroups(this.filteredGroups.slice());
    this.goToPage(this.pageIndex);
  }

  goToPage(page: number): void {
    this.pageIndex = page;
    this.totalRecords = this.filteredGroups.length;
    this.startIndex = (this.pageIndex - 1) * this.pageSize;
    let end = this.startIndex + this.pageSize;
    if (end > this.totalRecords) end = this.totalRecords;
    this.endIndex = end;
    this.visibleGroups = this.filteredGroups.slice(this.startIndex, this.endIndex);
  }

  prevPage(): void { if (this.pageIndex > 1) this.goToPage(this.pageIndex - 1); }
  nextPage(): void { if (this.pageIndex * this.pageSize < this.totalRecords) this.goToPage(this.pageIndex + 1); }

  isUnderMin(v: { currentQty: number; minQty?: number }): boolean {
    const m = Number(v.minQty || 0);
    if (!m) return false;
    return Number(v.currentQty || 0) < m;
  }

  toggleProduct(g: StockProductGroup): void {
    const id = g.productId;
    this.expandedProducts[id] = !this.expandedProducts[id];
    if (this.expandedProducts[id] && !this.attrsLoaded[id]) {
      this.loadVariantAttrs(g);
    }
  }

  private loadVariantAttrs(g: StockProductGroup): void {
    this.attrsLoading[g.productId] = true;
    const calls = g.variants.map(v =>
      this.attrService.list(this.ruc, v.variantId).pipe(catchError(() => of([] as VariantAttribute[])))
    );
    forkJoin(calls.length ? calls : [of([] as VariantAttribute[])]).subscribe({
      next: (lists) => {
        g.variants.forEach((v, i) => {
          const attrs = lists[i] || [];
          const brandAttr = attrs.find(a => (a.attributeName || '').toLowerCase() === 'marca');
          v.brand = brandAttr?.attributeValue || '';
          const extras = attrs
            .filter(a => (a.attributeName || '').toLowerCase() !== 'marca')
            .map(a => `${a.attributeName}: ${a.attributeValue}`);
          v.attrsLabel = extras.join(' · ');
        });
        this.attrsLoading[g.productId] = false;
        this.attrsLoaded[g.productId] = true;
      },
      error: () => {
        this.attrsLoading[g.productId] = false;
        this.attrsLoaded[g.productId] = true;
      }
    });
  }

  toggleLots(v: StockVariantRow): void {
    const id = v.variantId;
    this.expandedLots[id] = !this.expandedLots[id];
    if (this.expandedLots[id] && !this.lotOptions[id]) {
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
