import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryEntryService, InventoryEntry } from '../../../../../services/inventory-entry.service';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-sliders-h me-2"></i>Ajustes de Inventario</h2>
            <div class="text-muted">Ajusta diferencias entre el sistema y el conteo físico</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetAll()" [disabled]="loading"><i class="fas fa-broom me-2"></i>Limpiar</button>
          </div>
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
      <div class="row" *ngIf="successMessage">
        <div class="col-12">
          <div class="alert alert-success alert-dismissible fade show">
            <i class="fas fa-check-circle me-2"></i>{{ successMessage }}
            <button type="button" class="btn-close" (click)="successMessage = ''"></button>
          </div>
        </div>
      </div>

      <div class="card shadow-sm">
        <div class="card-header bg-light"><div class="fw-semibold">Detalle del ajuste</div></div>
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Código de variante</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-barcode"></i></span>
                <input type="text" class="form-control" [(ngModel)]="variantCodeSearch" placeholder="EPP-001-CSC-BL-M" (keyup.enter)="addRowByCode()">
                <button class="btn btn-outline-secondary" (click)="addRowByCode()">Agregar</button>
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label">En sistema</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="sistemaTmp" min="0">
            </div>
            <div class="col-md-2">
              <label class="form-label">Conteo físico</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="fisicoTmp" min="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">Motivo</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="motivoTmp" placeholder="No se registraron 2 entregas">
            </div>
          </div>
          <div class="table-responsive mt-3">
            <table class="table table-sm align-middle">
              <thead class="table-light">
                <tr>
                  <th>Variante</th>
                  <th class="text-end" style="width:120px">Sistema</th>
                  <th class="text-end" style="width:140px">Conteo físico</th>
                  <th class="text-end" style="width:120px">Diferencia</th>
                  <th>Motivo</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rows; let i=index">
                  <td>{{ r.variantCode }}</td>
                  <td class="text-end">{{ r.sistema }}</td>
                  <td class="text-end">{{ r.fisico }}</td>
                  <td class="text-end" [class.text-danger]="(r.fisico - r.sistema) < 0" [class.text-success]="(r.fisico - r.sistema) > 0">{{ r.fisico - r.sistema }}</td>
                  <td>{{ r.motivo || '—' }}</td>
                  <td><button class="btn btn-sm btn-outline-danger" (click)="removeRow(i)"><i class="fas fa-times"></i></button></td>
                </tr>
                <tr *ngIf="!rows.length"><td colspan="6" class="text-center text-muted">Sin ítems</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div class="small text-muted">Los faltantes se registran como BAJA. Los sobrantes como ENTRADA de tipo AJUSTE.</div>
          <div>
            <button class="btn btn-primary" (click)="submitAjuste()" [disabled]="loading || !rows.length"><i class="fas fa-save me-2"></i>Registrar ajuste</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
  `]
})
export class AjustesComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  variantCodeSearch = '';
  sistemaTmp = 0;
  fisicoTmp = 0;
  motivoTmp = '';
  rows: Array<{ variantId: number; variantCode: string; sistema: number; fisico: number; motivo?: string; }> = [];

  constructor(
    private route: ActivatedRoute,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private entryService: InventoryEntryService,
    private outputService: InventoryOutputService,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; }

  resetAll(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.variantCodeSearch = '';
    this.sistemaTmp = 0;
    this.fisicoTmp = 0;
    this.motivoTmp = '';
    this.rows = [];
  }

  private resolveVariantByCode(code: string, cb: (v: InventoryVariant | null) => void): void {
    const q = (code || '').trim().toLowerCase();
    if (!q) { cb(null); return; }
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const calls = (products || []).map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(calls).subscribe({
          next: (lists) => {
            let found: InventoryVariant | null = null;
            for (const arr of (lists || [])) {
              for (const v of (arr || [])) {
                if (String(v.code || '').toLowerCase() === q) { found = v; break; }
              }
              if (found) break;
            }
            cb(found);
          },
          error: () => { cb(null); }
        });
      },
      error: () => cb(null)
    });
  }

  addRowByCode(): void {
    if (!this.variantCodeSearch) return;
    const code = this.variantCodeSearch; const sistema = this.sistemaTmp; const fisico = this.fisicoTmp; const motivo = this.motivoTmp;
    this.resolveVariantByCode(code, (v) => {
      if (v?.id) this.rows.push({ variantId: v.id, variantCode: v.code, sistema, fisico, motivo });
      this.variantCodeSearch = ''; this.sistemaTmp = 0; this.fisicoTmp = 0; this.motivoTmp = '';
    });
  }
  removeRow(i: number): void { this.rows.splice(i,1); }

  private buildNumber(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  submitAjuste(): void {
    if (!this.rows.length) return;
    this.loading = true; this.errorMessage = ''; this.successMessage = '';
    const positivos = this.rows.filter(r => (r.fisico - r.sistema) > 0);
    const negativos = this.rows.filter(r => (r.fisico - r.sistema) < 0);

    const calls: any[] = [];
    if (positivos.length) {
      const entry: InventoryEntry = {
        entryNumber: this.buildNumber('AJUSTE'),
        entryDate: new Date().toISOString().slice(0,10),
        entryType: 'AJUSTE',
        receivedBy: (this.auth.getCurrentUser()?.name || this.auth.getCurrentUser()?.username || 'Sistema') as string,
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: 'Ajuste por sobrantes',
        status: 'BORRADOR',
        details: positivos.map(r => ({ variantId: r.variantId, quantity: (r.fisico - r.sistema), unitCost: 0, taxPercentage: 0, taxAmount: 0, totalCost: 0, notes: r.motivo || '' }))
      } as any;
      calls.push(this.entryService.create(this.ruc, entry));
    }

    if (negativos.length) {
      const output: InventoryOutput = {
        outputNumber: this.buildNumber('AJ-BAJA'),
        outputDate: new Date().toISOString().slice(0,10),
        outputType: 'BAJA',
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: 'Ajuste por faltantes',
        status: 'BORRADOR',
        details: negativos.map(r => ({ variantId: r.variantId, quantity: (r.sistema - r.fisico), unitCost: 0, totalCost: 0, notes: r.motivo || '' }))
      } as any;
      calls.push(this.outputService.create(this.ruc, output));
    }

    if (!calls.length) { this.loading = false; return; }
    forkJoin(calls).subscribe({
      next: (results: any[]) => {
        const confirmCalls: any[] = [];
        for (const res of (results || [])) {
          const id = Number(res?.id);
          if (!id) continue;
          if (res?.entryNumber) confirmCalls.push(this.entryService.confirm(this.ruc, id));
          if (res?.outputNumber) confirmCalls.push(this.outputService.confirm(this.ruc, id));
        }
        if (!confirmCalls.length) { this.loading = false; this.successMessage = 'Ajuste registrado correctamente'; this.rows = []; return; }
        forkJoin(confirmCalls).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Ajuste registrado y confirmado'; this.rows = []; },
          error: () => { this.loading = false; this.errorMessage = 'Ajuste creado pero no se pudo confirmar'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo registrar el ajuste'; }
    });
  }
}
