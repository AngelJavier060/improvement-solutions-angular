import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';

type ProductKind = '' | 'EPP' | 'HERRAMIENTA' | 'PIEZA';

interface SearchRow {
  productId: number;
  productCode: string;
  productName: string;
  productKind: string;
  category: string;
  variantId: number;
  variantCode: string;
  sizeLabel: string;
  currentQty: number;
  minQty: number;
  status: string;
  image?: string;
}

@Component({
  selector: 'app-buscar-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="bp-page">
      <div class="bp-head">
        <div>
          <h1 class="bp-title"><i class="fas fa-search me-2"></i>Buscar Producto</h1>
          <p class="bp-sub">Localiza EPP, herramientas o piezas por código, nombre, talla o variante</p>
        </div>
        <button class="btn btn-outline-secondary btn-sm" (click)="reload()" [disabled]="loading">
          <i class="fas fa-sync-alt me-1" [class.fa-spin]="loading"></i>Actualizar
        </button>
      </div>

      <div class="bp-filters">
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
          <input type="text" class="form-control" [(ngModel)]="q" (ngModelChange)="applyFilter()"
                 placeholder="Código, nombre, variante, talla..." autofocus>
        </div>
        <select class="form-select" [(ngModel)]="kind" (change)="applyFilter()">
          <option value="">Todos los tipos</option>
          <option value="EPP">EPP</option>
          <option value="HERRAMIENTA">Herramientas</option>
          <option value="PIEZA">Piezas</option>
        </select>
        <div class="form-check ms-2">
          <input class="form-check-input" type="checkbox" id="onlyStock" [(ngModel)]="onlyWithStock" (change)="applyFilter()">
          <label class="form-check-label" for="onlyStock">Solo con stock</label>
        </div>
      </div>

      <div class="alert alert-danger" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="bp-card" *ngIf="loading">
        <div class="text-center text-muted py-5">
          <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
          <div>Cargando catálogo...</div>
        </div>
      </div>

      <div class="bp-card" *ngIf="!loading">
        <div class="bp-meta">
          Mostrando <strong>{{ filtered.length }}</strong> de <strong>{{ rows.length }}</strong> variantes
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:52px"></th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Variante</th>
                <th>Talla / ID</th>
                <th class="text-end">Stock</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of filtered">
                <td>
                  <img class="bp-thumb" [src]="imgUrl(r.image)" [alt]="r.productName">
                </td>
                <td>
                  <div class="fw-semibold">{{ r.productName }}</div>
                  <div class="small text-muted">{{ r.productCode }} · {{ r.category || '—' }}</div>
                </td>
                <td><span class="bp-kind" [attr.data-k]="r.productKind">{{ kindLabel(r.productKind) }}</span></td>
                <td><code>{{ r.variantCode }}</code></td>
                <td>{{ r.sizeLabel || '—' }}</td>
                <td class="text-end" [class.text-danger]="r.currentQty <= 0" [class.fw-bold]="r.currentQty <= (r.minQty || 0)">
                  {{ r.currentQty | number:'1.0-2' }}
                </td>
                <td class="text-end">
                  <a class="btn btn-sm btn-outline-primary"
                     [routerLink]="['/usuario', ruc, 'inventario', 'catalogo-productos']"
                     [queryParams]="{ q: r.productCode }"
                     title="Ir al catálogo">
                    <i class="fas fa-book"></i>
                  </a>
                  <a class="btn btn-sm btn-outline-secondary ms-1"
                     [routerLink]="['/usuario', ruc, 'inventario', 'stock-actual']"
                     [queryParams]="{ q: r.variantCode }"
                     title="Ver en stock">
                    <i class="fas fa-boxes"></i>
                  </a>
                </td>
              </tr>
              <tr *ngIf="!filtered.length">
                <td colspan="7" class="text-center text-muted py-4">Sin resultados para la búsqueda</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bp-page { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
    .bp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
    .bp-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 .25rem; color: #1a2332; }
    .bp-sub { margin: 0; color: #6b7280; font-size: .9rem; }
    .bp-filters { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-bottom: 1rem; }
    .bp-filters .input-group { flex: 1 1 280px; max-width: 480px; }
    .bp-filters .form-select { width: auto; min-width: 160px; }
    .bp-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); overflow: hidden; }
    .bp-meta { padding: .75rem 1rem; border-bottom: 1px solid #eef2f7; font-size: .85rem; color: #6b7280; }
    .bp-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 8px; background: #f3f4f6; }
    .bp-kind { display: inline-block; font-size: .7rem; font-weight: 700; text-transform: uppercase; padding: .2rem .45rem; border-radius: 6px; background: #eef2ff; color: #3730a3; }
    .bp-kind[data-k="HERRAMIENTA"] { background: #fff7ed; color: #9a3412; }
    .bp-kind[data-k="PIEZA"] { background: #ecfdf5; color: #065f46; }
  `]
})
export class BuscarProductoComponent implements OnInit {
  ruc = '';
  loading = false;
  errorMessage = '';
  q = '';
  kind: ProductKind = '';
  onlyWithStock = false;
  rows: SearchRow[] = [];
  filtered: SearchRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    const qp = this.route.snapshot.queryParamMap.get('q');
    if (qp) this.q = qp;
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMessage = '';
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const list = (products || []).filter(p => p.status !== 'INACTIVO' && p.status !== 'DESCONTINUADO');
        if (!list.length) {
          this.rows = [];
          this.applyFilter();
          this.loading = false;
          return;
        }
        const calls = list.map(p =>
          this.variantService.listByProduct(this.ruc, p.id!).pipe(catchError(() => of([] as InventoryVariant[])))
        );
        forkJoin(calls).subscribe({
          next: (variantsLists) => {
            const out: SearchRow[] = [];
            list.forEach((p, i) => {
              const variants = variantsLists[i] || [];
              if (!variants.length) {
                out.push(this.toRow(p, null));
                return;
              }
              variants.forEach(v => out.push(this.toRow(p, v)));
            });
            this.rows = out;
            this.applyFilter();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'No se pudieron cargar las variantes';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar el catálogo';
      }
    });
  }

  applyFilter(): void {
    const term = (this.q || '').trim().toLowerCase();
    this.filtered = this.rows.filter(r => {
      if (this.kind && r.productKind !== this.kind) return false;
      if (this.onlyWithStock && !(r.currentQty > 0)) return false;
      if (!term) return true;
      return (
        r.productName.toLowerCase().includes(term) ||
        r.productCode.toLowerCase().includes(term) ||
        r.variantCode.toLowerCase().includes(term) ||
        (r.sizeLabel || '').toLowerCase().includes(term) ||
        (r.category || '').toLowerCase().includes(term)
      );
    });
  }

  kindLabel(k: string): string {
    if (k === 'HERRAMIENTA') return 'Herramienta';
    if (k === 'PIEZA') return 'Pieza';
    return 'EPP';
  }

  imgUrl(path?: string): string {
    if (!path) return 'assets/img/company-placeholder.svg';
    if (path.startsWith('http') || path.startsWith('/api/files')) return path;
    return `/api/files/${path}`;
  }

  private toRow(p: InventoryProduct, v: InventoryVariant | null): SearchRow {
    return {
      productId: p.id!,
      productCode: p.code || '',
      productName: p.name || '',
      productKind: this.resolveKind(p),
      category: p.categoryRef?.name || p.category || '',
      variantId: v?.id || 0,
      variantCode: v?.code || '—',
      sizeLabel: v?.sizeLabel || '',
      currentQty: Number(v?.currentQty ?? 0),
      minQty: Number(v?.minQty ?? 0),
      status: p.status || 'ACTIVO',
      image: p.image || v?.image
    };
  }

  private resolveKind(p: InventoryProduct): string {
    const k = (p.productKind || '').toUpperCase();
    if (k === 'EPP' || k === 'HERRAMIENTA' || k === 'PIEZA') return k;
    const cat = (p.categoryRef?.name || p.category || '').toUpperCase();
    if (cat.includes('HERRAMIENT')) return 'HERRAMIENTA';
    if (cat.includes('PIEZA') || cat.includes('REPUESTO')) return 'PIEZA';
    return 'EPP';
  }
}
