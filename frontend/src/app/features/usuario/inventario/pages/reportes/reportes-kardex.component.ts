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
  selector: 'app-reportes-kardex',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-file-alt me-2"></i>Kardex</h2>
            <div class="text-muted">Historial completo por variante</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetAll()"><i class="fas fa-broom me-2"></i>Limpiar</button>
          </div>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-6">
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-barcode"></i></span>
            <input type="text" class="form-control" [(ngModel)]="variantCodeSearch" placeholder="Código de variante" (keyup.enter)="resolveVariantAndLoad()">
            <button class="btn btn-outline-secondary" (click)="resolveVariantAndLoad()">Buscar</button>
          </div>
          <div class="small text-muted mt-1">Seleccionado: {{ selectedVariant?.code || '—' }}</div>
        </div>
      </div>

      <div class="card shadow-sm" *ngIf="movements.length">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <div class="fw-semibold">Movimientos</div>
          <div class="small text-muted">Saldo actual: <strong>{{ saldo }}</strong></div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th class="text-end" style="width:120px">Entrada</th>
                  <th class="text-end" style="width:120px">Salida</th>
                  <th class="text-end" style="width:120px">Saldo</th>
                  <th style="width:160px">Lote</th>
                  <th class="text-end" style="width:120px">Costo</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of movements">
                  <td>{{ m.date }}</td>
                  <td>{{ m.type }}</td>
                  <td class="text-end">{{ m.qtyIn || '' }}</td>
                  <td class="text-end">{{ m.qtyOut || '' }}</td>
                  <td class="text-end">{{ m.balance }}</td>
                  <td>{{ m.lotNumber || '—' }}</td>
                  <td class="text-end">{{ m.unitCost | number:'1.2-2' }}</td>
                  <td>{{ m.notes || '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
  `]
})
export class ReportesKardexComponent implements OnInit {
  ruc: string = '';
  variantCodeSearch = '';
  selectedVariant: InventoryVariant | null = null;
  movements: Array<{ date: string; type: string; qtyIn?: number; qtyOut?: number; balance: number; lotNumber?: string; unitCost: number; notes?: string; }> = [];
  saldo = 0;

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private entryService: InventoryEntryService,
    private outputService: InventoryOutputService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; }

  resetAll(): void {
    this.variantCodeSearch = '';
    this.selectedVariant = null;
    this.movements = [];
    this.saldo = 0;
  }

  private resolveVariantByCode(code: string, cb: (v: InventoryVariant | null) => void): void {
    const q = (code || '').trim().toLowerCase(); if (!q) { cb(null); return; }
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const calls = (products || []).map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(calls).subscribe({
          next: (lists) => {
            let found: InventoryVariant | null = null;
            for (const arr of (lists || [])) { for (const v of (arr || [])) { if ((v.code||'').toLowerCase() === q) { found = v; break; } } if (found) break; }
            cb(found);
          },
          error: () => cb(null)
        });
      },
      error: () => cb(null)
    });
  }

  resolveVariantAndLoad(): void {
    const code = (this.variantCodeSearch || '').trim();
    if (!code) return;
    this.resolveVariantByCode(code, (v) => { this.selectedVariant = v; if (v?.id) this.loadKardex(v.id); });
  }

  private loadKardex(variantId: number): void {
    this.entryService.getKardex(this.ruc, variantId).subscribe({
      next: (rows) => {
        if (rows && rows.length) {
          // Intentar usar respuesta directa
          let balance = 0;
          this.movements = rows.map((r: any) => {
            const qtyIn = Number(r.qtyIn || r.quantityIn || r.entryQty || 0);
            const qtyOut = Number(r.qtyOut || r.quantityOut || r.outputQty || 0);
            balance += qtyIn - qtyOut;
            return {
              date: r.date || r.movementDate || r.entryDate || r.outputDate || '',
              type: r.type || r.movementType || r.entryType || r.outputType || '',
              qtyIn: qtyIn || undefined,
              qtyOut: qtyOut || undefined,
              balance,
              lotNumber: r.lotNumber,
              unitCost: Number(r.unitCost || 0),
              notes: r.notes
            };
          });
          this.saldo = balance;
        } else {
          this.fallbackBuildKardex(variantId);
        }
      },
      error: () => this.fallbackBuildKardex(variantId)
    });
  }

  private fallbackBuildKardex(variantId: number): void {
    forkJoin({ entries: this.entryService.list(this.ruc), outputs: this.outputService.list(this.ruc) }).subscribe(({ entries, outputs }) => {
      const events: any[] = [];
      for (const e of (entries || [])) {
        const details = Array.isArray((e as any).details) ? (e as any).details : [];
        for (const d of details) {
          if (Number(d.variantId) === Number(variantId)) {
            events.push({ date: (e as any).entryDate, type: (e as any).entryType || 'ENTRADA', qtyIn: Number(d.quantity||0), unitCost: Number(d.unitCost||0), lotNumber: d.lotNumber, notes: d.notes });
          }
        }
      }
      for (const o of (outputs || [])) {
        const details = Array.isArray((o as any).details) ? (o as any).details : [];
        for (const d of details) {
          if (Number(d.variantId) === Number(variantId)) {
            events.push({ date: (o as any).outputDate, type: (o as any).outputType || 'SALIDA', qtyOut: Number(d.quantity||0), unitCost: Number(d.unitCost||0), lotNumber: d.lotNumber, notes: d.notes });
          }
        }
      }
      events.sort((a,b) => String(a.date||'').localeCompare(String(b.date||'')));
      let balance = 0;
      this.movements = events.map(ev => { balance += (ev.qtyIn || 0) - (ev.qtyOut || 0); return { date: ev.date, type: ev.type, qtyIn: ev.qtyIn, qtyOut: ev.qtyOut, balance, lotNumber: ev.lotNumber, unitCost: ev.unitCost, notes: ev.notes }; });
      this.saldo = balance;
    });
  }
}
