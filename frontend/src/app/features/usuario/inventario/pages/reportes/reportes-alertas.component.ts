import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { InventoryOutputService } from '../../../../../services/inventory-output.service';

@Component({
  selector: 'app-reportes-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-exclamation-triangle me-2 text-danger"></i>Alertas</h2>
            <div class="text-muted">Stock mínimo, préstamos vencidos y productos por vencer</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="loadAlerts()" [disabled]="loading"><i class="fas fa-sync-alt me-2" [class.fa-spin]="loading"></i>Actualizar</button>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <div class="fw-semibold">Stock bajo</div>
              <span class="badge bg-danger">{{ lowStock.length }}</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr><th>Variante</th><th class="text-end" style="width:90px">Stock</th><th class="text-end" style="width:90px">Mín.</th></tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let v of lowStock"><td>{{ v.code }}</td><td class="text-end">{{ v.currentQty || 0 }}</td><td class="text-end">{{ v.minQty || 0 }}</td></tr>
                    <tr *ngIf="!lowStock.length"><td colspan="3" class="text-center text-muted py-2">Sin alertas</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <div class="fw-semibold">Préstamos vencidos/por vencer</div>
              <span class="badge bg-warning text-dark">{{ overdueLoans.length + dueSoonLoans.length }}</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light"><tr><th>Variante</th><th>Debe devolver</th><th class="text-end">Estado</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let p of overdueLoans"><td>{{ p.detailVariantCode || p.variantCode }}</td><td>{{ p.returnDate }}</td><td class="text-end"><span class="badge bg-danger">Vencido</span></td></tr>
                    <tr *ngFor="let p of dueSoonLoans"><td>{{ p.detailVariantCode || p.variantCode }}</td><td>{{ p.returnDate }}</td><td class="text-end"><span class="badge bg-warning text-dark">Por vencer</span></td></tr>
                    <tr *ngIf="!(overdueLoans.length + dueSoonLoans.length)"><td colspan="3" class="text-center text-muted py-2">Sin alertas</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
              <div class="fw-semibold">Productos por vencer (30 días)</div>
              <span class="badge bg-secondary">{{ expiringLots.length }}</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light"><tr><th>Lote</th><th>Variante</th><th>Vence</th><th class="text-end">Cant.</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let l of expiringLots"><td>{{ l.lotNumber }}</td><td>{{ l.variantCode }}</td><td>{{ l.expirationDate | date:'yyyy-MM-dd' }}</td><td class="text-end">{{ l.currentQty }}</td></tr>
                    <tr *ngIf="!expiringLots.length"><td colspan="4" class="text-center text-muted py-2">Sin alertas</td></tr>
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
export class ReportesAlertasComponent implements OnInit {
  ruc: string = '';
  loading = false;
  lowStock: InventoryVariant[] = [];
  overdueLoans: any[] = [];
  dueSoonLoans: any[] = [];
  expiringLots: Array<InventoryLotDto & { variantCode?: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private lotService: InventoryLotService,
    private outputService: InventoryOutputService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; this.loadAlerts(); }

  private daysTo(dateStr?: string): number | null { if (!dateStr) return null; const d = new Date(dateStr); const t = new Date(); const diff = Math.floor((d.getTime()-t.getTime())/(1000*60*60*24)); return diff; }

  loadAlerts(): void {
    this.loading = true;
    // Low stock and expiring lots require walking products/variants
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const variantCalls = (products || []).map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(variantCalls).subscribe({
          next: (lists) => {
            const variants: InventoryVariant[] = ([] as InventoryVariant[]).concat(...(lists || [])).filter(Boolean);
            this.lowStock = variants.filter(v => (v.minQty ?? 0) > 0 && (v.currentQty ?? 0) < (v.minQty ?? 0));

            // Expiring lots in 30 days: for each variant, listAvailable and filter expirationDate
            const lotCalls = variants.map(v => this.lotService.listAvailable(this.ruc, v.id!));
            forkJoin(lotCalls).subscribe({
              next: (lotLists) => {
                const rows: Array<InventoryLotDto & { variantCode?: string }> = [];
                lotLists.forEach((lots, idx) => {
                  const v = variants[idx];
                  for (const l of (lots || [])) {
                    const d = this.daysTo(l.expirationDate);
                    if (d != null && d <= 30 && d >= 0) rows.push({ ...l, variantCode: v.code });
                  }
                });
                this.expiringLots = rows;
                this.loading = false;
              },
              error: () => { this.expiringLots = []; this.loading = false; }
            });
          },
          error: () => { this.lowStock = []; this.loading = false; }
        });
      },
      error: () => { this.lowStock = []; this.loading = false; }
    });

    // Loans overdue / due soon
    this.outputService.findByType(this.ruc, 'PRESTAMO').subscribe({
      next: (outs) => {
        const todayStr = new Date().toISOString().slice(0,10);
        const toDate = (s?: string) => s ? new Date(s) : null;
        const today = new Date(todayStr);
        const rows: any[] = [];
        for (const o of (outs || [])) {
          const details = Array.isArray((o as any).details) ? (o as any).details : [];
          for (const d of details) rows.push({ ...o, detailVariantCode: (d as any).variantCode });
        }
        this.overdueLoans = rows.filter(r => r.returnDate && toDate(r.returnDate)! < today);
        this.dueSoonLoans = rows.filter(r => {
          if (!r.returnDate) return false;
          const diff = Math.floor(((toDate(r.returnDate)!.getTime() - today.getTime())/(1000*60*60*24)));
          return diff >= 0 && diff <= 3;
        });
      },
      error: () => { this.overdueLoans = []; this.dueSoonLoans = []; }
    });
  }
}
