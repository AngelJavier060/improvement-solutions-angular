import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calidad-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calidad-dashboard.component.html',
  styleUrls: ['./calidad-dashboard.component.scss']
})
export class CalidadDashboardComponent {
  departments = [
    { name: 'Producción y Ensamblaje',       docs: 482, pct: 85, rev: 10 },
    { name: 'Garantía de Calidad',           docs: 312, pct: 65, rev: 5  },
    { name: 'Logística y Cadena de Suministro', docs: 245, pct: 45, rev: 15 },
    { name: 'Recursos Humanos',              docs: 128, pct: 25, rev: 5  },
    { name: 'I+D / Ingeniería',              docs: 398, pct: 75, rev: 12 },
  ];

  criticalUpdates = [
    {
      tag: 'Acción Inmediata', tagClass: 'tag--danger',
      dot: 'dot--danger',
      text: 'Brecha de auditoría GAP-402 identificada en Línea de Producción B.',
      meta: 'Hace 24 minutos • Alta Prioridad'
    },
    {
      tag: 'Actualización de Política', tagClass: 'tag--muted',
      dot: 'dot--muted',
      text: 'Revisión 4.2 del Protocolo de Seguridad publicada.',
      meta: 'Hace 3 horas • Junta de Calidad'
    },
    {
      tag: 'Éxito', tagClass: 'tag--success',
      dot: 'dot--success',
      text: 'Fase 1 de Auditoría Externa completada con cero NCs.',
      meta: 'Ayer • Revisión Anual'
    },
    {
      tag: 'Notificación del Sistema', tagClass: 'tag--muted',
      dot: 'dot--muted',
      text: 'El Administrador actualizó los metadatos de cumplimiento.',
      meta: 'Ayer • Integridad de Datos'
    },
  ];

  docTable = [
    { id: 'QM-001', process: 'Manual de Gestión de Calidad ISO 9001:2015',   status: 'Vigente',     date: '14 Oct, 2023', resp: 'Dr. M. Richards', statusClass: 'badge--ok' },
    { id: 'PR-AS-04', process: 'Protocolos de Seguridad de Línea',           status: 'Expirado',    date: '02 Ene, 2023', resp: 'Ing. T. Sterling', statusClass: 'badge--err' },
    { id: 'WI-QA-12', process: 'Instrucción de Inspección Final',            status: 'Vigente',     date: '28 Sep, 2023', resp: 'J. Henderson',     statusClass: 'badge--ok' },
  ];
}
