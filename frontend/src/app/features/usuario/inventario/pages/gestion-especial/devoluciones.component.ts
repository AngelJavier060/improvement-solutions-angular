import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { InventoryEntryService, InventoryEntry, InventoryEntryDetail } from '../../../../../services/inventory-entry.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { EmployeeService as THEmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-devoluciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-undo me-2 text-danger"></i>Devoluciones</h2>
            <div class="text-muted">Recibe, inspecciona y decide el destino de los productos devueltos</div>
          </div>
          <div>
            <button class="btn btn-outline-secondary btn-sm" (click)="resetAll()" [disabled]="loading"><i class="fas fa-broom me-2"></i>Limpiar</button>
          </div>
        </div>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-4">
          <div class="input-group input-group">
            <span class="input-group-text"><i class="fas fa-id-card"></i></span>
            <input type="text" class="form-control" [(ngModel)]="cedulaSearch" placeholder="Buscar por cédula" (keyup.enter)="searchByCedula()">
            <button type="button" class="btn btn-outline-secondary" (click)="searchByCedula()">Buscar</button>
          </div>
        </div>
        <div class="col-md-4">
          <div class="input-group input-group">
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

      <div class="card shadow-sm" *ngIf="selectedEmployee">
        <div class="card-header bg-light"><div class="fw-semibold">Productos asignados</div></div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:40px"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)"></th>
                  <th>Producto</th>
                  <th style="width:160px">Variante</th>
                  <th style="width:90px" class="text-end">Cant.</th>
                  <th style="width:220px">Inspección</th>
                  <th style="width:180px">Destino</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of assignedItems">
                  <td><input type="checkbox" [(ngModel)]="item.selected"></td>
                  <td>
                    <div class="fw-semibold">{{ item.productName || '—' }}</div>
                    <div class="text-muted small">{{ item.outputNumber || '' }}</div>
                  </td>
                  <td>{{ item.variantCode || '—' }}</td>
                  <td class="text-end">{{ item.quantity }}</td>
                  <td>
                    <select class="form-select form-select-sm" [(ngModel)]="item.inspection">
                      <option [ngValue]="'PERFECTO'">Perfecto</option>
                      <option [ngValue]="'BUENO'">Buen estado</option>
                      <option [ngValue]="'DANADO'">Dañado reparable</option>
                      <option [ngValue]="'INSERVIBLE'">Inservible</option>
                    </select>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" [(ngModel)]="item.destination">
                      <option [ngValue]="'INVENTARIO'">Volver a inventario</option>
                      <option [ngValue]="'REPARACION'">Enviar a reparación</option>
                      <option [ngValue]="'BAJA'">Dar de baja</option>
                    </select>
                  </td>
                </tr>
                <tr *ngIf="!assignedItems.length && !loading">
                  <td colspan="6" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <div>Sin asignaciones encontradas para este trabajador</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <div class="text-muted small">Selecciona los productos devueltos, inspecciónalos y define su destino</div>
          <div>
            <button class="btn btn-primary" (click)="submitReturns()" [disabled]="loading || !hasSelection()"><i class="fas fa-save me-2"></i>Registrar devolución</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    th[role="button"] { cursor: pointer; }
  `]
})
export class DevolucionesComponent implements OnInit {
  ruc: string = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  cedulaSearch = '';
  codigoSearch = '';
  selectedEmployee: EmployeeResponse | null = null;
  assignedItems: Array<{
    outputId: number;
    outputNumber: string;
    detailId: number;
    variantId: number;
    productName?: string;
    variantCode?: string;
    quantity: number;
    inspection: 'PERFECTO' | 'BUENO' | 'DANADO' | 'INSERVIBLE';
    destination: 'INVENTARIO' | 'REPARACION' | 'BAJA';
    selected: boolean;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private entryService: InventoryEntryService,
    private thEmployeeService: THEmployeeService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
  }

  resetAll(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedEmployee = null;
    this.assignedItems = [];
    this.cedulaSearch = '';
    this.codigoSearch = '';
  }

  hasSelection(): boolean { return this.assignedItems.some(x => x.selected); }
  allSelected(): boolean { return this.assignedItems.length > 0 && this.assignedItems.every(x => x.selected); }
  toggleAll(ev: any): void { const v = !!ev.target.checked; this.assignedItems.forEach(x => x.selected = v); }

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
        else { this.loading = false; this.errorMessage = 'Código no encontrado en esta empresa'; }
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
              quantity: Number((d as any).quantity || 0),
              inspection: 'PERFECTO',
              destination: 'INVENTARIO',
              selected: false
            });
          }
        }
        this.assignedItems = items;
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMessage = 'No se pudo cargar asignaciones del trabajador'; }
    });
  }

  private buildEntryNumber(prefix: string): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  submitReturns(): void {
    const selected = this.assignedItems.filter(x => x.selected);
    if (!selected.length || !this.selectedEmployee) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const toInventory = selected.filter(x => x.destination === 'INVENTARIO' || x.destination === 'REPARACION');
    const toBaja = selected.filter(x => x.destination === 'BAJA');

    const calls: any[] = [];
    if (toInventory.length) {
      const entry: InventoryEntry = {
        entryNumber: this.buildEntryNumber('DEV'),
        entryDate: new Date().toISOString().slice(0,10),
        entryType: 'DEVOLUCION',
        receivedBy: (this.auth.getCurrentUser()?.name || this.auth.getCurrentUser()?.username || 'Sistema') as string,
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: `Devolución de ${this.selectedEmployee.nombres} ${this.selectedEmployee.apellidos}`,
        status: 'BORRADOR',
        details: toInventory.map(it => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitCost: 0,
          taxPercentage: 0,
          taxAmount: 0,
          totalCost: 0,
          itemCondition: it.destination === 'REPARACION' ? 'USADO' : 'USADO',
          warehouseLocation: it.destination === 'REPARACION' ? 'REPARACION' : undefined,
          notes: `Inspección: ${it.inspection}`
        } as InventoryEntryDetail))
      } as any;
      calls.push(this.entryService.create(this.ruc, entry));
    }

    if (toBaja.length) {
      const output = {
        outputNumber: this.buildEntryNumber('BAJA'),
        outputDate: new Date().toISOString().slice(0,10),
        outputType: 'BAJA',
        authorizedBy: (this.auth.getCurrentUser()?.name || '') as string,
        notes: `Baja por devolución de ${this.selectedEmployee.nombres} ${this.selectedEmployee.apellidos}`,
        status: 'BORRADOR',
        details: toBaja.map(it => ({
          variantId: it.variantId,
          quantity: it.quantity,
          unitCost: 0,
          totalCost: 0,
          notes: `Inspección: ${it.inspection}`
        }))
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
        if (!confirmCalls.length) {
          this.loading = false;
          this.successMessage = 'Devolución registrada correctamente';
          this.assignedItems = [];
          return;
        }
        forkJoin(confirmCalls).subscribe({
          next: () => { this.loading = false; this.successMessage = 'Devolución registrada y confirmada'; this.assignedItems = []; },
          error: () => { this.loading = false; this.errorMessage = 'Devolución creada pero no se pudo confirmar'; }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo registrar la devolución';
      }
    });
  }
}
