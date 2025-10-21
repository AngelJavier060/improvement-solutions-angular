import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryEntryService, InventoryEntry } from '../../../../../services/inventory-entry.service';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';

@Component({
  selector: 'app-historial-entradas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historial-entradas.component.html',
  styleUrls: ['./historial-entradas.component.scss']
})
export class HistorialEntradasComponent implements OnInit {
  ruc: string = '';
  loading = false;
  entries: InventoryEntry[] = [];
  suppliers: InventorySupplier[] = [];
  selectedEntry: InventoryEntry | null = null;
  
  // Filtros
  startDate: string = '';
  endDate: string = '';
  filterSupplierId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private entryService: InventoryEntryService,
    private supplierService: InventorySupplierService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadSuppliers();
    this.loadEntries();
  }

  loadSuppliers(): void {
    this.supplierService.list(this.ruc).subscribe({
      next: (data) => this.suppliers = data,
      error: () => this.suppliers = []
    });
  }

  loadEntries(): void {
    this.loading = true;
    this.entryService.list(this.ruc).subscribe({
      next: (data) => {
        this.entries = this.normalizeEntries(data as any[]);
        this.loading = false;
      },
      error: () => {
        this.entries = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    if (this.startDate && this.endDate) {
      this.loading = true;
      this.entryService.searchByDateRange(this.ruc, this.startDate, this.endDate).subscribe({
        next: (data) => {
          let result = this.normalizeEntries(data as any[]);
          if (this.filterSupplierId) {
            result = result.filter(e => e.supplierId === this.filterSupplierId);
          }
          this.entries = result;
          this.loading = false;
        },
        error: () => {
          this.entries = [];
          this.loading = false;
        }
      });
    } else if (this.filterSupplierId) {
      this.loading = true;
      this.entryService.findBySupplier(this.ruc, this.filterSupplierId).subscribe({
        next: (data) => {
          this.entries = this.normalizeEntries(data as any[]);
          this.loading = false;
        },
        error: () => {
          this.entries = [];
          this.loading = false;
        }
      });
    } else {
      this.loadEntries();
    }
  }

  private normalizeEntries(data: any[]): InventoryEntry[] {
    return (data || []).map((e: any) => {
      const supplier = e?.supplier;
      const details = (e?.details || []).map((d: any) => ({
        ...d,
        productName: d?.productName ?? d?.variant?.product?.name,
        variantCode: d?.variantCode ?? d?.variant?.code,
        productImage: d?.productImage ?? d?.variant?.product?.image
      }));
      return {
        ...e,
        supplierId: e?.supplierId ?? supplier?.id ?? null,
        supplierName: e?.supplierName ?? supplier?.name ?? null,
        details
      } as any;
    });
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.filterSupplierId = null;
    this.loadEntries();
  }

  viewDetails(entry: InventoryEntry): void {
    this.selectedEntry = entry;
  }

  getTotalAmount(): number {
    return this.entries.reduce((sum, entry) => {
      const entryTotal = entry.details?.reduce((s, d) => s + (d.totalCost || 0), 0) || 0;
      return sum + entryTotal;
    }, 0);
  }

  getEntryTypeBadge(type: string): string {
    const badges: any = {
      'COMPRA': 'bg-primary',
      'DEVOLUCION': 'bg-warning',
      'TRANSFERENCIA': 'bg-info',
      'AJUSTE': 'bg-secondary',
      'DONACION': 'bg-success'
    };
    return badges[type] || 'bg-secondary';
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      'CONFIRMADO': 'bg-success',
      'BORRADOR': 'bg-warning',
      'ANULADO': 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  }
}
