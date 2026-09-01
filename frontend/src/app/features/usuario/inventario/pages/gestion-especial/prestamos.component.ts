import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { InventoryEntryService, InventoryEntry } from '../../../../../services/inventory-entry.service';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { EmployeeService as THEmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-prestamos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-handshake me-2" style="color:#f39c12"></i>Préstamos</h2>
            <div class="text-muted">Registra préstamos y controla vencimientos y devoluciones</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="reloadLists()" [disabled]="loading"><i class="fas fa-sync-alt me-2" [class.fa-spin]="loading"></i>Actualizar</button>
          </div>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-id-card"></i></span>
            <input type="text" class="form-control" [(ngModel)]="cedulaSearch" placeholder="Buscar por cédula" (keyup.enter)="searchByCedula()">
            <button type="button" class="btn btn-outline-secondary" (click)="searchByCedula()">Buscar</button>
          </div>
        </div>
        <div class="col-md-4">
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-barcode"></i></span>
            <input type="text" class="form-control" [(ngModel)]="codigoSearch" placeholder="Buscar por código trabajador" (keyup.enter)="searchByCodigo()">
            <button type="button" class="btn btn-outline-secondary" (click)="searchByCodigo()">Buscar</button>
          </div>
        </div>
        <div class="col-md-4 d-flex align-items-center gap-2">
          <div class="fw-semibold">{{ selectedEmployee ? (selectedEmployee.nombres + ' ' + selectedEmployee.apellidos) : '—' }}</div>
          <span *ngIf="selectedEmployee && !isEmployeeActive(selectedEmployee)" class="badge bg-secondary">INACTIVO</span>
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

      <div class="row">
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Registrar nuevo préstamo</div></div>
            <div class="card-body">
              <div class="row g-2">
                <div class="col-12">
                  <div class="input-group">
                    <span class="input-group-text"><i class="fas fa-barcode"></i></span>
                    <input type="text" class="form-control" [(ngModel)]="variantCodeSearch" placeholder="Código de variante" (keyup.enter)="resolveVariantByCode()">
                    <button class="btn btn-outline-secondary" (click)="resolveVariantByCode()">Buscar</button>
                  </div>
                </div>
                <div class="col-12">
                  <div class="small text-muted">Variante: {{ selectedVariant?.code || '—' }} {{ selectedVariant?.sizeLabel ? '(' + (selectedVariant?.sizeLabel) + ')' : '' }}</div>
                </div>
                <div class="col-12" *ngIf="selectedVariant">
                  <label class="form-label">Lote</label>
                  <select class="form-select form-select-sm" [(ngModel)]="selectedLotId">
                    <option *ngFor="let l of lotOptions[selectedVariant.id!]" [ngValue]="l.id">{{ l.lotNumber }} • Cant: {{ l.currentQty }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha préstamo</label>
                  <input type="date" class="form-control form-control-sm" [(ngModel)]="loanDate">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Debe devolver</label>
                  <input type="date" class="form-control form-control-sm" [(ngModel)]="expectedReturnDate">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Accesorios incluidos</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="accessories" placeholder="Estuche, 3 brocas, cargador">
                </div>
                <div class="col-md-6">
                  <label class="form-label">Para qué</label>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="purpose" placeholder="Trabajo en Torre A, piso 5">
                </div>
                <div class="col-12">
                  <label class="form-label">Estado al salir</label>
                  <select class="form-select form-select-sm" [(ngModel)]="stateOnExit">
                    <option [ngValue]="'PERFECTO'">Perfecto</option>
                    <option [ngValue]="'BUENO'">Buen estado</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="card-footer d-flex justify-content-end">
              <button class="btn btn-primary" (click)="submitLoan()" [disabled]="loading || !canSubmit()"><i class="fas fa-save me-2"></i>Registrar préstamo</button>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card shadow-sm mb-3">
            <div class="card-header bg-light"><div class="fw-semibold">Prestados actualmente</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Trabajador</th>
                      <th>Variante</th>
                      <th>Entrega</th>
                      <th>Debe devolver</th>
                      <th class="text-end">Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of loans">
                      <td>{{ p.employeeName || p.employeeId }}</td>
                      <td>{{ p.detailVariantCode || '—' }}</td>
                      <td>{{ p.outputDate }}</td>
                      <td>{{ p.returnDate || '—' }}</td>
                      <td class="text-end">
                        <span class="badge" [ngClass]="getBadgeClass(p)">{{ getLoanStatus(p) }}</span>
                      </td>
                      <td>
                        <button class="btn btn-sm btn-outline-success" (click)="returnLoan(p)" [disabled]="loading" title="Registrar devolución">
                          <i class="fas fa-undo me-1"></i>Devolver
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="!loans.length && !loading"><td colspan="6" class="text-center text-muted py-3">Sin préstamos</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [``]
})
export class PrestamosComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  cedulaSearch = '';
  codigoSearch = '';
  selectedEmployee: EmployeeResponse | null = null;
  variantCodeSearch = '';
  selectedVariant: InventoryVariant | null = null;
  lotOptions: { [variantId: number]: InventoryLotDto[] } = {};
  selectedLotId: number | null = null;
  loanDate: string = new Date().toISOString().slice(0,10);
  expectedReturnDate: string = '';
  accessories: string = '';
  purpose: string = '';
  stateOnExit: 'PERFECTO' | 'BUENO' = 'PERFECTO';
  loans: Array<{ employeeId?: number; employeeName?: string; outputDate: string; returnDate?: string; detailVariantCode?: string; } & InventoryOutput> = [];

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private entryService: InventoryEntryService,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private lotService: InventoryLotService,
    private thEmployeeService: THEmployeeService,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; this.reloadLists(); }

  reloadLists(): void {
    this.loading = true;
    this.outputService.findByType(this.ruc, 'PRESTAMO').subscribe({
      next: (outs) => {
        const res: any[] = [];
        for (const o of (outs || [])) {
          if ((o as any).status !== 'CONFIRMADO') continue;
          if ((o as any).returned) continue;
          const details = Array.isArray((o as any).details) ? (o as any).details : [];
          for (const d of details) {
            res.push({
              ...o,
              detailVariantCode: (d as any).variantCode,
              detailVariantId: (d as any).variantId
            });
          }
        }
        this.loans = res;
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo cargar préstamos'; }
    });
  }

  isEmployeeActive(emp: EmployeeResponse | null | undefined): boolean {
    return THEmployeeService.isEmployeeActive(emp);
  }

  searchByCedula(): void {
    const c = (this.cedulaSearch || '').trim();
    if (!c) return;
    this.loading = true;
    this.errorMessage = '';
    this.selectedEmployee = null;
    this.thEmployeeService.getEmployeeByCedulaScopedByRuc(this.ruc, c).subscribe({
      next: (emp) => {
        if (!THEmployeeService.isEmployeeActive(emp)) {
          this.loading = false;
          this.errorMessage = 'Trabajador inactivo: no se puede registrar préstamo nuevo. El historial queda en reportes/auditoría.';
          return;
        }
        this.selectedEmployee = emp;
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMessage = 'No se encontró trabajador con esa cédula'; }
    });
  }

  searchByCodigo(): void {
    const code = (this.codigoSearch || '').trim();
    if (!code) return;
    this.loading = true;
    this.errorMessage = '';
    this.selectedEmployee = null;
    this.thEmployeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code, activeOnly: true }).subscribe({
      next: (page) => {
        const emp = page?.content?.[0];
        if (emp) { this.selectedEmployee = emp as any; this.loading = false; return; }
        this.thEmployeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code }).subscribe({
          next: (allPage) => {
            const any = allPage?.content?.[0];
            this.loading = false;
            if (any && !THEmployeeService.isEmployeeActive(any as any)) {
              this.errorMessage = 'Trabajador inactivo: no se puede registrar préstamo nuevo. El historial queda en reportes/auditoría.';
            } else {
              this.errorMessage = 'Código no encontrado';
            }
          },
          error: () => { this.loading = false; this.errorMessage = 'Código no encontrado'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'Error buscando por código'; }
    });
  }

  private loadLotsForVariant(id: number): void {
    if (!id) return;
    this.lotService.listAvailable(this.ruc, id).subscribe({
      next: (lots) => { this.lotOptions[id] = lots || []; this.selectedLotId = this.lotOptions[id]?.[0]?.id || null; },
      error: () => { this.lotOptions[id] = []; this.selectedLotId = null; }
    });
  }

  resolveVariantByCode(): void {
    const code = (this.variantCodeSearch || '').trim().toLowerCase();
    if (!code) return;
    this.loading = true;
    this.productService.list(this.ruc).subscribe({
      next: (products) => {
        const calls = (products || []).map(p => this.variantService.listByProduct(this.ruc, p.id!));
        forkJoin(calls).subscribe({
          next: (lists) => {
            let found: InventoryVariant | null = null;
            for (const arr of (lists || [])) {
              for (const v of (arr || [])) {
                if (String(v.code || '').toLowerCase() === code) { found = v; break; }
              }
              if (found) break;
            }
            this.selectedVariant = found;
            if (found?.id) this.loadLotsForVariant(found.id);
            this.loading = false;
          },
          error: () => { this.loading = false; this.errorMessage = 'Error cargando variantes'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'Error cargando productos'; }
    });
  }

  canSubmit(): boolean {
    return !!(this.selectedEmployee && this.selectedVariant && this.selectedLotId && this.expectedReturnDate);
  }

  returnLoan(loan: any): void {
    if (!confirm(`¿Confirmar devolución del préstamo ${loan.outputNumber}?`)) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const details = Array.isArray(loan.details) ? loan.details : [];
    const entryDetails = details.map((d: any) => ({
      variantId: Number(d.variantId || d.variant?.id || loan.detailVariantId || 0),
      quantity: Number(d.quantity || 1),
      unitCost: Number(d.unitCost || 0),
      taxPercentage: 0,
      taxAmount: 0,
      totalCost: 0,
      itemCondition: 'USADO',
      notes: `Devolución del préstamo ${loan.outputNumber}`
    })).filter((d: any) => d.variantId > 0);
    if (!entryDetails.length) {
      this.loading = false;
      this.errorMessage = 'No se pudo identificar la variante del préstamo';
      return;
    }
    const employeeId = Number(loan.employeeId || this.selectedEmployee?.id || 0);
    const entry: InventoryEntry = {
      entryNumber: this.buildNumber('DEV'),
      entryDate: new Date().toISOString().slice(0, 10),
      entryType: 'DEVOLUCION',
      origin: employeeId ? `EMP:${employeeId}` : undefined,
      receivedBy: (this.auth.getCurrentUser()?.name || this.auth.getCurrentUser()?.username || 'Sistema') as string,
      authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
      notes: `Devolución del préstamo ${loan.outputNumber}`,
      status: 'BORRADOR',
      details: entryDetails
    } as any;
    this.entryService.create(this.ruc, entry).subscribe({
      next: (created) => {
        const id = Number(created?.id);
        if (!id) { this.loading = false; this.successMessage = 'Devolución registrada'; this.reloadLists(); return; }
        this.entryService.confirm(this.ruc, id).subscribe({
          next: () => {
            const outputId = Number(loan.id);
            if (!outputId) {
              this.loading = false;
              this.successMessage = 'Devolución registrada y confirmada correctamente';
              this.reloadLists();
              return;
            }
            this.outputService.markReturned(this.ruc, outputId, id).subscribe({
              next: () => {
                this.loading = false;
                this.successMessage = 'Devolución registrada y préstamo cerrado';
                this.reloadLists();
              },
              error: () => {
                this.loading = false;
                this.errorMessage = 'Devolución confirmada, pero no se pudo marcar el préstamo como devuelto';
                this.reloadLists();
              }
            });
          },
          error: () => { this.loading = false; this.errorMessage = 'Devolución creada pero no se pudo confirmar'; this.reloadLists(); }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo registrar la devolución'; }
    });
  }

  private buildNumber(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  submitLoan(): void {
    if (!this.canSubmit() || !this.selectedEmployee || !this.selectedVariant) return;
    if (!THEmployeeService.isEmployeeActive(this.selectedEmployee)) {
      this.errorMessage = 'No se puede registrar préstamo a un trabajador inactivo.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const selectedLot = (this.selectedVariant?.id && this.lotOptions[this.selectedVariant.id]) ? this.lotOptions[this.selectedVariant.id].find(l => l.id === this.selectedLotId!) : null;
    const empLabel = `${this.selectedEmployee.apellidos || ''} ${this.selectedEmployee.nombres || ''}`.trim()
      + (this.selectedEmployee.cedula ? ` | CED:${this.selectedEmployee.cedula}` : '');
    const notes = [
      `Accesorios: ${this.accessories || '—'} | Propósito: ${this.purpose || '—'} | Estado: ${this.stateOnExit}`,
      empLabel ? `[TRABAJADOR:${empLabel}]` : ''
    ].filter(Boolean).join(' ');
    const payload: any = {
      outputNumber: this.buildNumber('PREST'),
      outputDate: this.loanDate,
      outputType: 'PRESTAMO',
      employeeId: Number(this.selectedEmployee.id),
      authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
      returnDate: this.expectedReturnDate,
      notes,
      status: 'BORRADOR',
      details: [{ variantId: this.selectedVariant.id, quantity: 1, unitCost: 0, totalCost: 0, lotNumber: selectedLot?.lotNumber }]
    };
    this.outputService.create(this.ruc, payload).subscribe({
      next: (created) => {
        const id = Number(created?.id);
        if (!id) { this.loading = false; this.successMessage = 'Préstamo registrado'; this.reloadLists(); return; }
        this.outputService.confirm(this.ruc, id).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Préstamo registrado y confirmado'; this.reloadLists(); },
          error: () => { this.loading = false; this.errorMessage = 'Préstamo creado pero no se pudo confirmar'; this.reloadLists(); }
        });
      },
      error: (err: any) => { this.loading = false; this.errorMessage = 'No se pudo registrar el préstamo'; }
    });
  }

  private parseDate(d?: string): Date | null { if (!d) return null; const dt = new Date(d); return isNaN(+dt) ? null : dt; }
  private daysDiff(from?: string, to?: string): number | null {
    const a = this.parseDate(from); const b = this.parseDate(to);
    if (!a || !b) return null; return Math.floor((b.getTime() - a.getTime()) / (1000*60*60*24));
  }
  getLoanStatus(o: any): string {
    const today = new Date().toISOString().slice(0,10);
    const diff = this.daysDiff(today, o.returnDate);
    if (diff == null) return '—';
    if (diff < 0) return 'Vencido';
    if (diff <= 3) return 'Por vencer';
    return 'Prestado';
  }
  getBadgeClass(o: any): any {
    const s = this.getLoanStatus(o);
    return {
      'bg-danger': s === 'Vencido',
      'bg-warning text-dark': s === 'Por vencer',
      'bg-secondary': s === 'Prestado'
    };
  }
}
