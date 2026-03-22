import { Component } from '@angular/core';

/**
 * Panel principal de Indicadores Reactivos / Proactivos (maquetación alineada al HTML de referencia Orientoil SSO).
 * Los valores son demostrativos hasta conectar API.
 */
@Component({
  selector: 'app-indicadores-reactivos-dashboard',
  templateUrl: './indicadores-reactivos-dashboard.component.html',
  styleUrls: ['./indicadores-reactivos-dashboard.component.scss']
})
export class IndicadoresReactivosDashboardComponent {
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
  anioFiscal = 2025;
  trimestreLabel = 'Q1';
  trimestreEstado = 'Activo';

  /** IF / IG mostrados como 0.0 en el mock; el aro vacío = 0% de avance hacia meta */
  indiceFrecuenciaValor = 0.0;
  indiceFrecuenciaMetaLabel = 'META: 0.0';
  indiceGravedadValor = 0.0;
  indiceGravedadBadge = 'OPTIMAL';
  tasaRiesgoDisplay = '—';

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
