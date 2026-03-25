import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InventoryAlertService, InventoryAlerts } from '../../../../../services/inventory-alert.service';
import { InventoryProductService } from '../../../../../services/inventory-product.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inventario-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventario-dashboard.component.html',
  styleUrls: ['./inventario-dashboard.component.scss']
})
export class InventarioDashboardComponent implements OnInit {
  ruc: string = '';
  loading = false;
  alerts: InventoryAlerts | null = null;

  stats = [
    {
      title: 'Total Productos',
      value: '—',
      icon: 'fas fa-boxes',
      color: '#3498db',
      bgColor: 'rgba(52, 152, 219, 0.1)'
    },
    {
      title: 'Stock Bajo',
      value: '0',
      icon: 'fas fa-exclamation-triangle',
      color: '#f39c12',
      bgColor: 'rgba(243, 156, 18, 0.1)'
    },
    {
      title: 'Préstamos Activos',
      value: '0',
      icon: 'fas fa-handshake',
      color: '#9b59b6',
      bgColor: 'rgba(155, 89, 182, 0.1)'
    },
    {
      title: 'Alertas Totales',
      value: '0',
      icon: 'fas fa-bell',
      color: '#e74c3c',
      bgColor: 'rgba(231, 76, 60, 0.1)'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private alertService: InventoryAlertService,
    private productService: InventoryProductService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    // Load product count
    this.productService.list(this.ruc).pipe(catchError(() => of([]))).subscribe(products => {
      this.stats[0].value = String(products.length);
    });
    // Load alerts
    this.alertService.getAlerts(this.ruc).pipe(catchError(() => of(null))).subscribe(alerts => {
      this.loading = false;
      if (alerts) {
        this.alerts = alerts;
        this.stats[1].value = String(alerts.stockBajo?.length ?? 0);
        this.stats[2].value = String(alerts.prestamosActivos ?? 0);
        this.stats[3].value = String(alerts.totalAlertas ?? 0);
      }
    });
  }
}
