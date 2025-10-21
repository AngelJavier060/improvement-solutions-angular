import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-inventario-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario-dashboard.component.html',
  styleUrls: ['./inventario-dashboard.component.scss']
})
export class InventarioDashboardComponent implements OnInit {
  ruc: string = '';

  stats = [
    {
      title: 'Total Productos',
      value: '0',
      icon: 'fas fa-boxes',
      color: '#3498db',
      bgColor: 'rgba(52, 152, 219, 0.1)'
    },
    {
      title: 'Ingresos Hoy',
      value: '0',
      icon: 'fas fa-arrow-down',
      color: '#2ecc71',
      bgColor: 'rgba(46, 204, 113, 0.1)'
    },
    {
      title: 'Salidas Hoy',
      value: '0',
      icon: 'fas fa-arrow-up',
      color: '#e74c3c',
      bgColor: 'rgba(231, 76, 60, 0.1)'
    },
    {
      title: 'Stock Bajo',
      value: '0',
      icon: 'fas fa-exclamation-triangle',
      color: '#f39c12',
      bgColor: 'rgba(243, 156, 18, 0.1)'
    }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
  }
}
