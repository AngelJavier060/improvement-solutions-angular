import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../../services/business.service';
import { AttendanceService, SafetyIndicesSummary, ConsolidadoHhttSummary } from '../../../talento-humano/services/attendance.service';

/**
 * Panel principal de Indicadores Reactivos / Proactivos (maquetación alineada al HTML de referencia Orientoil SSO).
 * Los valores son demostrativos hasta conectar API.
 */
@Component({
  selector: 'app-indicadores-reactivos-dashboard',
  templateUrl: './indicadores-reactivos-dashboard.component.html',
  styleUrls: ['./indicadores-reactivos-dashboard.component.scss']
})
export class IndicadoresReactivosDashboardComponent implements OnInit {
  /** Circunferencia del aro r=40 (2πr) */
  readonly ringLen = 2 * Math.PI * 40;

  centroTrabajo = 'Centro de Trabajo Alpha';

  empresa = {
    razonSocial: 'ORIENTOIL S.A.',
    ruc: '1791808398001',
    representanteLegal: 'Rosmel Balcazar',
    totalTrabajadores: 265
  };

  indiceGestionPct = 98;
  indiceEficaciaPct = 100;
  indiceEficaciaDelta = '+0.0%';
  anioFiscal = new Date().getFullYear();
  trimestreLabel = 'Q1';
  trimestreEstado = 'Activo';

  /** IF / IG con datos reales del backend */
  indiceFrecuenciaValor = 0.0;
  indiceFrecuenciaMetaLabel = 'META: 0.25';
  /** Porcentaje de avance del aro (hacia la meta, cap 100) */
  indiceFrecuenciaPct = 0;
  indiceGravedadValor = 0.0;
  indiceGravedadBadge = 'OPTIMAL';
  /** Porcentaje de avance del aro IG */
  indiceGravedadPct = 0;
  tasaRiesgoDisplay = '—';

  private metaIf = 0.25;
  private metaIg = 5.0;
  private businessId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    let ruc: string | null = null;
    while (parent) {
      ruc = parent.snapshot.paramMap.get('ruc');
      if (ruc) break;
      parent = parent.parent;
    }
    if (!ruc) return;
    this.businessService.getByRuc(ruc).subscribe({
      next: (empresa: any) => {
        const id = empresa?.id;
        if (!id) return;
        this.businessId = Number(id);
        this.empresa.razonSocial   = empresa.name        ?? this.empresa.razonSocial;
        this.empresa.ruc           = empresa.ruc         ?? ruc!;
        this.empresa.representanteLegal = empresa.legalRepresentative ?? this.empresa.representanteLegal;
        // Fallback rápido si viene en el modelo
        if (typeof empresa.employeesCount === 'number') {
          this.empresa.totalTrabajadores = empresa.employeesCount;
        }
        this.fetchIndices();
        this.fetchTotalTrabajadores();
      },
      error: () => { /* silent – use fallback mock */ }
    });
  }

  private fetchIndices(): void {
    if (!this.businessId) return;
    const year = this.anioFiscal;
    this.attendanceService.getSafetyIndices(this.businessId, year).subscribe({
      next: (data: SafetyIndicesSummary) => {
        const ytd = data.ytd;
        this.indiceFrecuenciaValor = Math.round(ytd.if * 100) / 100;
        this.indiceFrecuenciaMetaLabel = 'META: ' + this.metaIf.toFixed(2);
        this.indiceFrecuenciaPct = this.metaIf > 0
          ? Math.min(100, Math.round((this.indiceFrecuenciaValor / this.metaIf) * 1000) / 10)
          : 0;

        this.indiceGravedadValor = Math.round(ytd.ig * 100) / 100;
        this.indiceGravedadPct  = this.metaIg > 0
          ? Math.min(100, Math.round((this.indiceGravedadValor / this.metaIg) * 1000) / 10)
          : 0;
        this.indiceGravedadBadge = this.indiceGravedadValor === 0 ? 'OPTIMAL'
          : this.indiceGravedadValor < this.metaIg ? 'DENTRO META' : 'SUPERA META';

        if (ytd.horasHombre > 0 && ytd.if > 0) {
          this.tasaRiesgoDisplay = (ytd.ig / ytd.if).toFixed(2);
        } else {
          this.tasaRiesgoDisplay = '—';
        }
      },
      error: () => { /* keep defaults */ }
    });
  }

  /** Obtiene el total de trabajadores activos desde Talento Humano (Consolidado HHTT) */
  private fetchTotalTrabajadores(): void {
    if (!this.businessId) return;
    const year = this.anioFiscal;
    this.attendanceService.getConsolidadoHhtt(this.businessId, year).subscribe({
      next: (sum: ConsolidadoHhttSummary) => {
        const total = sum?.activeEmployees ?? 0;
        if (total >= 0) {
          this.empresa.totalTrabajadores = total;
        }
      },
      error: () => { /* mantener valor actual si falla */ }
    });
  }

  proactivos = {
    iart: 92.98,
    opas: 99.2,
    idps: 98.0,
    ids: 99.6,
    ients: 100.0,
    osea: 99.9,
    icai: 100.0
  };

  dashOffset(porcentajeAvance: number): number {
    const p = Math.max(0, Math.min(100, porcentajeAvance));
    return this.ringLen * (1 - p / 100);
  }
}
