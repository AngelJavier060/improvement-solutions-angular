import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calidad-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calidad-documentos.component.html',
  styleUrls: ['./calidad-documentos.component.scss']
})
export class CalidadDocumentosComponent {
  stats = [
    { label: 'Total de Documentos', value: '1,248', trend: '+12%',  trendUp: true,  border: 'brd--red'   },
    { label: 'Vigente',             value: '1,192', sub: '95.5% Cumplimiento',     border: 'brd--green' },
    { label: 'Expirados',           value: '56',    urgent: true,                  border: 'brd--err'   },
    { label: 'Próxima Revisión',    value: '18',    sub: 'Próximos 7 días',        border: 'brd--slate' },
  ];

  documents = [
    {
      n: '001', tipo: 'MANUAL',  proceso: 'CALIDAD',       codigo: 'MC-01',
      nombre: 'Manual de Gestión de Calidad ISO 9001:2015',
      elaboracion: '12/05/2023', revision: '12/11/2023', version: '08',
      proxRevision: '12/05/2024', diasVigencia: 365, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Gerencia de Calidad',
      vigencia: 'Anual', disposicion: 'Archivo Físico', norma: 'ISO 9001:2015',
      proceso2: 'Mejora Continua', subproceso: 'Revisión por la Dirección',
      correo: 'calidad@empresa.com', enlace: 'https://drive.google.com/mc01',
      observaciones: 'Documento maestro del SGC'
    },
    {
      n: '002', tipo: 'PROC',    proceso: 'OPERACIONES',   codigo: 'P-OP-04',
      nombre: 'Control de Procesos de Manufactura Pesada',
      elaboracion: '20/01/2023', revision: '20/07/2023', version: '03',
      proxRevision: '20/01/2024', diasVigencia: 0, estado: 'EXPIRADO', statusClass: 'st--err',
      almacenamiento: 'Carpeta Red', responsable: 'Jefe de Planta',
      vigencia: 'Anual', disposicion: 'Reciclaje', norma: 'ISO 9001:2015',
      proceso2: 'Producción', subproceso: 'Fabricación',
      correo: 'operaciones@empresa.com', enlace: 'https://drive.google.com/pop04',
      observaciones: 'Requiere actualización urgente'
    },
    {
      n: '003', tipo: 'FORMATO', proceso: 'LOGÍSTICA',     codigo: 'F-LO-12',
      nombre: 'Registro de Recepción de Materias Primas',
      elaboracion: '15/11/2023', revision: '15/02/2024', version: '01',
      proxRevision: '15/11/2024', diasVigencia: 245, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Almacén Central',
      vigencia: 'Anual', disposicion: 'Archivo Digital', norma: 'ISO 9001:2015',
      proceso2: 'Compras', subproceso: 'Recepción',
      correo: 'logistica@empresa.com', enlace: 'https://drive.google.com/flo12',
      observaciones: '—'
    },
    {
      n: '004', tipo: 'INSTR',   proceso: 'MANTENIMIENTO', codigo: 'I-MA-02',
      nombre: 'Limpieza y Calibración de Hornos Industriales',
      elaboracion: '05/08/2023', revision: '05/02/2024', version: '05',
      proxRevision: '05/08/2024', diasVigencia: 112, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Supervisor de Mantto.',
      vigencia: 'Anual', disposicion: 'Archivo Físico', norma: 'ISO 9001:2015',
      proceso2: 'Mantenimiento', subproceso: 'Mantenimiento Preventivo',
      correo: 'mantenimiento@empresa.com', enlace: 'https://drive.google.com/ima02',
      observaciones: 'Revisión programada'
    },
    {
      n: '005', tipo: 'POLIT',   proceso: 'SGC',           codigo: 'POL-02',
      nombre: 'Política de Seguridad de la Información',
      elaboracion: '10/02/2023', revision: '10/08/2023', version: '02',
      proxRevision: '10/02/2024', diasVigencia: 0, estado: 'EXPIRADO', statusClass: 'st--err',
      almacenamiento: 'Intranet', responsable: 'Dirección General',
      vigencia: 'Anual', disposicion: 'Destrucción Segura', norma: 'ISO 27001',
      proceso2: 'Dirección', subproceso: 'Gobierno Corporativo',
      correo: 'direccion@empresa.com', enlace: 'https://drive.google.com/pol02',
      observaciones: 'Aprobación pendiente'
    },
  ];

  barData = [60, 75, 90, 85, 95];
}
