import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryEntryService, InventoryEntry, InventoryEntryDetail } from '../../../../../services/inventory-entry.service';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-truck me-2"></i>Traslados entre bodegas</h2>
            <div class="text-muted">Registra traslados de salida y recepción en destino</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetAll()" [disabled]="loading"><i class="fas fa-broom me-2"></i>Limpiar</button>
          </div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item"><button class="nav-link" [class.active]="mode==='SALIDA'" (click)="mode='SALIDA'">Traslado de salida</button></li>
        <li class="nav-item"><button class="nav-link" [class.active]="mode==='ENTRADA'" (click)="mode='ENTRADA'">Traslado de entrada</button></li>
      </ul>

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

      <div *ngIf="mode==='SALIDA'" class="card shadow-sm">
        <div class="card-header bg-light"><div class="fw-semibold">Datos del traslado de salida</div></div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-4">
              <label class="form-label">Destino</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="destino" placeholder="Bodega de Obra Torre A">
            </div>
            <div class="col-md-3">
              <label class="form-label">Responsable de llevar</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="responsable" placeholder="Chofer Mario">
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="fechaSalida">
            </div>
            <div class="col-md-2">
              <label class="form-label">N° Guía</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="guiaNumero" placeholder="GT-0001">
            </div>
          </div>
          <hr>
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Código de variante</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-barcode"></i></span>
                <input type="text" class="form-control" [(ngModel)]="variantCodeSearch" placeholder="EPP-001-CSC-BL-M" (keyup.enter)="addItemByCode()">
                <button class="btn btn-outline-secondary" (click)="addItemByCode()">Agregar</button>
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label">Cantidad</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="pendingQty" min="1">
            </div>
          </div>
          <div class="table-responsive mt-3">
            <table class="table table-sm align-middle">
              <thead class="table-light">
                <tr>
                  <th>Variante</th>
                  <th style="width:100px" class="text-end">Cant.</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of itemsOut; let i=index">
                  <td>{{ it.variantCode }}</td>
                  <td class="text-end">{{ it.quantity }}</td>
                  <td><button class="btn btn-sm btn-outline-danger" (click)="removeOut(i)"><i class="fas fa-times"></i></button></td>
                </tr>
                <tr *ngIf="!itemsOut.length"><td colspan="3" class="text-center text-muted">Sin ítems</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-end">
          <button class="btn btn-primary" (click)="submitSalida()" [disabled]="loading || !canSubmitSalida()"><i class="fas fa-paper-plane me-2"></i>Registrar traslado de salida</button>
        </div>
      </div>

      <div *ngIf="mode==='ENTRADA'" class="card shadow-sm">
        <div class="card-header bg-light"><div class="fw-semibold">Datos del traslado de entrada</div></div>
        <div class="card-body">
          <div class="row g-2">
            <div class="col-md-4">
              <label class="form-label">Origen</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="origen" placeholder="Bodega Principal">
            </div>
            <div class="col-md-3">
              <label class="form-label">Responsable recibido por</label>
              <input type="text" class="form-control form-control-sm" [(ngModel)]="recibidoPor" placeholder="Bodeguero Torre A">
            </div>
            <div class="col-md-3">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control form-control-sm" [(ngModel)]="fechaEntrada">
            </div>
          </div>
          <hr>
          <div class="row g-2 align-items-end">
            <div class="col-md-4">
              <label class="form-label">Código de variante</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-barcode"></i></span>
                <input type="text" class="form-control" [(ngModel)]="variantCodeSearchIn" placeholder="EPP-001-CSC-BL-M" (keyup.enter)="addEntradaRowByCode()">
                <button class="btn btn-outline-secondary" (click)="addEntradaRowByCode()">Agregar</button>
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label">Enviada</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="enviadaTmp" min="1">
            </div>
            <div class="col-md-2">
              <label class="form-label">Recibida</label>
              <input type="number" class="form-control form-control-sm" [(ngModel)]="recibidaTmp" min="0">
            </div>
          </div>
          <div class="table-responsive mt-3">
            <table class="table table-sm align-middle">
              <thead class="table-light">
                <tr>
                  <th>Variante</th>
                  <th class="text-end" style="width:120px">Enviada</th>
                  <th class="text-end" style="width:120px">Recibida</th>
                  <th class="text-end" style="width:120px">Diferencia</th>
                  <th style="width:200px">Motivo</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rowsIn; let i=index">
                  <td>{{ r.variantCode }}</td>
                  <td class="text-end">{{ r.sent }}</td>
                  <td class="text-end">{{ r.received }}</td>
                  <td class="text-end" [class.text-danger]="(r.sent - r.received) > 0">{{ r.sent - r.received }}</td>
                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="r.reason" placeholder="Se perdieron en el transporte"></td>
                  <td><button class="btn btn-sm btn-outline-danger" (click)="removeIn(i)"><i class="fas fa-times"></i></button></td>
                </tr>
                <tr *ngIf="!rowsIn.length"><td colspan="6" class="text-center text-muted">Sin ítems</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-end">
          <button class="btn btn-primary" (click)="submitEntrada()" [disabled]="loading || !canSubmitEntrada()"><i class="fas fa-save me-2"></i>Registrar traslado de entrada</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-link { cursor: pointer; }
  `]
})
export class TrasladosComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  mode: 'SALIDA' | 'ENTRADA' = 'SALIDA';

  destino = '';
  responsable = '';
  fechaSalida: string = new Date().toISOString().slice(0,10);
  guiaNumero = '';
  variantCodeSearch = '';
  pendingQty: number = 1;
  itemsOut: Array<{ variantId: number; variantCode: string; quantity: number; }> = [];

  origen = '';
  recibidoPor = '';
  fechaEntrada: string = new Date().toISOString().slice(0,10);
  variantCodeSearchIn = '';
  enviadaTmp: number = 1;
  recibidaTmp: number = 1;
  rowsIn: Array<{ variantId: number; variantCode: string; sent: number; received: number; reason?: string; }> = [];

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
    this.destino = '';
    this.responsable = '';
    this.guiaNumero = '';
    this.variantCodeSearch = '';
    this.pendingQty = 1;
    this.itemsOut = [];
    this.origen = '';
    this.recibidoPor = '';
    this.variantCodeSearchIn = '';
    this.enviadaTmp = 1;
    this.recibidaTmp = 1;
    this.rowsIn = [];
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

  addItemByCode(): void {
    if (!this.variantCodeSearch || this.pendingQty <= 0) return;
    const code = this.variantCodeSearch; const qty = this.pendingQty;
    this.resolveVariantByCode(code, (v) => {
      if (v?.id) this.itemsOut.push({ variantId: v.id, variantCode: v.code, quantity: qty });
      this.variantCodeSearch = '';
      this.pendingQty = 1;
    });
  }
  removeOut(i: number): void { this.itemsOut.splice(i,1); }
  canSubmitSalida(): boolean { return !!(this.destino && this.responsable && this.itemsOut.length); }

  submitSalida(): void {
    if (!this.canSubmitSalida()) return;
    this.loading = true; this.errorMessage = ''; this.successMessage = '';
    const payload: InventoryOutput = {
      outputNumber: this.buildNumber('TRS-SAL'),
      outputDate: this.fechaSalida,
      outputType: 'CONSUMO_AREA',
      area: undefined,
      project: `TRASLADO A: ${this.destino}`,
      authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
      notes: `Guía ${this.guiaNumero || '—'} | Responsable: ${this.responsable}`,
      status: 'BORRADOR',
      details: this.itemsOut.map(it => ({ variantId: it.variantId, quantity: it.quantity, unitCost: 0, totalCost: 0, notes: 'Traslado de salida' }))
    } as any;
    this.outputService.create(this.ruc, payload).subscribe({
      next: (created) => {
        const id = Number(created?.id);
        if (!id) { this.loading = false; this.successMessage = 'Traslado de salida registrado'; this.itemsOut = []; return; }
        this.outputService.confirm(this.ruc, id).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Traslado de salida registrado y confirmado'; this.itemsOut = []; },
          error: () => { this.loading = false; this.errorMessage = 'Traslado de salida creado pero no se pudo confirmar'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo registrar el traslado de salida'; }
    });
  }

  addEntradaRowByCode(): void {
    if (!this.variantCodeSearchIn || this.enviadaTmp <= 0 || this.recibidaTmp < 0) return;
    const code = this.variantCodeSearchIn; const sent = this.enviadaTmp; const received = this.recibidaTmp;
    this.resolveVariantByCode(code, (v) => {
      if (v?.id) this.rowsIn.push({ variantId: v.id, variantCode: v.code, sent, received, reason: '' });
      this.variantCodeSearchIn = ''; this.enviadaTmp = 1; this.recibidaTmp = 1;
    });
  }
  removeIn(i: number): void { this.rowsIn.splice(i,1); }
  canSubmitEntrada(): boolean { return !!(this.origen && this.recibidoPor && this.rowsIn.length); }

  submitEntrada(): void {
    if (!this.canSubmitEntrada()) return;
    this.loading = true; this.errorMessage = ''; this.successMessage = '';
    const recibidos = this.rowsIn.filter(r => r.received > 0);
    const perdidas = this.rowsIn.filter(r => (r.sent - r.received) > 0);

    const entry: InventoryEntry = {
      entryNumber: this.buildNumber('TRS-ENT'),
      entryDate: this.fechaEntrada,
      entryType: 'TRANSFERENCIA',
      origin: this.origen,
      receivedBy: this.recibidoPor || (this.auth.getCurrentUser()?.name || 'Sistema'),
      authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
      notes: 'Recepción de traslado',
      status: 'BORRADOR',
      details: recibidos.map(r => ({ variantId: r.variantId, quantity: r.received, unitCost: 0, taxPercentage: 0, taxAmount: 0, totalCost: 0, notes: 'Traslado recibido' }))
    } as any;

    const calls: any[] = [ this.entryService.create(this.ruc, entry) ];

    if (perdidas.length) {
      const baja: InventoryOutput = {
        outputNumber: this.buildNumber('TRS-BAJA'),
        outputDate: this.fechaEntrada,
        outputType: 'BAJA',
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: 'Pérdidas durante el traslado',
        status: 'BORRADOR',
        details: perdidas.map(p => ({ variantId: p.variantId, quantity: (p.sent - p.received), unitCost: 0, totalCost: 0, notes: p.reason || '' }))
      } as any;
      calls.push(this.outputService.create(this.ruc, baja));
    }

    forkJoin(calls).subscribe({
      next: (results: any[]) => {
        const confirmCalls: any[] = [];
        for (const res of (results || [])) {
          const id = Number(res?.id);
          if (!id) continue;
          if (res?.entryNumber) confirmCalls.push(this.entryService.confirm(this.ruc, id));
          if (res?.outputNumber) confirmCalls.push(this.outputService.confirm(this.ruc, id));
        }
        if (!confirmCalls.length) { this.loading = false; this.successMessage = 'Traslado de entrada registrado'; this.rowsIn = []; return; }
        forkJoin(confirmCalls).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Traslado de entrada registrado y confirmado'; this.rowsIn = []; },
          error: () => { this.loading = false; this.errorMessage = 'Traslado de entrada creado pero no se pudo confirmar'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo registrar el traslado de entrada'; }
    });
  }

  private buildNumber(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
}
