import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FileService } from '../../../../../services/file.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { InventoryOutputService, InventoryOutput } from '../../../../../services/inventory-output.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { CambioEppSolicitudService } from '../../../../../services/cambio-epp-solicitud.service';

interface SuministroRow {
  documento: string;
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  fecha: string;
  anio: number;
}

@Component({
  selector: 'app-historial-salidas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historial-salidas.component.html',
  styleUrls: ['./historial-salidas.component.scss']
})
export class HistorialSalidasComponent implements OnInit {
  ruc: string = '';
  loading = false;
  outputs: InventoryOutput[] = [];
  employees: EmployeeResponse[] = [];
  selectedOutput: InventoryOutput | null = null;
  departments: Department[] = [];

  // Filtros del listado (sin cambios de comportamiento)
  startDate: string = '';
  endDate: string = '';
  filterEmployeeId: number | null = null;
  filterOutputType: string = '';

  // Reporte resumen por persona
  reportEmployeeId: number | null = null;
  reportYear: number = new Date().getFullYear();
  reportMonth: number | null = null;
  reportBusy = false;
  reportMessage = '';
  reportYears: number[] = [];
  reportMonths = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];
  private businessLogoDataUrl = '';
  private businessName = '';
  private readonly brandBlue = '#1b365d';
  private readonly brandLight = '#b3c6e7';

  actionMessage = '';
  actionError = '';
  uploadingOutputId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private employeeService: EmployeeService,
    private fileService: FileService,
    private departmentService: DepartmentService,
    private businessService: BusinessService,
    private cambioEppSolicitudService: CambioEppSolicitudService
  ) {
    const y = new Date().getFullYear();
    for (let i = 0; i < 8; i++) this.reportYears.push(y - i);
  }

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadEmployees();
    this.loadOutputs();
    this.loadDepartments();
    this.loadBusinessLogo();
  }

  loadEmployees(): void {
    this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
      next: (data) => this.employees = data,
      error: () => this.employees = []
    });
  }

  loadOutputs(): void {
    this.loading = true;
    this.outputService.list(this.ruc).subscribe({
      next: (data) => {
        this.outputs = this.sortOutputsNewestFirst(data || []);
        this.loading = false;
      },
      error: () => {
        this.outputs = [];
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    if (this.startDate && this.endDate) {
      this.loading = true;
      this.outputService.searchByDateRange(this.ruc, this.startDate, this.endDate).subscribe({
        next: (data) => {
          let result = data || [];
          if (this.filterEmployeeId) {
            result = result.filter(e => e.employeeId === this.filterEmployeeId);
          }
          if (this.filterOutputType) {
            result = result.filter(e => e.outputType === this.filterOutputType);
          }
          this.outputs = this.sortOutputsNewestFirst(result);
          this.loading = false;
        },
        error: () => {
          this.outputs = [];
          this.loading = false;
        }
      });
    } else if (this.filterEmployeeId || this.filterOutputType) {
      this.loading = true;
      let observable = this.outputService.list(this.ruc);
      
      if (this.filterEmployeeId) {
        observable = this.outputService.findByEmployee(this.ruc, this.filterEmployeeId);
      } else if (this.filterOutputType) {
        observable = this.outputService.findByType(this.ruc, this.filterOutputType);
      }
      
      observable.subscribe({
        next: (data) => {
          this.outputs = this.sortOutputsNewestFirst(data || []);
          this.loading = false;
        },
        error: () => {
          this.outputs = [];
          this.loading = false;
        }
      });
    } else {
      this.loadOutputs();
    }
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.filterEmployeeId = null;
    this.filterOutputType = '';
    this.loadOutputs();
  }

  viewDetails(output: InventoryOutput): void {
    this.selectedOutput = output;
  }

  cancelOutput(output: InventoryOutput): void {
    if (!output?.id || output.status !== 'BORRADOR') return;
    if (!confirm(`¿Anular el borrador ${output.outputNumber}? No afectará stock.`)) return;
    this.loading = true;
    this.outputService.cancel(this.ruc, output.id).subscribe({
      next: () => {
        output.status = 'ANULADO';
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        alert(err?.error?.message || 'No se pudo anular la salida');
      }
    });
  }

  /** Solo aplica a salidas originadas por Cambio de EPP (no a salidas normales). */
  needsThreeSignaturesUpload(output: InventoryOutput): boolean {
    if (!output || output.status !== 'BORRADOR') return false;
    if (output.outputType !== 'EPP_TRABAJADOR') return false;
    const notes = String(output.notes || '');
    // Obligatorio el tag de Cambio EPP: no otras entregas EPP ni préstamos/bajas.
    return notes.includes('[CAMBIO-EPP:') && notes.includes('[PENDIENTE_3_FIRMAS]');
  }

  getDespachadorLabel(output: InventoryOutput): string {
    const m = String(output?.notes || '').match(/\[DESPACHA:([^\]]+)\]/);
    return m?.[1]?.trim() || output?.authorizedBy || '—';
  }

  downloadOutputPdf(output: InventoryOutput): void {
    this.actionError = '';
    if (!output?.documentImage) {
      this.actionError = 'Esta salida aún no tiene PDF asociado.';
      return;
    }
    const url = this.getDocumentUrl(output.documentImage);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `${output.outputNumber || 'salida'}.pdf`;
    a.click();
  }

  triggerUploadSignedPdf(output: InventoryOutput): void {
    if (!output?.id || !this.needsThreeSignaturesUpload(output)) return;
    this.uploadingOutputId = output.id;
    const input = document.getElementById('hist-signed-pdf-input') as HTMLInputElement | null;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onSignedPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    const outputId = this.uploadingOutputId;
    this.uploadingOutputId = null;
    if (!file || !outputId) return;

    const okType = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name);
    if (!okType) {
      this.actionError = 'Suba un PDF con las 3 firmas (SSA, Área y quien despacha).';
      return;
    }

    const output = this.outputs.find(o => Number(o.id) === Number(outputId));
    if (!output?.id) return;

    this.loading = true;
    this.actionError = '';
    this.actionMessage = '';

    this.fileService.uploadFileToDirectory('inventory_outputs', file).subscribe({
      next: (resp) => {
        const path = resp?.url || '';
        if (!path) {
          this.loading = false;
          this.actionError = 'No se pudo subir el PDF.';
          return;
        }
        this.outputService.updateDocument(this.ruc, output.id!, path).subscribe({
          next: () => {
            this.outputService.confirm(this.ruc, output.id!).subscribe({
              next: () => {
                const notes = String(output.notes || '').replace('[PENDIENTE_3_FIRMAS]', '[PDF_3_FIRMAS_OK]');
                output.status = 'CONFIRMADO';
                output.documentImage = path;
                output.notes = notes;
                this.closeCambioSolicitudIfNeeded(output);
              },
              error: (err) => {
                this.loading = false;
                this.actionError = err?.error?.message || 'PDF subido, pero falló confirmar el stock.';
              }
            });
          },
          error: () => {
            this.loading = false;
            this.actionError = 'No se pudo asociar el PDF a la salida.';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.actionError = 'Error al subir el PDF firmado.';
      }
    });
  }

  private closeCambioSolicitudIfNeeded(output: InventoryOutput): void {
    const notes = String(output.notes || '');
    const idMatch = notes.match(/\[SOLICITUD_ID:([^\]]+)\]/);
    const repMatch = notes.match(/\[CAMBIO-EPP:([^\]]+)\]/);
    const solicitudId = idMatch?.[1]?.trim();
    const nReporte = repMatch?.[1]?.trim();

    const finishOk = () => {
      this.loading = false;
      this.actionMessage =
        `Entrega cerrada (${output.outputNumber}). PDF con 3 firmas guardado. Stock actualizado. Entrega de EPP asegurada.`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!solicitudId && !nReporte) {
      finishOk();
      return;
    }

    if (solicitudId) {
      this.cambioEppSolicitudService.markEntregado(this.ruc, solicitudId, output.id, output.outputNumber).subscribe({
        next: () => finishOk(),
        error: () => {
          // Si ya no está en espera, igual la salida quedó confirmada.
          finishOk();
        }
      });
      return;
    }

    this.cambioEppSolicitudService.list(this.ruc).subscribe({
      next: (rows) => {
        const found = (rows || []).find(s => String(s.nReporte || '') === String(nReporte));
        if (!found?.id) {
          finishOk();
          return;
        }
        this.cambioEppSolicitudService.markEntregado(this.ruc, found.id, output.id, output.outputNumber).subscribe({
          next: () => finishOk(),
          error: () => finishOk()
        });
      },
      error: () => finishOk()
    });
  }

  getTotalAmount(): number {
    return this.outputs.reduce((sum, output) => {
      const outputTotal = output.details?.reduce((s, d) => s + (d.totalCost || 0), 0) || 0;
      return sum + outputTotal;
    }, 0);
  }

  getOutputTypeBadge(type: string): string {
    const badges: any = {
      'EPP_TRABAJADOR': 'bg-primary',
      'PRESTAMO': 'bg-warning',
      'CONSUMO_AREA': 'bg-info',
      'BAJA': 'bg-danger'
    };
    return badges[type] || 'bg-secondary';
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      'CONFIRMADO': 'bg-success',
      'BORRADOR': 'bg-warning',
      'ANULADO': 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  }

  isEmployeeActive(emp: EmployeeResponse | null | undefined): boolean {
    return EmployeeService.isEmployeeActive(emp);
  }

  getEmployeeName(employeeId?: number, notes?: string): string {
    if (employeeId) {
      const employee = this.employees.find(e => e.id === employeeId);
      if (employee) {
        const name = `${employee.nombres || ''} ${employee.apellidos || ''}`.trim();
        return this.isEmployeeActive(employee) ? name : `${name} (INACTIVO)`;
      }
    }
    const snap = String(notes || '').match(/\[TRABAJADOR:([^\]]+)\]/);
    if (snap?.[1]) return snap[1].trim();
    return employeeId ? `#${employeeId}` : '';
  }

  employeeFilterLabel(e: EmployeeResponse): string {
    const name = `${e.nombres || ''} ${e.apellidos || ''}`.trim();
    return this.isEmployeeActive(e) ? name : `${name} (INACTIVO)`;
  }

  getDocumentUrl(path?: string): string {
    if (!path) return '';
    return this.fileService.getFileUrl(path);
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => this.departments = data || [],
      error: () => this.departments = []
    });
  }

  getDepartmentName(id?: number): string {
    if (!id) return '--';
    const d = this.departments.find(x => x.id === id);
    return d?.name || String(id);
  }

  // ─── Reporte de suministro EPP por trabajador ─────────────────────────────

  downloadSuministroReport(): void {
    this.reportMessage = '';
    if (!this.reportEmployeeId) {
      this.reportMessage = 'Seleccione un trabajador para generar el reporte.';
      return;
    }
    if (!this.reportYear) {
      this.reportMessage = 'Seleccione el año del reporte.';
      return;
    }
    this.reportBusy = true;
    this.outputService.findByEmployee(this.ruc, this.reportEmployeeId).subscribe({
      next: async (list) => {
        try {
          const filtered = (list || []).filter(o => {
            if (o.status !== 'CONFIRMADO') return false;
            if (o.outputType !== 'EPP_TRABAJADOR') return false;
            const d = this.parseOutputDate(o.outputDate);
            if (!d) return false;
            if (d.getFullYear() !== this.reportYear) return false;
            if (this.reportMonth != null && (d.getMonth() + 1) !== this.reportMonth) return false;
            return true;
          });

          const rows = this.flattenSuministroRows(filtered);
          if (!rows.length) {
            this.reportMessage = this.reportMonth
              ? `No hay entregas EPP confirmadas en ${this.monthLabel(this.reportMonth)} ${this.reportYear}.`
              : `No hay entregas EPP confirmadas en el año ${this.reportYear}.`;
            this.reportBusy = false;
            return;
          }

          const emp = this.employees.find(e => Number(e.id) === Number(this.reportEmployeeId)) || null;
          await this.generateSuministroPdf(emp, rows);
          this.reportBusy = false;
        } catch {
          this.reportBusy = false;
          this.reportMessage = 'No se pudo generar el PDF. Verifique que pdfmake esté instalado.';
        }
      },
      error: () => {
        this.reportBusy = false;
        this.reportMessage = 'No se pudieron cargar las salidas del trabajador.';
      }
    });
  }

  private flattenSuministroRows(outputs: InventoryOutput[]): SuministroRow[] {
    const rows: SuministroRow[] = [];
    const sorted = [...outputs].sort((a, b) => String(b.outputDate || '').localeCompare(String(a.outputDate || '')));
    for (const o of sorted) {
      const d = this.parseOutputDate(o.outputDate);
      const anio = d ? d.getFullYear() : this.reportYear;
      const fechaTxt = this.formatDateTimeEs(o.outputDate, o.createdAt);
      for (const det of (o.details || [])) {
        rows.push({
          documento: o.outputNumber || '—',
          codigoProducto: det.variantCode || String(det.variantId || '—'),
          descripcion: (det.productName || det.variantCode || '—').toUpperCase(),
          cantidad: Number(det.quantity || 0),
          fecha: fechaTxt,
          anio
        });
      }
    }
    return rows;
  }

  private async generateSuministroPdf(emp: EmployeeResponse | null, rows: SuministroRow[]): Promise<void> {
    const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
    const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
    const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
    const pdfFonts: any = pdfFontsImport?.default || pdfFontsImport;
    const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
    if (vfs) pdfMake.vfs = vfs;

    const navy = this.brandBlue;
    const light = this.brandLight;
    const name = emp
      ? `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || '—'
      : '—';
    const cedula = emp?.cedula || '—';
    const cargo = emp?.positionName || (emp as any)?.position?.name || '—';
    const area = emp?.departmentName || (emp as any)?.department?.name || '—';
    const photo = await this.loadEmployeePhotoDataUrl(emp);
    const downloadDate = this.formatDownloadDate(new Date());
    const reportNo = this.nextReportNumber();
    const periodLabel = this.reportMonth
      ? `${this.monthLabel(this.reportMonth)} ${this.reportYear}`
      : `Año ${this.reportYear}`;

    const border = {
      hLineWidth: () => 1.2,
      vLineWidth: () => 1.2,
      hLineColor: () => navy,
      vLineColor: () => navy
    };

    const tableBody: any[] = [
      [
        { text: 'Documento', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] },
        { text: 'Codigo Producto', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] },
        { text: 'Descripcion', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] },
        { text: 'Cantidad', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] },
        { text: 'Fecha', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] },
        { text: 'Año', bold: true, color: '#fff', fillColor: navy, fontSize: 8, alignment: 'center', margin: [2, 4] }
      ],
      ...rows.map(r => [
        { text: r.documento, fontSize: 8, alignment: 'center', margin: [2, 3] },
        { text: r.codigoProducto, fontSize: 8, alignment: 'center', margin: [2, 3] },
        { text: r.descripcion, fontSize: 8, alignment: 'left', margin: [2, 3] },
        { text: String(r.cantidad), fontSize: 8, alignment: 'center', margin: [2, 3] },
        { text: r.fecha, fontSize: 8, alignment: 'center', margin: [2, 3] },
        { text: String(r.anio), fontSize: 8, alignment: 'center', margin: [2, 3] }
      ])
    ];

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageMargins: [32, 32, 32, 32],
      defaultStyle: { fontSize: 9, color: '#111' },
      // Recuadro azul de todo el documento
      background: (_currentPage: number, pageSize: { width: number; height: number }) => ({
        canvas: [{
          type: 'rect',
          x: 14,
          y: 14,
          w: pageSize.width - 28,
          h: pageSize.height - 28,
          lineWidth: 2.5,
          lineColor: navy
        }]
      }),
      content: [
        // Header
        {
          table: {
            widths: [90, '*'],
            heights: [48],
            body: [[
              this.businessLogoDataUrl
                ? { image: this.businessLogoDataUrl, fit: [78, 38], alignment: 'center', margin: [4, 5] }
                : { text: (this.businessName || 'LOGOTIPO').slice(0, 14).toUpperCase(), alignment: 'center', bold: true, color: navy, fontSize: 9, margin: [4, 14] },
              {
                text: 'REPORTE DE SUMINISTRO DE ELEMENTOS DE PROTECCIÓN PERSONAL',
                alignment: 'center',
                bold: true,
                color: '#fff',
                fillColor: navy,
                fontSize: 11,
                margin: [6, 14]
              }
            ]]
          },
          layout: border,
          margin: [0, 0, 0, 8]
        },

        {
          columns: [
            { text: `Periodo: ${periodLabel}`, bold: true, color: navy, fontSize: 10 },
            {
              stack: [
                {
                  text: [
                    { text: 'N° de Reporte ', bold: true, fontSize: 11 },
                    { text: String(reportNo), color: '#dc2626', bold: true, fontSize: 14 }
                  ],
                  alignment: 'right'
                },
                {
                  text: [
                    { text: 'Fecha de descarga: ', bold: true, color: navy, fontSize: 10 },
                    { text: downloadDate, color: navy, fontSize: 10 }
                  ],
                  alignment: 'right',
                  margin: [0, 2, 0, 0]
                }
              ]
            }
          ],
          margin: [0, 0, 0, 8]
        },

        // Worker section
        {
          table: {
            widths: ['*'],
            body: [[{
              text: 'Datos Específicos de Suministro de EPP',
              alignment: 'center',
              bold: true,
              fillColor: light,
              color: navy,
              fontSize: 11,
              margin: [4, 6]
            }]]
          },
          layout: border,
          margin: [0, 0, 0, 0]
        },
        {
          table: {
            widths: [78, '*', 95, '*', '*'],
            body: [
              [
                { text: 'FOTO', bold: true, fillColor: light, alignment: 'center', fontSize: 9, margin: [2, 5] },
                { text: 'Nombre del Trabajador', fillColor: light, alignment: 'center', fontSize: 9, margin: [2, 5] },
                { text: 'N° de Cedula', fillColor: light, alignment: 'center', fontSize: 9, margin: [2, 5] },
                { text: 'Cargo', bold: true, fillColor: light, alignment: 'center', fontSize: 9, margin: [2, 5] },
                { text: 'Area', bold: true, fillColor: light, alignment: 'center', fontSize: 9, margin: [2, 5] }
              ],
              [
                photo
                  ? { image: photo, fit: [64, 78], alignment: 'center', margin: [3, 6] }
                  : { text: 'FOTO', alignment: 'center', color: '#9ca3af', fontSize: 10, margin: [2, 28] },
                { text: name, alignment: 'center', fontSize: 11, margin: [3, 18] },
                { text: cedula, alignment: 'center', fontSize: 11, margin: [3, 18] },
                { text: cargo, alignment: 'center', fontSize: 10, margin: [3, 18] },
                { text: area, alignment: 'center', fontSize: 10, margin: [3, 18] }
              ]
            ]
          },
          layout: border,
          margin: [0, 0, 0, 10]
        },

        { text: 'Lista de elementos de protección personal entregados', bold: true, fontSize: 10, margin: [0, 0, 0, 4] },

        {
          table: {
            headerRows: 1,
            widths: [70, 70, '*', 42, 82, 36],
            body: tableBody
          },
          layout: border,
          margin: [0, 0, 0, 10]
        },

        {
          stack: [
            { text: 'Decisión 513 IESS', bold: true, fontSize: 9 },
            { text: 'CAPITULO VII', bold: true, fontSize: 9 },
            { text: 'PROTECCION INDIVIDUAL', bold: true, fontSize: 9, margin: [0, 0, 0, 3] },
            {
              text: 'Art. 117.- A más de la protección colectiva, se dispondrá de medios adecuados de protección individual o personal EPIs, cuyas características dependerán de la necesidad particular de los puestos de trabajo. Los EPIs, contarán con la respectiva homologación o certificación INEN. Los equipos de protección individual se acomodarán perfectamente a quien los usa y no representarán por sí mismos un riesgo adicional para el trabajador.',
              alignment: 'justify',
              fontSize: 8.5,
              margin: [0, 0, 0, 8]
            }
          ]
        },

        {
          table: {
            widths: ['*'],
            body: [[{
              text: 'SE PONE EN CONOCIMIENTO EL PRESENTE INFORME, MEDIANTE EL CUAL SE DEJA CONSTANCIA DE LA ENTREGA DE EPP AL TRABAJADOR',
              alignment: 'center',
              bold: true,
              fillColor: light,
              color: navy,
              fontSize: 10,
              margin: [6, 7]
            }]]
          },
          layout: border,
          margin: [0, 0, 0, 10]
        },

        // Firmas: menos espacio superior, más área para firmar encima de la línea
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: ' ', margin: [0, 36, 0, 0] },
                { canvas: [{ type: 'line', x1: 24, y1: 0, x2: 210, y2: 0, lineWidth: 1.4, lineColor: navy }], margin: [10, 0, 0, 3] },
                { text: 'ENTREGA POR', alignment: 'center', bold: true, fontSize: 9 },
                { text: `NOMBRE: ${(this.businessName || '____________________').toUpperCase()}`, alignment: 'center', fontSize: 8, margin: [0, 3, 0, 0] },
                { text: 'C.I.: _______________________', alignment: 'center', fontSize: 8 }
              ]
            },
            {
              width: '*',
              stack: [
                { text: ' ', margin: [0, 36, 0, 0] },
                { canvas: [{ type: 'line', x1: 24, y1: 0, x2: 210, y2: 0, lineWidth: 1.4, lineColor: navy }], margin: [10, 0, 0, 3] },
                { text: 'RECIBE (TRABAJADOR)', alignment: 'center', bold: true, fontSize: 9 },
                { text: `NOMBRE: ${name.toUpperCase()}`, alignment: 'center', fontSize: 8, margin: [0, 3, 0, 0] },
                { text: `C.I.: ${cedula}`, alignment: 'center', fontSize: 8 }
              ]
            }
          ]
        }
      ]
    };

    const fileName = `Reporte-Suministro-EPP-${cedula}-${this.reportYear}${this.reportMonth ? '-' + String(this.reportMonth).padStart(2, '0') : ''}-N${reportNo}.pdf`;
    const pdf = pdfMake.createPdf(docDefinition);
    try {
      pdf.open();
    } catch {
      pdf.download(fileName);
    }
  }

  /** Auto-incremento del N° de reporte por empresa (parte desde 1). */
  private nextReportNumber(): number {
    const key = `epp-suministro-report-seq-${this.ruc || 'global'}`;
    let next = 1;
    try {
      const raw = localStorage.getItem(key);
      const current = raw != null ? parseInt(raw, 10) : 0;
      next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
      localStorage.setItem(key, String(next));
    } catch {
      next = 1;
    }
    return next;
  }

  private sortOutputsNewestFirst(list: InventoryOutput[]): InventoryOutput[] {
    return [...(list || [])].sort((a, b) => {
      const ta = this.outputSortTimestamp(a);
      const tb = this.outputSortTimestamp(b);
      if (tb !== ta) return tb - ta;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }

  private outputSortTimestamp(o: InventoryOutput): number {
    if (o?.createdAt) {
      const c = new Date(o.createdAt).getTime();
      if (!isNaN(c)) return c;
    }
    if (o?.updatedAt) {
      const u = new Date(o.updatedAt).getTime();
      if (!isNaN(u)) return u;
    }
    const d = this.parseOutputDate(o?.outputDate);
    return d ? d.getTime() : 0;
  }

  /** Fecha de salida + hora de registro (createdAt) para el listado. */
  formatOutputDateTime(o: InventoryOutput | null | undefined): string {
    if (!o) return '—';
    return this.formatDateTimeEs(o.outputDate, o.createdAt || o.updatedAt);
  }

  private monthLabel(m: number): string {
    return this.reportMonths.find(x => x.value === m)?.label || String(m);
  }

  private parseOutputDate(iso?: string): Date | null {
    if (!iso) return null;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDateTimeEs(outputDate?: string, createdAt?: string): string {
    const base = this.parseOutputDate(outputDate);
    if (!base) return outputDate || '—';
    const dd = String(base.getDate()).padStart(2, '0');
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const yyyy = base.getFullYear();
    let time = '';
    if (createdAt) {
      const c = new Date(createdAt);
      if (!isNaN(c.getTime())) {
        const hh = String(c.getHours()).padStart(2, '0');
        const mi = String(c.getMinutes()).padStart(2, '0');
        const ss = String(c.getSeconds()).padStart(2, '0');
        time = ` ${hh}:${mi}:${ss}`;
      }
    }
    return `${dd}/${mm}/${yyyy}${time}`;
  }

  private formatDownloadDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private loadBusinessLogo(): void {
    if (!this.ruc) return;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: async (biz) => {
        this.businessName = biz?.name || '';
        const path = String(biz?.logo || '').trim();
        if (!path) {
          this.businessLogoDataUrl = '';
          return;
        }
        // Resolver logo de la empresa del RUC actual (varias rutas posibles)
        const candidates: string[] = [];
        if (/^https?:\/\//i.test(path) || path.startsWith('/api/')) {
          candidates.push(path);
        } else {
          const clean = path.replace(/^\/+/, '').replace(/\\/g, '/');
          const fileOnly = clean.split('/').pop() || clean;
          candidates.push(this.fileService.getFileUrl(clean));
          if (clean.toLowerCase().includes('logo')) {
            candidates.push(this.fileService.getFileDirectoryUrl('logos', fileOnly, false));
          }
          candidates.push(this.fileService.getFileDirectoryUrl('logos', fileOnly, false));
          candidates.push(`/api/files/logos/${fileOnly}`);
        }
        let dataUrl = '';
        for (const url of candidates) {
          if (!url) continue;
          dataUrl = await this.toDataUrlWithAuth(url);
          if (dataUrl && dataUrl.startsWith('data:image')) break;
          dataUrl = '';
        }
        this.businessLogoDataUrl = dataUrl;
      },
      error: () => {
        this.businessLogoDataUrl = '';
        this.businessName = '';
      }
    });
  }

  private async loadEmployeePhotoDataUrl(emp: EmployeeResponse | null): Promise<string> {
    if (!emp) return '';
    const imagePath = (emp as any).imagePath || emp.profile_picture || '';
    if (!imagePath || typeof imagePath !== 'string') return '';
    const clean = imagePath.replace(/^\/+/, '').replace(/\\/g, '/');
    const fileOnly = clean.split('/').pop() || clean;
    const candidates = [
      /^https?:\/\//i.test(clean) ? clean : '',
      this.fileService.getFileDirectoryUrl('profiles', fileOnly, false),
      this.employeeService.getEmployeePhotoUrl(fileOnly),
      `/api/files/profiles/${fileOnly}`,
      `/api/files/download/profiles/${fileOnly}`
    ].filter(Boolean);
    for (const url of candidates) {
      const data = await this.toDataUrlWithAuth(url);
      if (data && data.startsWith('data:image')) return data;
    }
    return '';
  }

  private async toDataUrlWithAuth(url: string): Promise<string> {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }
}
