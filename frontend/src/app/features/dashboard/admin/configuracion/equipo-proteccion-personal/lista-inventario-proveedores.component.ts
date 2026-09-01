import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventorySupplierService } from '../../../../../services/inventory-supplier.service';

export interface InventarioProveedorItem {
  id: number;
  name: string;
  ruc?: string;
  phone?: string;
  email?: string;
  address?: string;
}

@Component({
  selector: 'app-lista-inventario-proveedores',
  templateUrl: './lista-inventario-proveedores.component.html',
  styleUrls: ['./epp-catalog.shared.scss']
})
export class ListaInventarioProveedoresComponent implements OnInit {
  items: InventarioProveedorItem[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly supplierApi: InventorySupplierService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.supplierApi.listGlobal().subscribe({
      next: (rows) => {
        this.items = (rows || []).map((r) => ({
          id: Number(r.id),
          name: r.name,
          ruc: r.ruc,
          phone: r.phone,
          email: r.email,
          address: r.address
        }));
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar los proveedores. Intente nuevamente.';
        this.loading = false;
      }
    });
  }

  nuevo(): void {
    void this.router.navigate(['/dashboard/admin/configuracion', 'equipo-proteccion-personal', 'proveedores', 'nuevo']);
  }

  editar(id: number | undefined): void {
    if (id) {
      void this.router.navigate(['/dashboard/admin/configuracion', 'equipo-proteccion-personal', 'proveedores', 'editar', id]);
    }
  }

  eliminar(id: number | undefined): void {
    if (!id) return;
    if (!confirm('¿Está seguro que desea eliminar este proveedor del catálogo global?')) return;
    this.supplierApi.deleteGlobal(id).subscribe({
      next: () => this.cargar(),
      error: () => {
        this.error = 'No se pudo eliminar el proveedor.';
      }
    });
  }

  volverAConfiguracion(): void {
    void this.router.navigate(['/dashboard/admin/configuracion']);
  }
}
