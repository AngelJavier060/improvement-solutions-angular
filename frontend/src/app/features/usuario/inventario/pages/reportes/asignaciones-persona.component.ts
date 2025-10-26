import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { EmployeeService as THEmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';

@Component({
  selector: 'app-asignaciones-persona',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row mb-3">
        <div class="col-12 d-flex align-items-center justify-content-between">
          <div>
            <h2 class="mb-1"><i class="fas fa-user-check me-2"></i>Asignaciones por Persona</h2>
            <div class="text-muted">Consulta EPP asignado, préstamos y su historial</div>
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
        <div class="col-12"><div class="alert alert-danger">{{ errorMessage }}</div></div>
      </div>

      <div class="row" *ngIf="selectedEmployee">
        <div class="col-lg-6">
          <div class="card shadow-sm mb-3">
            <div class="card-header bg-light"><div class="fw-semibold">EPP actualmente asignado</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Variante</th>
                      <th class="text-end" style="width:90px">Cant.</th>
                      <th class="text-end" style="width:120px">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let it of currentAssigned">
                      <td>{{ it.variantCode || '—' }}</td>
                      <td class="text-end">{{ it.quantity }}</td>
                      <td class="text-end">{{ (it.totalCost ?? (it.unitCost||0)*it.quantity) | number:'1.2-2' }}</td>
                    </tr>
                    <tr *ngIf="!currentAssigned.length"><td colspan="3" class="text-center text-muted py-2">Sin EPP asignado</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="card-footer text-end">
              <strong>Total:</strong> {{ totalAssigned | number:'1.2-2' }}
            </div>
          </div>

          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Herramientas prestadas</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Variante</th>
                      <th>Entrega</th>
                      <th>Debe devolver</th>
                      <th class="text-end">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of currentLoans">
                      <td>{{ p.variantCode }}</td>
                      <td>{{ p.outputDate }}</td>
                      <td>{{ p.returnDate || '—' }}</td>
                      <td class="text-end">
                        <span class="badge" [ngClass]="getBadgeClass(p)">{{ getLoanStatus(p) }}</span>
                      </td>
                    </tr>
                    <tr *ngIf="!currentLoans.length"><td colspan="4" class="text-center text-muted py-2">Sin préstamos</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card shadow-sm">
            <div class="card-header bg-light"><div class="fw-semibold">Historial</div></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Variante</th>
                      <th class="text-end">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let o of outputsHistory">
                      <td>{{ o.outputDate }}</td>
                      <td>{{ o.outputType }}</td>
                      <td>{{ o.detailVariantCode }}</td>
                      <td class="text-end">{{ o.detailQuantity }}</td>
                    </tr>
                    <tr *ngIf="!outputsHistory.length"><td colspan="4" class="text-center text-muted py-2">Sin historial</td></tr>
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
    .badge.bg-danger { background-color: #dc3545 !important; }
    .badge.bg-warning { background-color: #ffc107 !important; color: #212529; }
    .badge.bg-secondary { background-color: #6c757d !important; }
  `]
})
export class AsignacionesPersonaComponent implements OnInit {
  ruc: string = '';
  cedulaSearch = '';
  codigoSearch = '';
  selectedEmployee: EmployeeResponse | null = null;
  errorMessage = '';

  currentAssigned: Array<{ variantCode: string; quantity: number; unitCost?: number; totalCost?: number; } & any> = [];
  totalAssigned = 0;
  currentLoans: Array<{ variantCode: string; outputDate: string; returnDate?: string; } & any> = [];
  outputsHistory: Array<{ outputDate: string; outputType: string; detailVariantCode: string; detailQuantity: number; } & InventoryOutput> = [];

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private thEmployeeService: THEmployeeService
  ) {}

  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; }

  searchByCedula(): void {
    const c = (this.cedulaSearch || '').trim();
    if (!c) return;
    this.errorMessage = '';
    this.thEmployeeService.getEmployeeByCedulaScopedByRuc(this.ruc, c).subscribe({
      next: (emp) => { this.selectedEmployee = emp; this.loadForEmployee(); },
      error: () => { this.errorMessage = 'No se encontró trabajador con esa cédula'; }
    });
  }

  searchByCodigo(): void {
    const code = (this.codigoSearch || '').trim();
    if (!code) return;
    this.errorMessage = '';
    this.thEmployeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code }).subscribe({
      next: (page) => { const emp = page?.content?.[0]; if (emp) { this.selectedEmployee = emp as any; this.loadForEmployee(); } else { this.errorMessage = 'Código no encontrado'; } },
      error: () => { this.errorMessage = 'Error buscando por código'; }
    });
  }

  private loadForEmployee(): void {
    if (!this.selectedEmployee?.id) return;
    this.outputService.findByEmployee(this.ruc, Number(this.selectedEmployee.id)).subscribe({
      next: (outs) => {
        const assigned: any[] = [];
        const loans: any[] = [];
        const history: any[] = [];
        const today = new Date().toISOString().slice(0,10);
        for (const o of (outs || [])) {
          const details = Array.isArray((o as any).details) ? (o as any).details : [];
          for (const d of details) {
            history.push({ ...o, detailVariantCode: d.variantCode, detailQuantity: d.quantity });
          }
          if ((o as any).status === 'CONFIRMADO' && (o as any).outputType === 'EPP_TRABAJADOR') {
            for (const d of details) assigned.push(d);
          }
          if ((o as any).status === 'CONFIRMADO' && (o as any).outputType === 'PRESTAMO') {
            for (const d of details) loans.push({ variantCode: d.variantCode, outputDate: (o as any).outputDate, returnDate: (o as any).returnDate });
          }
        }
        this.currentAssigned = assigned;
        this.totalAssigned = assigned.reduce((acc, it) => acc + ((it.totalCost ?? (it.unitCost||0) * it.quantity) as number), 0);
        this.currentLoans = loans.filter(x => !x.returnDate || x.returnDate >= today);
        this.outputsHistory = history.sort((a,b) => (a.outputDate||'').localeCompare(b.outputDate||''));
      },
      error: () => { this.errorMessage = 'No se pudo cargar datos del trabajador'; }
    });
  }

  private parseDate(d?: string): Date | null { if (!d) return null; const dt = new Date(d); return isNaN(+dt) ? null : dt; }
  private daysDiff(from?: string, to?: string): number | null { const a=this.parseDate(from); const b=this.parseDate(to); if(!a||!b) return null; return Math.floor((b.getTime()-a.getTime())/(1000*60*60*24)); }
  getLoanStatus(o: any): string { const today=new Date().toISOString().slice(0,10); const diff=this.daysDiff(today,o.returnDate); if(diff==null) return '—'; if(diff<0) return 'Vencido'; if(diff<=3) return 'Por vencer'; return 'Prestado'; }
  getBadgeClass(o: any): any { const s=this.getLoanStatus(o); return { 'bg-danger': s==='Vencido', 'bg-warning': s==='Por vencer', 'bg-secondary': s==='Prestado' }; }
}
