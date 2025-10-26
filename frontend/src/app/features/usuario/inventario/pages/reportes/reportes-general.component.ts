import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryEntryService } from '../../../../../services/inventory-entry.service';
import { InventoryOutputService } from '../../../../../services/inventory-output.service';

@Component({
  selector: 'app-reportes-general',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-chart-line me-2"></i>Reportes Generales</h2>
            <div class="text-muted">Resumen valorizado, movimientos y préstamos</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="reload()" [disabled]="loading"><i class="fas fa-sync-alt me-2" [class.fa-spin]="loading"></i>Actualizar</button>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light"><div class="fw-semibold">Inventario Valorizado</div></div>
            <div class="card-body">
              <div class="display-6">$ {{ inventoryValueTotal | number:'1.2-2' }}</div>
              <div class="text-muted">Variantes: {{ variantsCount }}</div>
              <div class="text-muted">Bajo stock: {{ lowStockCount }}</div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light"><div class="fw-semibold">Movimientos del día</div></div>
            <div class="card-body">
              <div><strong>Entradas:</strong> {{ todayEntriesQty }}</div>
              <div><strong>Salidas:</strong> {{ todayOutputsQty }}</div>
              <div class="mt-2 small text-muted">Del {{ todayStr }}</div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light"><div class="fw-semibold">Préstamos</div></div>
            <div class="card-body">
              <div><strong>Activos:</strong> {{ loansActive }}</div>
              <div><strong>Por vencer (<=3 días):</strong> {{ loansDueSoon }}</div>
              <div><strong>Vencidos:</strong> {{ loansOverdue }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Movimientos del mes</div></div>
            <div class="card-body">
              <div><strong>Entradas:</strong> {{ monthEntriesQty }}</div>
              <div><strong>Salidas:</strong> {{ monthOutputsQty }}</div>
              <div class="mt-2 small text-muted">Desde {{ monthStart }} a {{ todayStr }}</div>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Stock bajo (Top 10)</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light"><tr><th>Variante</th><th class="text-end">Stock</th><th class="text-end">Mín.</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let v of lowStockTop">
                      <td>{{ v.code }}</td>
                      <td class="text-end">{{ v.currentQty || 0 }}</td>
                      <td class="text-end">{{ v.minQty || 0 }}</td>
                    </tr>
                    <tr *ngIf="!lowStockTop.length"><td colspan="3" class="text-center text-muted py-2">Sin alertas</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
  `]
})
export class ReportesGeneralComponent implements OnInit {
  ruc: string = '';
  loading = false;
  variantsCount = 0;
  inventoryValueTotal = 0;
  lowStockCount = 0;
  lowStockTop: InventoryVariant[] = [];

  todayStr = new Date().toISOString().slice(0,10);
  monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  todayEntriesQty = 0;
  todayOutputsQty = 0;
  monthEntriesQty = 0;
  monthOutputsQty = 0;

  loansActive = 0;
  loansDueSoon = 0;
  loansOverdue = 0;

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private entryService: InventoryEntryService,
    private outputService: InventoryOutputService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; this.reload(); }

  reload(): void {
    this.loading = true;
    // Inventory valuation and low stock
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const calls = (products || []).map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(calls).subscribe({
          next: (lists) => {
            const variants: InventoryVariant[] = ([] as InventoryVariant[]).concat(...(lists || [])).filter(Boolean);
            this.variantsCount = variants.length;
            this.inventoryValueTotal = variants.reduce((acc, v) => acc + ((v.currentQty || 0) * (v.unitCost || 0)), 0);
            const low = variants.filter(v => (v.minQty ?? 0) > 0 && (v.currentQty ?? 0) < (v.minQty ?? 0));
            this.lowStockCount = low.length;
            this.lowStockTop = low.slice(0, 10);
          },
          error: () => {}
        });
      },
      error: () => {}
    });

    // Movements today and this month
    this.entryService.searchByDateRange(this.ruc, this.todayStr, this.todayStr).subscribe({
      next: (es) => { this.todayEntriesQty = sumDetailsQty(es as any); },
      error: () => { this.todayEntriesQty = 0; }
    });
    this.outputService.searchByDateRange(this.ruc, this.todayStr, this.todayStr).subscribe({
      next: (os) => { this.todayOutputsQty = sumDetailsQty(os as any); },
      error: () => { this.todayOutputsQty = 0; }
    });
    this.entryService.searchByDateRange(this.ruc, this.monthStart, this.todayStr).subscribe({
      next: (es) => { this.monthEntriesQty = sumDetailsQty(es as any); },
      error: () => { this.monthEntriesQty = 0; }
    });
    this.outputService.searchByDateRange(this.ruc, this.monthStart, this.todayStr).subscribe({
      next: (os) => { this.monthOutputsQty = sumDetailsQty(os as any); },
      error: () => { this.monthOutputsQty = 0; }
    });

    // Loans summary
    this.outputService.findByType(this.ruc, 'PRESTAMO').subscribe({
      next: (outs) => {
        const today = new Date(this.todayStr);
        let active = 0, dueSoon = 0, overdue = 0;
        for (const o of (outs || [])) {
          const dt = o.returnDate ? new Date(o.returnDate) : null;
          if (!dt) continue;
          const diff = Math.floor((dt.getTime() - today.getTime())/(1000*60*60*24));
          if (diff < 0) overdue++;
          else if (diff <= 3) dueSoon++;
          active++;
        }
        this.loansActive = active; this.loansDueSoon = dueSoon; this.loansOverdue = overdue;
        this.loading = false;
      },
      error: () => { this.loansActive = this.loansDueSoon = this.loansOverdue = 0; this.loading = false; }
    });
  }
}

function sumDetailsQty(arr: any[]): number { let s = 0; for (const it of (arr || [])) { const ds = Array.isArray(it.details) ? it.details : []; for (const d of ds) s += Number(d.quantity||0); } return s; }
