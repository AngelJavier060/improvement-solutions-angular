import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';

@Component({
  selector: 'app-calidad-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calidad-documentos.component.html',
  styleUrls: ['./calidad-documentos.component.scss']
})
export class CalidadDocumentosComponent implements OnInit {
  showNewRecordForm = false;
  private ruc: string | null = null;
  private businessId: number | null = null;

  stats = [
    { label: 'Total de Documentos', value: '1,248', trend: '+12%',  trendUp: true,  border: 'brd--red'   },
    { label: 'Vigente',             value: '1,192', sub: '95.5% Cumplimiento',     border: 'brd--green' },
    { label: 'Expirados',           value: '56',    urgent: true,                  border: 'brd--err'   },
    { label: 'Próxima Revisión',    value: '18',    sub: 'Próximos 7 días',        border: 'brd--slate' },
  ];

  processOptions: string[] = [];

  documentTypeOptions: string[] = [];

  codeOptions: string[] = [];

  responsibleOptions = [
    'Juan Pérez - Jefe de Planta',
    'Maria Garcia - Coordinadora SGC',
    'Carlos Ruiz - Director Técnico'
  ];

  formModel = this.createDefaultFormModel();
  selectedFileName = '';

  documents = [
    {
      n: '001', tipo: 'MANUAL',  proceso: 'CALIDAD',       codigo: 'MC-01',
      nombre: 'Manual de Gestión de Calidad ISO 9001:2015',
      elaboracion: '12/05/2023', revision: '12/11/2023', version: '08',
      proxRevision: '12/05/2024', diasVigencia: 365, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Gerencia de Calidad',
      vigencia: 'Anual', disposicion: 'Archivo Físico', enlace: 'https://drive.google.com/mc01',
      observaciones: 'Documento maestro del SGC'
    },
    {
      n: '002', tipo: 'PROC',    proceso: 'OPERACIONES',   codigo: 'P-OP-04',
      nombre: 'Control de Procesos de Manufactura Pesada',
      elaboracion: '20/01/2023', revision: '20/07/2023', version: '03',
      proxRevision: '20/01/2024', diasVigencia: 0, estado: 'EXPIRADO', statusClass: 'st--err',
      almacenamiento: 'Carpeta Red', responsable: 'Jefe de Planta',
      vigencia: 'Anual', disposicion: 'Reciclaje', enlace: 'https://drive.google.com/pop04',
      observaciones: 'Requiere actualización urgente'
    },
    {
      n: '003', tipo: 'FORMATO', proceso: 'LOGÍSTICA',     codigo: 'F-LO-12',
      nombre: 'Registro de Recepción de Materias Primas',
      elaboracion: '15/11/2023', revision: '15/02/2024', version: '01',
      proxRevision: '15/11/2024', diasVigencia: 245, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Almacén Central',
      vigencia: 'Anual', disposicion: 'Archivo Digital', enlace: 'https://drive.google.com/flo12',
      observaciones: '—'
    },
    {
      n: '004', tipo: 'INSTR',   proceso: 'MANTENIMIENTO', codigo: 'I-MA-02',
      nombre: 'Limpieza y Calibración de Hornos Industriales',
      elaboracion: '05/08/2023', revision: '05/02/2024', version: '05',
      proxRevision: '05/08/2024', diasVigencia: 112, estado: 'VIGENTE', statusClass: 'st--ok',
      almacenamiento: 'Servidor SGI', responsable: 'Supervisor de Mantto.',
      vigencia: 'Anual', disposicion: 'Archivo Físico', enlace: 'https://drive.google.com/ima02',
      observaciones: 'Revisión programada'
    },
    {
      n: '005', tipo: 'POLIT',   proceso: 'SGC',           codigo: 'POL-02',
      nombre: 'Política de Seguridad de la Información',
      elaboracion: '10/02/2023', revision: '10/08/2023', version: '02',
      proxRevision: '10/02/2024', diasVigencia: 0, estado: 'EXPIRADO', statusClass: 'st--err',
      almacenamiento: 'Intranet', responsable: 'Dirección General',
      vigencia: 'Anual', disposicion: 'Destrucción Segura', enlace: 'https://drive.google.com/pol02',
      observaciones: 'Aprobación pendiente'
    },
  ];

  barData = [60, 75, 90, 85, 95];

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
  ) {}

  ngOnInit(): void {
    // Resolver parámetro :ruc desde la jerarquía de rutas
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) { this.ruc = found; break; }
      parent = parent.parent as ActivatedRoute | null;
    }

    if (!this.ruc) return;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (biz: any) => {
        const id = Number(biz?.id);
        if (!id) return;
        this.businessId = id;
        // Intentar poblar directamente desde la empresa si ya trae iso9001CatalogItems
        try {
          const directItems: any[] = Array.isArray((biz as any)?.iso9001CatalogItems) ? (biz as any).iso9001CatalogItems : [];
          if (directItems.length) {
            const pick = (code: string) => directItems.filter(x => String(x?.catalogCode) === code).map(x => (x?.name ?? '').toString().trim()).filter(Boolean);
            const uniq = (arr: string[]) => Array.from(new Set(arr));
            this.processOptions = uniq(pick('proceso'));
            this.documentTypeOptions = uniq(pick('tipo-documento'));
            this.codeOptions = uniq(pick('codigo'));
          }
        } catch {}
        // Cargar detalles de empresa (incluye ítems ISO 9001 por empresa)
        this.businessService.getDetails(id).subscribe({
          next: (details: any) => {
            const items: any[] = Array.isArray((details as any)?.iso9001CatalogItems) ? (details as any).iso9001CatalogItems : [];
            const pick = (code: string) => items.filter(x => String(x?.catalogCode) === code).map(x => (x?.name ?? '').toString().trim()).filter(Boolean);
            const uniq = (arr: string[]) => Array.from(new Set(arr));
            this.processOptions = uniq(pick('proceso'));
            this.documentTypeOptions = uniq(pick('tipo-documento'));
            this.codeOptions = uniq(pick('codigo'));
          },
          error: (err) => {
            console.error('No se pudo cargar detalles de empresa para ISO 9001:', err);
          }
        });
      },
      error: (err) => {
        console.error('No se pudo resolver empresa por RUC para ISO 9001:', err);
      }
    });
  }

  openNewRecordForm(): void {
    this.showNewRecordForm = true;
  }

  closeNewRecordForm(): void {
    this.showNewRecordForm = false;
    this.formModel = this.createDefaultFormModel();
    this.selectedFileName = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedFileName = file ? file.name : '';
  }

  saveRecord(): void {
    console.log('Nuevo registro de documento', {
      ...this.formModel,
      fileName: this.selectedFileName || null
    });
    this.closeNewRecordForm();
  }

  private createDefaultFormModel() {
    return {
      procesoPrincipal: '',
      tipoDocumento: '',
      codigoInterno: '',
      fechaElaboracion: '',
      nombreDocumento: '',
      responsable: '',
      observaciones: ''
    };
  }
}
