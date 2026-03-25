import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface FinancialRow {
  productName: string;
  variantCode: string;
  currentQty: number;
  unitCost: number;
  salePrice: number;
  stockValue: number;
  margin: number;
  marginPct: number;
}

@Component({
  selector: 'app-reportes-financiero',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="page-container">
      <div class="page-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1><i class="fas fa-dollar-sign me-2 text-success"></i> Reporte Financiero de Inventario</h1>
          <p class="text-muted mb-0">Valor del inventario, márgenes y análisis de ventas por variante</p>
        </div>
        <button class="btn btn-outline-secondary btn-sm" (click)="loadData()" [disabled]="loading">
          <i class="fas fa-sync-alt me-1" [class.fa-spin]="loading"></i> Actualizar
        </button>
      </div>

      <div class="alert alert-danger mt-3" *ngIf="errorMessage">
        <i class="fas fa-exclamation-circle me-2"></i>{{ errorMessage }}
      </div>

      <!-- KPI Cards -->
      <div class="row g-3 mt-2">
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <div class="text-muted small">Valor Total del Inventario</div>
              <div class="fs-4 fw-bold text-primary">\${{ totalStockValue | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <div class="text-muted small">Variantes Activas</div>
              <div class="fs-4 fw-bold text-secondary">{{ rows.length }}</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <div class="text-muted small">Margen Estimado Promedio</div>
              <div class="fs-4 fw-bold text-success">{{ avgMarginPct | number:'1.1-1' }}%</div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card shadow-sm text-center">
            <div class="card-body">
              <div class="text-muted small">Ventas Confirmadas</div>
              <div class="fs-4 fw-bold text-warning">\${{ totalSales | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="row mt-3 mb-2">
        <div class="col-md-4">
          <input type="text" class="form-control form-control-sm" [(ngModel)]="searchTerm" placeholder="Buscar por producto o código...">
        </div>
      </div>

      <!-- Table -->
      <div class="card shadow-sm mt-2">
        <div class="card-header bg-light fw-semibold">Valorización por Variante</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Producto</th>
                  <th>Código Variante</th>
                  <th class="text-end">Stock Actual</th>
                  <th class="text-end">Costo Unitario</th>
                  <th class="text-end">Precio Venta</th>
                  <th class="text-end">Valor en Inventario</th>
                  <th class="text-end">Margen Est.</th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngIf="!loading">
                  <tr *ngFor="let row of getFilteredRows()">
                    <td>{{ row.productName }}</td>
                    <td><code>{{ row.variantCode }}</code></td>
                    <td class="text-end">{{ row.currentQty | number:'1.0-2' }}</td>
                    <td class="text-end">\${{ row.unitCost | number:'1.2-2' }}</td>
                    <td class="text-end">\${{ row.salePrice | number:'1.2-2' }}</td>
                    <td class="text-end fw-bold">\${{ row.stockValue | number:'1.2-2' }}</td>
                    <td class="text-end" [class.text-success]="row.marginPct > 0" [class.text-danger]="row.marginPct < 0">
                      {{ row.marginPct | number:'1.1-1' }}%
                    </td>
                  </tr>
                  <tr *ngIf="!getFilteredRows().length">
                    <td colspan="7" class="text-center text-muted py-4">No hay datos disponibles</td>
                  </tr>
                </ng-container>
                <tr *ngIf="loading">
                  <td colspan="7" class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Cargando...</td>
                </tr>
              </tbody>
              <tfoot class="table-light fw-bold" *ngIf="rows.length">
                <tr>
                  <td colspan="5" class="text-end">TOTAL:</td>
                  <td class="text-end">\${{ totalStockValue | number:'1.2-2' }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Sales summary -->
      <div class="card shadow-sm mt-3" *ngIf="salesOutputs.length">
        <div class="card-header bg-light fw-semibold">Historial de Ventas Confirmadas</div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>N° Salida</th>
                  <th>Fecha</th>
                  <th>Notas</th>
                  <th class="text-end">Total Costo</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let sale of salesOutputs">
                  <td><code>{{ sale.outputNumber }}</code></td>
                  <td>{{ sale.outputDate }}</td>
                  <td>{{ sale.notes || '—' }}</td>
                  <td class="text-end">\${{ getSaleTotalCost(sale) | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`.page-container { max-width: 1400px; margin: 0 auto; padding: 20px; } .page-header h1 { font-size: 24px; font-weight: 600; color: #2c3e50; margin: 0 0 4px 0; display: flex; align-items: center; }`]
})
export class ReportesFinancieroComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  searchTerm = '';
  rows: FinancialRow[] = [];
  salesOutputs: InventoryOutput[] = [];

  get totalStockValue(): number {
    return this.rows.reduce((sum, r) => sum + r.stockValue, 0);
  }

  get avgMarginPct(): number {
    if (!this.rows.length) return 0;
    const withPrice = this.rows.filter(r => r.salePrice > 0);
    if (!withPrice.length) return 0;
    return withPrice.reduce((sum, r) => sum + r.marginPct, 0) / withPrice.length;
  }

  get totalSales(): number {
    return this.salesOutputs.reduce((sum, o) => sum + this.getSaleTotalCost(o), 0);
  }

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private outputService: InventoryOutputService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.productService.list(this.ruc).pipe(catchError(() => of([]))).subscribe(products => {
      if (!products.length) { this.loading = false; return; }
      const variantCalls = products.map(p => this.variantService.listByProduct(this.ruc, p.id!).pipe(catchError(() => of([]))));
      forkJoin(variantCalls).subscribe(variantLists => {
        const rows: FinancialRow[] = [];
        products.forEach((p, idx) => {
          const variants: any[] = variantLists[idx] || [];
          variants.forEach((v: any) => {
            const qty = parseFloat(v.currentQty) || 0;
            const cost = parseFloat(v.unitCost) || 0;
            const price = parseFloat(v.salePrice) || 0;
            const stockValue = qty * cost;
            const margin = price - cost;
            const marginPct = cost > 0 ? (margin / cost) * 100 : 0;
            rows.push({
              productName: p.name,
              variantCode: v.code,
              currentQty: qty,
              unitCost: cost,
              salePrice: price,
              stockValue,
              margin,
              marginPct
            });
          });
        });
        this.rows = rows.sort((a, b) => b.stockValue - a.stockValue);
        this.loading = false;
      });
    });

    // Load sales
    this.outputService.findByType(this.ruc, 'VENTA').pipe(catchError(() => of([]))).subscribe(outs => {
      this.salesOutputs = (outs || []).filter(o => o.status === 'CONFIRMADO');
    });
  }

  getFilteredRows(): FinancialRow[] {
    if (!this.searchTerm) return this.rows;
    const q = this.searchTerm.toLowerCase();
    return this.rows.filter(r => r.productName.toLowerCase().includes(q) || r.variantCode.toLowerCase().includes(q));
  }

  getSaleTotalCost(sale: InventoryOutput): number {
    return (sale.details || []).reduce((sum: number, d: any) => sum + (parseFloat(d.totalCost) || 0), 0);
  }
}
