import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { InventoryOutputService } from '../../../../../services/inventory-output.service';
import { InventoryEntryService } from '../../../../../services/inventory-entry.service';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { EmployeeService as THEmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-cambios-reemplazos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-exchange-alt me-2 text-purple"></i>Cambios y Reemplazos</h2>
            <div class="text-muted">Recibe el equipo viejo y entrega el nuevo en un solo proceso</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetAll()" [disabled]="loading"><i class="fas fa-broom me-2"></i>Limpiar</button>
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
        <div class="col-md-4 d-flex align-items-center">
          <div class="fw-semibold">{{ selectedEmployee ? (selectedEmployee.nombres + ' ' + selectedEmployee.apellidos) : '—' }}</div>
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
            <div class="card-header bg-light"><div class="fw-semibold">Selecciona el equipo a cambiar</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th></th>
                      <th>Producto</th>
                      <th style="width:160px">Variante</th>
                      <th class="text-end" style="width:90px">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of assignedItems">
                      <td><input type="radio" name="oldItem" [value]="it" [(ngModel)]="selectedOldItem"></td>
                      <td><div class="fw-semibold">{{ it.productName }}</div><div class="text-muted small">{{ it.outputNumber }}</div></td>
                      <td>{{ it.variantCode }}</td>
                      <td class="text-end">{{ it.quantity }}</td>
                    </tr>
                    <tr *ngIf="!assignedItems.length && !loading">
                      <td colspan="4" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2"></i><div>Sin asignaciones</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="card-footer">
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label">Motivo</label>
                  <select class="form-select form-select-sm" [(ngModel)]="reason">
                    <option [ngValue]="'VIDA_UTIL'">Vida útil cumplida</option>
                    <option [ngValue]="'DANADO_TRABAJO'">Se dañó trabajando</option>
                    <option [ngValue]="'PERDIO'">Lo perdió</option>
                    <option [ngValue]="'MAL_USO'">Mal uso</option>
                    <option [ngValue]="'TALLA_INCORRECTA'">Talla incorrecta</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Estado del viejo</label>
                  <select class="form-select form-select-sm" [(ngModel)]="oldState">
                    <option [ngValue]="'DESGASTADO'">Desgastado</option>
                    <option [ngValue]="'ROTO'">Roto</option>
                    <option [ngValue]="'FUNCIONAL'">Funcional</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Acción con el viejo</label>
                  <select class="form-select form-select-sm" [(ngModel)]="oldAction">
                    <option [ngValue]="'BAJA'">Dar de baja</option>
                    <option [ngValue]="'DEVOLUCION'">Devolver a inventario</option>
                    <option [ngValue]="'RESPALDO'">Guardar como respaldo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Selecciona el reemplazo (nuevo)</div></div>
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
                  <div class="small text-muted">Seleccionado: {{ selectedVariant?.code || '—' }} {{ selectedVariant?.sizeLabel ? '(' + (selectedVariant?.sizeLabel) + ')' : '' }}</div>
                </div>
                <div class="col-12" *ngIf="selectedVariant">
                  <label class="form-label">Lote</label>
                  <select class="form-select form-select-sm" [(ngModel)]="selectedLotId">
                    <option *ngFor="let l of lotOptions[selectedVariant.id!]" [ngValue]="l.id">{{ l.lotNumber }} • Cant: {{ l.currentQty }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row mt-3">
        <div class="col-12 d-flex justify-content-end">
          <button class="btn btn-primary" (click)="submitChange()" [disabled]="loading || !canSubmit()"><i class="fas fa-magic me-2"></i>Registrar cambio</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-purple { color: #8e44ad; }
  `]
})
export class CambiosReemplazosComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  cedulaSearch = '';
  codigoSearch = '';
  selectedEmployee: EmployeeResponse | null = null;
  assignedItems: Array<any> = [];
  selectedOldItem: any = null;
  reason: 'VIDA_UTIL' | 'DANADO_TRABAJO' | 'PERDIO' | 'MAL_USO' | 'TALLA_INCORRECTA' = 'VIDA_UTIL';
  oldState: 'DESGASTADO' | 'ROTO' | 'FUNCIONAL' = 'DESGASTADO';
  oldAction: 'BAJA' | 'DEVOLUCION' | 'RESPALDO' = 'BAJA';
  variantCodeSearch = '';
  selectedVariant: InventoryVariant | null = null;
  lotOptions: { [variantId: number]: InventoryLotDto[] } = {};
  selectedLotId: number | null = null;

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

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; }

  resetAll(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedEmployee = null;
    this.assignedItems = [];
    this.selectedOldItem = null;
    this.variantCodeSearch = '';
    this.selectedVariant = null;
    this.selectedLotId = null;
  }

  searchByCedula(): void {
    const c = (this.cedulaSearch || '').trim();
    if (!c) return;
    this.loading = true;
    this.errorMessage = '';
    this.thEmployeeService.getEmployeeByCedulaScopedByRuc(this.ruc, c).subscribe({
      next: (emp) => { this.selectedEmployee = emp; this.loadAssignments(); },
      error: () => { this.loading = false; this.errorMessage = 'No se encontró trabajador con esa cédula'; }
    });
  }

  searchByCodigo(): void {
    const code = (this.codigoSearch || '').trim();
    if (!code) return;
    this.loading = true;
    this.errorMessage = '';
    this.thEmployeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code }).subscribe({
      next: (page) => {
        const emp = page?.content?.[0];
        if (emp) { this.selectedEmployee = emp as any; this.loadAssignments(); }
        else { this.loading = false; this.errorMessage = 'Código no encontrado'; }
      },
      error: () => { this.loading = false; this.errorMessage = 'Error buscando por código'; }
    });
  }

  private loadAssignments(): void {
    if (!this.selectedEmployee?.id) { this.loading = false; return; }
    this.outputService.findByEmployee(this.ruc, Number(this.selectedEmployee.id)).subscribe({
      next: (outs) => {
        const items: any[] = [];
        for (const o of (outs || [])) {
          const type = (o as any).outputType;
          const status = (o as any).status;
          if (!(['EPP_TRABAJADOR', 'PRESTAMO'].includes(type)) || status !== 'CONFIRMADO') continue;
          const details = Array.isArray((o as any).details) ? (o as any).details : [];
          for (const d of details) {
            items.push({
              outputId: Number((o as any).id),
              outputNumber: (o as any).outputNumber || '',
              detailId: Number((d as any).id || 0),
              variantId: Number((d as any).variantId),
              productName: (d as any).productName || '',
              variantCode: (d as any).variantCode || '',
              quantity: Number((d as any).quantity || 0)
            });
          }
        }
        this.assignedItems = items;
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo cargar asignaciones'; }
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
        if (!products?.length) { this.loading = false; return; }
        const calls = products.map(p => this.variantService.listByProduct(this.ruc, p.id!));
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
    return !!(this.selectedEmployee && this.selectedOldItem && this.selectedVariant && this.selectedLotId);
  }

  private buildNumber(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  submitChange(): void {
    if (!this.canSubmit() || !this.selectedEmployee) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const old = this.selectedOldItem;
    const newV = this.selectedVariant!;
    const notesBase = `Cambio: motivo ${this.reason}, estado viejo ${this.oldState}`;

    const calls: any[] = [];
    if (this.oldAction === 'BAJA' || this.reason === 'PERDIO' || this.reason === 'MAL_USO') {
      const baja = {
        outputNumber: this.buildNumber('BAJA'),
        outputDate: new Date().toISOString().slice(0,10),
        outputType: 'BAJA',
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: notesBase,
        status: 'BORRADOR',
        details: [{ variantId: old.variantId, quantity: old.quantity, unitCost: 0, totalCost: 0, notes: notesBase }]
      } as any;
      calls.push(this.outputService.create(this.ruc, baja));
    } else {
      const entry = {
        entryNumber: this.buildNumber('DEV'),
        entryDate: new Date().toISOString().slice(0,10),
        entryType: 'DEVOLUCION',
        receivedBy: (this.auth.getCurrentUser()?.name || this.auth.getCurrentUser()?.username || 'Sistema') as string,
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: notesBase,
        status: 'BORRADOR',
        details: [{ variantId: old.variantId, quantity: old.quantity, unitCost: 0, taxPercentage: 0, taxAmount: 0, totalCost: 0, itemCondition: 'USADO', notes: notesBase }]
      } as any;
      calls.push(this.entryService.create(this.ruc, entry));
    }

    const entregaNueva = {
      outputNumber: this.buildNumber('REP'),
      outputDate: new Date().toISOString().slice(0,10),
      outputType: 'EPP_TRABAJADOR',
      employeeId: Number(this.selectedEmployee.id),
      authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
      notes: notesBase,
      status: 'BORRADOR',
      details: [{ variantId: newV.id, quantity: 1, unitCost: 0, totalCost: 0, notes: 'Reemplazo' }]
    } as any;
    calls.push(this.outputService.create(this.ruc, entregaNueva));

    forkJoin(calls).subscribe({
      next: (results: any[]) => {
        const confirmCalls: any[] = [];
        for (const res of (results || [])) {
          const id = Number(res?.id);
          if (!id) continue;
          if (res?.entryNumber) confirmCalls.push(this.entryService.confirm(this.ruc, id));
          if (res?.outputNumber) confirmCalls.push(this.outputService.confirm(this.ruc, id));
        }
        if (!confirmCalls.length) { this.loading = false; this.successMessage = 'Cambio registrado correctamente'; return; }
        forkJoin(confirmCalls).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Cambio registrado y confirmado'; },
          error: () => { this.loading = false; this.errorMessage = 'Cambio creado pero no se pudo confirmar'; }
        });
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo registrar el cambio'; }
    });
  }
}
