import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { Subscription } from 'rxjs';
import { FleetService } from '../../../../../services/fleet.service';
import { Vehicle, VehicleKPIs } from '../../../../../models/vehicle.model';

@Component({
  selector: 'app-mantenimiento-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxEchartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ]
})
export class MantenimientoDashboardComponent implements OnInit, OnDestroy {
  businessRuc = '';
  loading = true;
  error = '';

  kpis: VehicleKPIs = {
    saludOperativa: 0,
    saludOperativaTendencia: 0,
    programadosHoy: 0,
    estadoActivo: 0,
    alertasCriticas: 0,
    dadoDeBaja: 0,
    totalFlota: 0,
    enTaller: 0
  };

  vehicles: Vehicle[] = [];
  totalCount = 0;
  recentCritical: Vehicle[] = [];

  statusBreakdown = {
    operativo: 0,
    enTaller: 0,
    critico: 0
  };

  activityChartOptions: EChartsOption = {};
  statusChartOptions: EChartsOption = {};
  activityChartTitle = 'Flota por clase';

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService
  ) {}

  ngOnInit(): void {
    const parent = this.route.parent;
    if (!parent) {
      this.loading = false;
      this.error = 'Ruta inválida: falta el contexto de empresa.';
      return;
    }
    this.routeSub = parent.paramMap.subscribe(pm => {
      const ruc = (pm.get('ruc') || '').trim();
      this.businessRuc = ruc;
      if (!ruc) {
        this.loading = false;
        this.error = 'No se encontró el RUC en la URL.';
        return;
      }
      this.loadDashboard(ruc);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadDashboard(ruc: string): void {
    this.loading = true;
    this.error = '';

    this.fleetService.getVehicles(ruc, 1, 100).subscribe({
      next: response => {
        this.vehicles = response.vehicles || [];
        this.totalCount = response.totalCount ?? this.vehicles.length;
        this.kpis = {
          ...this.kpis,
          ...(response.kpis || {})
        };

        const operativo =
          this.kpis.estadoActivo ??
          this.vehicles.filter(v => v.estadoActivo === 'ACTIVO').length;
        const enTaller =
          this.kpis.enTaller ??
          this.kpis.alertasCriticas ??
          this.vehicles.filter(v => v.estadoActivo === 'EN_TALLER').length;
        const critico =
          this.kpis.dadoDeBaja ??
          this.vehicles.filter(v => v.estadoActivo === 'DADO_DE_BAJA').length;

        this.statusBreakdown = { operativo, enTaller, critico };

        if (this.kpis.totalFlota == null) {
          this.kpis.totalFlota = this.totalCount;
        }
        if (this.kpis.programadosHoy == null) {
          this.kpis.programadosHoy = enTaller;
        }

        this.recentCritical = this.vehicles
          .filter(
            v =>
              v.estadoActivo === 'EN_TALLER' ||
              v.estadoActivo === 'DADO_DE_BAJA' ||
              v.proximoMantenimiento === 'INMEDIATO'
          )
          .slice(0, 8);

        this.buildCharts();
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
        this.error = 'No se pudieron cargar los datos de flota. Compruebe que el backend esté disponible.';
        this.buildCharts();
      }
    });
  }

  private buildCharts(): void {
    const byClase = new Map<string, { total: number; taller: number }>();
    for (const v of this.vehicles) {
      const key = (v.clase || 'Sin clase').trim() || 'Sin clase';
      const cur = byClase.get(key) || { total: 0, taller: 0 };
      cur.total += 1;
      if (v.estadoActivo === 'EN_TALLER') cur.taller += 1;
      byClase.set(key, cur);
    }

    const claseEntries = Array.from(byClase.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);

    if (claseEntries.length > 0) {
      this.activityChartTitle = 'Flota por clase';
      const labels = claseEntries.map(e => e[0]);
      const operativos = claseEntries.map(e => e[1].total - e[1].taller);
      const enTaller = claseEntries.map(e => e[1].taller);

      this.activityChartOptions = {
        color: ['#4648d4', '#c0c1ff'],
        tooltip: { trigger: 'axis' },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          itemHeight: 8,
          textStyle: { color: '#464554', fontSize: 12 }
        },
        grid: { left: 40, right: 16, top: 24, bottom: 48 },
        xAxis: {
          type: 'category',
          data: labels,
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            color: '#464554',
            fontSize: 11,
            interval: 0,
            rotate: labels.length > 5 ? 22 : 0
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#464554' }
        },
        series: [
          {
            name: 'Operativos',
            type: 'bar',
            stack: 'flota',
            data: operativos,
            barMaxWidth: 36,
            itemStyle: { borderRadius: [0, 0, 0, 0] }
          },
          {
            name: 'En mantenimiento',
            type: 'bar',
            stack: 'flota',
            data: enTaller,
            barMaxWidth: 36,
            itemStyle: { borderRadius: [4, 4, 0, 0] }
          }
        ]
      };
    } else {
      this.activityChartTitle = 'Resumen de actividad';
      this.activityChartOptions = {
        color: ['#4648d4', '#c0c1ff'],
        tooltip: { trigger: 'axis' },
        legend: {
          bottom: 0,
          icon: 'circle',
          itemWidth: 8,
          textStyle: { color: '#464554', fontSize: 12 }
        },
        grid: { left: 40, right: 16, top: 24, bottom: 48 },
        xAxis: {
          type: 'category',
          data: ['Operativo', 'En taller', 'Fuera de servicio'],
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: '#464554', fontSize: 11 }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#464554' }
        },
        series: [
          {
            name: 'Unidades',
            type: 'bar',
            data: [
              this.statusBreakdown.operativo,
              this.statusBreakdown.enTaller,
              this.statusBreakdown.critico
            ],
            barMaxWidth: 40,
            itemStyle: { borderRadius: [4, 4, 0, 0] }
          }
        ]
      };
    }

    const op = this.statusBreakdown.operativo;
    const taller = this.statusBreakdown.enTaller;
    const crit = this.statusBreakdown.critico;
    const hasData = op + taller + crit > 0;

    this.statusChartOptions = {
      color: ['#4648d4', '#4b41e1', '#ba1a1a'],
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['62%', '82%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: hasData
            ? [
                { name: 'Operativo', value: op },
                { name: 'En mantenimiento', value: taller },
                { name: 'Fuera de servicio', value: crit }
              ]
            : [{ name: 'Sin datos', value: 1, itemStyle: { color: '#d9e3f6' } }]
        }
      ]
    };
  }

  tendenciaSign(): number {
    return Number(this.kpis.saludOperativaTendencia || 0);
  }

  goNuevoVehiculo(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'nueva-ficha']);
  }

  goFlota(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento']);
  }

  goDocumentacion(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion']);
  }

  goVehicle(v: Vehicle): void {
    if (v.id == null) return;
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'editar-ficha', v.id]);
  }

  statusLabel(v: Vehicle): string {
    switch (v.estadoActivo) {
      case 'ACTIVO':
        return 'Operativo';
      case 'EN_TALLER':
        return 'En taller';
      case 'DADO_DE_BAJA':
        return 'Fuera de servicio';
      default:
        return v.estadoActivo || '—';
    }
  }

  statusTone(v: Vehicle): string {
    switch (v.estadoActivo) {
      case 'ACTIVO':
        return 'ok';
      case 'EN_TALLER':
        return 'warn';
      case 'DADO_DE_BAJA':
        return 'danger';
      default:
        return '';
    }
  }
}
