import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-mantenimiento-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class MantenimientoDashboardComponent implements OnInit {
  businessRuc: string = '';

  kpis = {
    vehiculosActivos: 134,
    mantenimientosHoy: 12,
    alertasCriticas: 3,
    saludOperativa: 98.2
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe(params => {
      this.businessRuc = params.get('ruc') || '';
    });
  }
}
