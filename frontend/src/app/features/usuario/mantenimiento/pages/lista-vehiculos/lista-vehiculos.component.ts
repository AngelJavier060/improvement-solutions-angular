import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FleetService } from '../../../../../services/fleet.service';
import { Vehicle, VehicleKPIs } from '../../../../../models/vehicle.model';

@Component({
  selector: 'app-lista-vehiculos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-vehiculos.component.html',
  styleUrls: ['./lista-vehiculos.component.scss']
})
export class ListaVehiculosComponent implements OnInit {
  businessRuc: string = '';
  vehicles: Vehicle[] = [];
  kpis: VehicleKPIs = {
    saludOperativa: 0,
    saludOperativaTendencia: 0,
    programadosHoy: 0,
    estadoActivo: 0,
    alertasCriticas: 0
  };

  currentPage = 1;
  pageSize = 25;
  totalCount = 0;
  totalPages = 1;

  loading = false;
  error = '';
  Math = Math;

  selectedVehicle: Vehicle | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService
  ) {}

  openVehicleDetail(vehicle: Vehicle): void {
    if (vehicle.id == null) return;
    this.selectedVehicle = vehicle;
  }

  closeVehicleDetail(): void {
    this.selectedVehicle = null;
  }

  editarFicha(vehicle: Vehicle): void {
    if (vehicle.id == null) return;
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'editar-ficha', vehicle.id]);
  }

  eliminarVehiculo(vehicle: Vehicle): void {
    if (vehicle.id == null) return;
    const label = vehicle.placa || vehicle.codigoEquipo || 'este vehículo';
    if (!confirm(`¿Eliminar de la flota ${label}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.fleetService.deleteVehicle(this.businessRuc, vehicle.id).subscribe({
      next: () => this.loadVehicles(),
      error: err => {
        console.error(err);
        const msg = err?.error?.message || err?.message || 'No se pudo eliminar.';
        alert(String(msg));
      }
    });
  }

  ngOnInit(): void {
    const parent = this.route.parent;
    if (!parent) {
      this.error = 'Ruta inválida: falta el contexto de empresa.';
      return;
    }
    parent.paramMap.subscribe(pm => {
      const ruc = (pm.get('ruc') || '').trim();
      const prev = this.businessRuc;
      this.businessRuc = ruc;
      if (!ruc) {
        this.loading = false;
        this.vehicles = [];
        this.error = 'No se encontró el RUC en la URL.';
        return;
      }
      if (ruc !== prev) {
        this.currentPage = 1;
      }
      this.loadVehicles();
    });
  }

  loadVehicles(): void {
    const ruc = (this.businessRuc || '').trim();
    if (!ruc) {
      this.loading = false;
      this.error = 'No se pudo obtener el RUC de la empresa.';
      return;
    }
    this.loading = true;
    this.error = '';

    this.fleetService.getVehicles(ruc, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.vehicles = response.vehicles || [];
        this.kpis = response.kpis;
        this.totalCount = response.totalCount;
        this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar los vehículos. Compruebe que el backend esté disponible.';
        this.loading = false;
        this.vehicles = [];
        this.totalCount = 0;
        this.totalPages = 1;
        this.kpis = {
          saludOperativa: 0,
          saludOperativaTendencia: 0,
          programadosHoy: 0,
          estadoActivo: 0,
          alertasCriticas: 0
        };
      }
    });
  }

  get pages(): number[] {
    const tp = this.totalPages;
    const max = 12;
    if (tp <= max) {
      return Array.from({ length: tp }, (_, i) => i + 1);
    }
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end = Math.min(tp, start + max - 1);
    start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadVehicles();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  navigateToNewVehicle(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'nueva-ficha']);
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'ACTIVO':
        return 'status-active';
      case 'EN_TALLER':
        return 'status-pending';
      case 'DADO_DE_BAJA':
        return 'status-inactive';
      default:
        return '';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'ACTIVO':
        return 'OPERATIVO';
      case 'EN_TALLER':
        return 'MANTENIMIENTO';
      case 'DADO_DE_BAJA':
        return 'DADO DE BAJA';
      default:
        return status || '—';
    }
  }

  isUrgent(vehicle: Vehicle): boolean {
    return vehicle.proximoMantenimiento === 'INMEDIATO' || vehicle.estadoActivo === 'EN_TALLER';
  }
}
