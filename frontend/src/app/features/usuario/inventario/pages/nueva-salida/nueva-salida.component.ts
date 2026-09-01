import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InventoryOutputService, InventoryOutput, InventoryOutputDetail } from '../../../../../services/inventory-output.service';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { InventoryVariantAttributeService } from '../../../../../services/inventory-variant-attribute.service';
import { EmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { FileService } from '../../../../../services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  CambioEppSolicitud,
  CambioEppSolicitudService
} from '../../../../../services/cambio-epp-solicitud.service';
import { CambioEppPdfService } from '../../../../../services/cambio-epp-pdf.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-nueva-salida',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './nueva-salida.component.html',
  styleUrls: ['./nueva-salida.component.scss']
})
export class NuevaSalidaComponent implements OnInit, OnDestroy {
  ruc: string = '';
  outputForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  /** Pestaña: salida normal o solicitudes firmadas de cambio EPP */
  activeTab: 'salida' | 'solicitudes' = 'salida';
  cambioSolicitudes: CambioEppSolicitud[] = [];
  activeCambioSolicitud: CambioEppSolicitud | null = null;
  showSignedViewer = false;
  signedViewerSafeUrl: SafeResourceUrl | null = null;
  signedViewerImgUrl = '';
  signedViewerTitle = '';
  signedViewerIsPdf = true;
  private signedViewerObjectUrl = '';

  /** Modal rechazo con motivo obligatorio */
  showRejectModal = false;
  rejectTarget: CambioEppSolicitud | null = null;
  rejectReason = '';
  rejectError = '';
  
  // Catálogos
  employees: EmployeeResponse[] = [];
  /** Catálogo completo. */
  allProducts: InventoryProduct[] = [];
  /** Productos visibles en el picker según tipo de salida. */
  products: InventoryProduct[] = [];
  
  // Detalles de salida
  details: InventoryOutputDetail[] = [];
  // Opciones de lotes por línea
  lotOptions: { [index: number]: InventoryLotDto[] } = {};
  
  // Selección de producto
  showProductModal = false;
  selectedProduct: InventoryProduct | null = null;
  variants: InventoryVariant[] = [];
  selectedVariant: InventoryVariant | null = null;
  
  // Tipos de salida (dinámicos por empresa; value = código legacy para lógica UI)
  outputTypes: Array<{ value: string; label: string }> = [];
  
  itemConditions = ['NUEVO', 'USADO', 'REACONDICIONADO'];
  
  // Subida de documento
  selectedFile: File | null = null;
  documentFileName: string = '';
  documentFileSize: string = '';
  deliveredBy: string = '';
  signatureDataUrl: string = '';
  isDrawing = false;
  lastX = 0;
  lastY = 0;
  printing = false;
  formLocked = false;
  businessLogoDataUrl: string = '';
  employeePhotoDataUrl: string = '';
  businessName: string = '';
  /** Color corporativo del Acta de Entrega */
  private readonly actaNavy = '#1b365d';
  // PDFs generados en la sesión (pendientes de validación y firma)
  generatedDocs: { id: number; name: string; url: string; employeeName: string; cedula: string; description: string }[] = [];
  // Archivos seleccionados por fila (Subir PDF Validado)
  pendingRowFiles: { [id: number]: File | null } = {};
  pendingRowFileNames: { [id: number]: string } = {};
  pendingRowFileSizes: { [id: number]: string } = {};

  // Catálogo de departamentos
  departments: Department[] = [];
  // Búsqueda de trabajador
  cedulaSearch: string = '';
  codigoSearch: string = '';
  /** Empleado que despacha EPP (solo en entrega por solicitud de cambio). */
  despachadorEmployeeId: number | null = null;
  despachadorCargo = '';

  // Estado del flujo
  createdOutputId: number | null = null;
  pdfGenerated: boolean = false;
  documentUploaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private outputService: InventoryOutputService,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private employeeService: EmployeeService,
    private businessService: BusinessService,
    private fileService: FileService,
    private authService: AuthService,
    private departmentService: DepartmentService,
    private lotService: InventoryLotService,
    private attrService: InventoryVariantAttributeService,
    private cambioEppSolicitudService: CambioEppSolicitudService,
    private cambioEppPdfService: CambioEppPdfService,
    private sanitizer: DomSanitizer
  ) {
    const today = new Date().toISOString().split('T')[0];
    this.outputForm = this.fb.group({
      outputNumber: [this.generateOutputNumberFallback(), Validators.required],
      outputDate: [today, Validators.required],
      outputType: ['', Validators.required],
      employeeId: [null],
      area: [''],
      project: [''],
      returnDate: [''],
      authorizedBy: [''],
      notes: [''],
      bajaReason: ['']
    });
    const user = this.authService.getCurrentUser();
    this.deliveredBy = (user?.name || user?.username || '').toString();
    try { this.outputForm.patchValue({ authorizedBy: this.deliveredBy || '' }); } catch {}
  }

  // Selección de archivo por fila en Documentos Generados
  onRowFileSelected(doc: { id: number }, event: any): void {
    const file = event.target.files?.[0];
    const id = doc?.id;
    if (!id) return;
    if (file) {
      if (file.type !== 'application/pdf') {
        this.errorMessage = 'Solo se permiten archivos PDF';
        event.target.value = '';
        this.pendingRowFiles[id] = null;
        this.pendingRowFileNames[id] = '';
        this.pendingRowFileSizes[id] = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = 'El archivo PDF no debe superar los 2 MB';
        event.target.value = '';
        this.pendingRowFiles[id] = null;
        this.pendingRowFileNames[id] = '';
        this.pendingRowFileSizes[id] = '';
        return;
      }
      this.pendingRowFiles[id] = file;
      this.pendingRowFileNames[id] = file.name;
      this.pendingRowFileSizes[id] = this.formatFileSize(file.size);
      this.errorMessage = '';
    }
  }

  // Subir PDF validado por fila y confirmar salida, luego remover de la lista
  uploadValidatedPdf(doc: { id: number }): void {
    const id = doc?.id;
    if (!id) return;
    const file = this.pendingRowFiles[id];
    if (!file) {
      this.errorMessage = 'Seleccione el PDF validado para este documento.';
      return;
    }
    this.loading = true;
    this.fileService.uploadFileToDirectory('inventory_outputs', file).subscribe({
      next: (resp) => {
        const path = resp?.url || '';
        if (!path) {
          this.loading = false;
          this.errorMessage = 'No se pudo obtener la ruta del archivo subido.';
          return;
        }
        this.outputService.updateDocument(this.ruc, id, path).subscribe({
          next: () => {
            this.outputService.confirm(this.ruc, id).subscribe({
              next: () => {
                // Remover de la lista de Documentos Generados
                this.generatedDocs = this.generatedDocs.filter(d => d.id !== id);
                delete this.pendingRowFiles[id];
                delete this.pendingRowFileNames[id];
                delete this.pendingRowFileSizes[id];
                this.loading = false;
                this.successMessage = 'PDF validado subido y salida confirmada. Se guardó en Historial de Salidas.';
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
              error: (err) => {
                this.loading = false;
                this.errorMessage = (err?.error?.message) ? err.error.message : 'Documento subido, pero ocurrió un error al confirmar la salida.';
              }
            });
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'Error al asociar el documento a la salida.';
          }
        });
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = (e?.message) ? e.message : 'Error al subir el documento PDF.';
      }
    });
  }

  // Generar PDF Acta de Entrega EPP (diseño corporativo)
  async generatePdf(): Promise<void> {
    try {
      const type = this.outputForm.get('outputType')?.value;
      if (type === 'EPP_TRABAJADOR' && !this.createdOutputId) {
        this.errorMessage = 'Primero debe crear la salida en BORRADOR antes de generar el PDF.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
      const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
      const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
      const pdfFonts: any = pdfFontsImport?.default || pdfFontsImport;
      const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
      if (vfs) {
        pdfMake.vfs = vfs;
      }

      const v = this.outputForm.value as any;
      const navy = this.actaNavy;
      const delivered = v?.authorizedBy || this.deliveredBy || this.businessName || '—';
      const employeeName = this.getEmployeeFullName() || '—';
      const cedula = this.getSelectedEmployee()?.cedula || '—';
      const cargo = this.getSelectedEmployee()?.positionName || '—';
      const departamento = this.getSelectedEmployee()?.departmentName || (this.outputForm?.value?.area || '—');
      const fechaEntrega = this.formatActaDate(v.outputDate);
      const companyName = (this.businessName || delivered || 'la empresa').toString().trim();
      const companyLegal = companyName.toLowerCase().startsWith('la empresa')
        ? companyName
        : `la empresa ${companyName}`;
      const entregaLabel = `Representante de\n${companyName}`;

      await this.refreshEmployeePhotoDataUrl();

      const adminLabel = (t: string) => ({
        text: t,
        bold: true,
        fillColor: '#f3f4f6',
        fontSize: 7,
        margin: [4, 5]
      });
      const adminValue = (t: string, bold = false) => ({
        text: t || '—',
        bold,
        fontSize: 8,
        margin: [4, 5]
      });

      // Precargar imágenes de productos para observaciones
      const detailImages: string[] = [];
      for (const d of this.details) {
        const path = d.productImage || '';
        if (!path) { detailImages.push(''); continue; }
        const url = path.startsWith('http') || path.startsWith('/api/')
          ? path
          : this.fileService.getFileUrl(path.replace(/^\/+/, ''));
        detailImages.push(await this.toDataUrlWithAuth(url));
      }

      const borderLayout = {
        hLineWidth: () => 1.2,
        vLineWidth: () => 1.2,
        hLineColor: () => navy,
        vLineColor: () => navy
      };
      const thinBorder = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => navy,
        vLineColor: () => navy
      };

      const headerCell = (text: string) => ({
        text,
        bold: true,
        color: '#ffffff',
        fillColor: navy,
        alignment: 'center',
        fontSize: 7,
        margin: [2, 4, 2, 4]
      });
      const bodyCell = (text: string, align: 'left' | 'center' = 'center') => ({
        text: text || '—',
        alignment: align,
        fontSize: 7,
        margin: [2, 3, 2, 3]
      });

      const eppRows = this.details.map((d, i) => {
        let specs = (d.generalSpecs || '').trim();
        if (d.techSheetPdf) {
          specs = specs
            ? `${specs}. ADJUNTO: Ficha técnica`
            : 'ADJUNTO: Ficha técnica';
        }
        return [
          bodyCell(String(i + 1)),
          bodyCell(String(d.quantity || 0)),
          bodyCell(d.issuedSize || '—'),
          bodyCell(d.productName || d.variantCode || '—', 'left'),
          bodyCell(specs || '—', 'left'),
          bodyCell(d.supplierName || '—'),
          bodyCell(d.brand || 'NA'),
          bodyCell(d.minUseTime || '1 AÑO')
        ];
      });
      if (!eppRows.length) {
        eppRows.push([
          bodyCell('—'), bodyCell('—'), bodyCell('—'), bodyCell('Sin ítems', 'left'),
          bodyCell('—', 'left'), bodyCell('—'), bodyCell('—'), bodyCell('—')
        ]);
      }

      // Observaciones: hasta 6 fotos por fila, mismo tamaño (soporta ~10+ EPP)
      const OBS_PER_ROW = 6;
      const OBS_IMG = 78;
      const obsCells: any[] = this.details.map((d, i) => {
        const label = String(d.productName || d.variantCode || `Item ${i + 1}`).slice(0, 22);
        const img = detailImages[i];
        const stack: any[] = [
          { text: label, bold: true, fontSize: 6, alignment: 'center', margin: [0, 0, 0, 3], color: navy }
        ];
        if (img) {
          stack.push({ image: img, fit: [OBS_IMG, OBS_IMG], alignment: 'center' });
        } else {
          stack.push({
            table: {
              widths: [OBS_IMG],
              heights: [OBS_IMG],
              body: [[{ text: 'Sin foto', fontSize: 6, color: '#9ca3af', alignment: 'center', margin: [0, 30, 0, 0] }]]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#d1d5db',
              vLineColor: () => '#d1d5db'
            },
            alignment: 'center'
          });
        }
        return { width: '*', stack, margin: [2, 2, 2, 4] };
      });

      const obsRows: any[] = [];
      for (let i = 0; i < obsCells.length; i += OBS_PER_ROW) {
        const chunk = obsCells.slice(i, i + OBS_PER_ROW);
        while (chunk.length < OBS_PER_ROW && obsCells.length > 0) {
          chunk.push({ width: '*', text: '' });
        }
        obsRows.push({ columns: chunk, columnGap: 6, margin: [0, 0, 0, 4] });
      }

      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [28, 28, 28, 28],
        defaultStyle: { fontSize: 9, color: navy },
        content: [
          // Header
          {
            table: {
              widths: ['25%', '75%'],
              heights: [52],
              body: [[
                this.businessLogoDataUrl
                  ? { image: this.businessLogoDataUrl, fit: [90, 42], alignment: 'center', margin: [4, 6] }
                  : { text: (this.businessName || 'Sii').slice(0, 12), alignment: 'center', bold: true, fontSize: 18, margin: [4, 12] },
                {
                  text: 'ACTA DE ENTREGA',
                  alignment: 'center',
                  bold: true,
                  color: '#ffffff',
                  fillColor: navy,
                  fontSize: 16,
                  margin: [0, 16]
                }
              ]]
            },
            layout: borderLayout,
            margin: [0, 0, 0, 10]
          },

          // Datos administrativos + foto (filas alineadas)
          {
            table: {
              widths: ['22%', '78%'],
              body: [[
                this.employeePhotoDataUrl
                  ? {
                      image: this.employeePhotoDataUrl,
                      fit: [100, 125],
                      alignment: 'center',
                      margin: [4, 6]
                    }
                  : {
                      text: 'FOTO',
                      alignment: 'center',
                      bold: true,
                      color: '#9ca3af',
                      fontSize: 14,
                      margin: [4, 48]
                    },
                {
                  table: {
                    widths: ['34%', '66%'],
                    body: [
                      [adminLabel('NOMBRE Y APELLIDO:'), adminValue(employeeName, true)],
                      [adminLabel('CÉDULA:'), adminValue(cedula)],
                      [adminLabel('DEPARTAMENTO:'), adminValue(departamento)],
                      [adminLabel('CARGO:'), adminValue(cargo)],
                      [adminLabel('FECHA DE ENTREGA:'), adminValue(fechaEntrega)]
                    ]
                  },
                  layout: thinBorder
                }
              ]]
            },
            layout: borderLayout,
            margin: [0, 0, 0, 10]
          },

          // Tabla principal
          {
            table: {
              headerRows: 1,
              widths: [28, 36, 36, '*', '22%', 48, 42, 52],
              body: [
                [
                  headerCell('Item No.'),
                  headerCell('Cantidad'),
                  headerCell('Talla'),
                  headerCell('Descripcion'),
                  headerCell('Especificaciones Generales'),
                  headerCell('Proveedor'),
                  headerCell('Marca'),
                  headerCell('Tiempo minimo de uso')
                ],
                ...eppRows
              ]
            },
            layout: thinBorder,
            margin: [0, 0, 0, 10]
          },

          // Observaciones / referencias visuales (grid 6 por fila)
          {
            table: {
              widths: ['*'],
              body: [[{
                stack: [
                  { text: 'OBSERVACIONES:', bold: true, fontSize: 10, margin: [0, 0, 0, 8] },
                  ...(obsRows.length
                    ? obsRows
                    : [{ text: this.outputForm.value.notes || 'Sin observaciones adicionales.', fontSize: 8, color: '#4b5563' }])
                ],
                margin: [8, 8, 8, 8]
              }]]
            },
            layout: borderLayout,
            margin: [0, 0, 0, 10]
          },

          // Cláusula
          {
            table: {
              widths: ['*'],
              body: [
                [{
                  text: 'CLAUSULA DE COMPROMISO',
                  bold: true,
                  alignment: 'center',
                  fillColor: '#f3f4f6',
                  fontSize: 9,
                  margin: [4, 5]
                }],
                [{
                  stack: [
                    {
                      text: [
                        { text: 'Certifico', bold: true },
                        ` que los Equipos de Protección Personal (EPP) detallados en el presente documento me han sido entregados de forma gratuita, en cumplimiento del Decreto Ejecutivo N.º 255, para su adecuado uso, cuidado y custodia, con el propósito de cumplir con las tareas y funciones propias de mi cargo. Declaro que dichos equipos son de mi única y exclusiva responsabilidad.`
                      ],
                      fontSize: 8.5,
                      alignment: 'justify',
                      margin: [0, 0, 0, 7]
                    },
                    {
                      text: [
                        { text: 'Asumo', bold: true },
                        ` las consecuencias económicas que se deriven de la pérdida, daño o deterioro de los EPP cuando estos ocurran por negligencia o incumplimiento de los instructivos establecidos. En tal caso, autorizo expresamente a ${companyLegal} a efectuar el descuento correspondiente al valor de reposición del EPP afectado, el cual podrá ser deducido de mis salarios, prestaciones sociales o cualquier otro valor que se me adeude.`
                      ],
                      fontSize: 8.5,
                      alignment: 'justify',
                      margin: [0, 0, 0, 7]
                    },
                    {
                      text: [
                        { text: 'Declaro', bold: true },
                        ' haber recibido los Equipos de Protección Personal detallados en el presente documento y me comprometo a:'
                      ],
                      fontSize: 8.5,
                      alignment: 'justify',
                      margin: [0, 0, 0, 3]
                    },
                    { text: '• Utilizarlos de manera obligatoria durante el desarrollo de mis actividades laborales.', fontSize: 8.5, alignment: 'justify' },
                    { text: '• Cuidarlos y mantenerlos en buen estado.', fontSize: 8.5, alignment: 'justify' },
                    { text: '• No prestarlos, transferirlos ni modificarlos bajo ninguna circunstancia.', fontSize: 8.5, alignment: 'justify', margin: [0, 0, 0, 7] },
                    {
                      text: [
                        { text: 'Declaro', bold: true },
                        ' también conocer y aceptar que:'
                      ],
                      fontSize: 8.5,
                      alignment: 'justify',
                      margin: [0, 0, 0, 3]
                    },
                    { text: '• La vida útil de los EPP es de mínimo un (1) año a partir de la fecha de entrega, salvo condiciones especiales de uso.', fontSize: 8.5, alignment: 'justify' },
                    { text: '• No se realizarán cambios de talla posteriores derivados de variaciones físicas del trabajador.', fontSize: 8.5, alignment: 'justify' },
                    { text: '• En caso de pérdida o daño por negligencia, antes de cumplirse el periodo de vida útil establecido, deberé asumir el costo de reposición del equipo.', fontSize: 8.5, alignment: 'justify' }
                  ],
                  margin: [10, 10, 10, 10]
                }]
              ]
            },
            layout: borderLayout,
            margin: [0, 0, 0, 10]
          },

          // Firmas
          {
            table: {
              widths: ['50%', '50%'],
              heights: [18, 70],
              body: [
                [{
                  text: 'FIRMAS',
                  bold: true,
                  alignment: 'center',
                  fillColor: '#f3f4f6',
                  colSpan: 2,
                  fontSize: 9,
                  margin: [4, 4]
                }, {}],
                [
                  {
                    stack: [
                      { text: ' ', margin: [0, 24] },
                      { text: 'ENTREGA', alignment: 'center', bold: true, fontSize: 8 },
                      { text: entregaLabel, alignment: 'center', bold: true, fontSize: 8 }
                    ]
                  },
                  {
                    stack: [
                      this.signatureDataUrl
                        ? { image: this.signatureDataUrl, fit: [200, 45], alignment: 'center', margin: [0, 4, 0, 4] }
                        : { text: ' ', margin: [0, 24] },
                      { text: 'RECIBE', alignment: 'center', bold: true, fontSize: 8 },
                      { text: employeeName, alignment: 'center', bold: true, fontSize: 8 }
                    ]
                  }
                ]
              ]
            },
            layout: borderLayout
          }
        ]
      };

      const fileName = `Acta-Entrega-EPP-${v.outputNumber}.pdf`;
      const pdfDoc = pdfMake.createPdf(docDefinition);
      try {
        const outType = this.outputForm.get('outputType')?.value;
        if (outType === 'EPP_TRABAJADOR' && this.createdOutputId) {
          pdfDoc.getBlob((blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const entry = {
              id: this.createdOutputId as number,
              name: fileName,
              url,
              employeeName,
              cedula,
              description: 'Falta culminar el proceso'
            };
            this.generatedDocs = [entry, ...this.generatedDocs.filter(d => d.id !== entry.id)];
          });
        }
      } catch {}
      try {
        pdfDoc.open();
      } catch {
        pdfDoc.download(fileName);
      }
      this.pdfGenerated = true;
    } catch (err) {
      this.errorMessage = 'Para generar PDF se requiere instalar pdfmake. Use: npm i pdfmake';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Fecha tipo 11-may-2026 para el Acta */
  formatActaDate(iso?: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(`${iso}T12:00:00`);
      if (isNaN(d.getTime())) return iso;
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
    } catch {
      return iso;
    }
  }

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadEmployees();
    this.loadProducts();
    this.loadDepartments();
    this.loadOutputTypes();
    this.loadNextOutputNumber();
    this.refreshGeneratedDocsFromBackend();
    this.loadBusinessLogo();
    this.loadCambioSolicitudes();
    try {
      this.outputForm.get('employeeId')?.valueChanges.subscribe((id) => {
        this.refreshEmployeePhotoDataUrl();
        this.onEmployeeIdChange(id);
      });
    } catch {}
    try {
      this.outputForm.get('outputType')?.valueChanges.subscribe(() => {
        this.applyProductFilter();
        this.selectedProduct = null;
        this.selectedVariant = null;
        this.variants = [];
      });
    } catch {}
  }

  /** Carga / regenera el consecutivo SAL-AAAA-#### de la empresa. */
  loadNextOutputNumber(): void {
    if (!this.ruc) {
      this.outputForm.patchValue({ outputNumber: this.generateOutputNumberFallback() });
      return;
    }
    this.outputService.nextNumber(this.ruc).subscribe({
      next: (res) => {
        const num = (res?.outputNumber || '').toString().trim();
        this.outputForm.patchValue({ outputNumber: num || this.generateOutputNumberFallback() });
      },
      error: () => {
        this.outputForm.patchValue({ outputNumber: this.generateOutputNumberFallback() });
      }
    });
  }

  /** Tipos de salida asignados a esta empresa en Inventario-Bodega. */
  loadOutputTypes(): void {
    if (!this.ruc) {
      this.outputTypes = [];
      return;
    }
    this.outputService.listOutputTypes(this.ruc).subscribe({
      next: (list) => {
        this.outputTypes = (list || [])
          .map(t => {
            const label = (t?.name || '').toString().trim();
            if (!label) return null;
            return { value: this.toOutputTypeCode(label), label };
          })
          .filter((x): x is { value: string; label: string } => !!x);
        const current = (this.outputForm.get('outputType')?.value || '').toString();
        const stillValid = this.outputTypes.some(t => t.value === current);
        if (!stillValid) {
          this.outputForm.patchValue({
            outputType: this.outputTypes[0]?.value || ''
          });
        }
        if (!this.outputTypes.length && !this.errorMessage) {
          this.errorMessage =
            'Esta empresa no tiene Tipos de Salida asignados. Configúrelos en Admin → Empresas → Inventario-Bodega.';
        }
      },
      error: () => {
        this.outputTypes = [];
        this.errorMessage = 'No se pudieron cargar los Tipos de Salida de la empresa.';
      }
    });
  }

  /**
   * Mapea el nombre del catálogo al código usado por la lógica de la pantalla.
   */
  private toOutputTypeCode(name: string): string {
    const raw = (name || '').toString().trim();
    if (!raw) return raw;
    const key = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
    const compact = key.replace(/_/g, '');
    if (key === 'EPP_TRABAJADOR' || compact.includes('ENTREGADEEPP') || compact.includes('EPPATRABAJADOR')) {
      return 'EPP_TRABAJADOR';
    }
    if (key === 'PRESTAMO' || compact.includes('PRESTAMO')) {
      return 'PRESTAMO';
    }
    if (key === 'CONSUMO_AREA' || compact.includes('CONSUMO')) {
      return 'CONSUMO_AREA';
    }
    if (key === 'BAJA' || compact.includes('BAJA')) {
      return 'BAJA';
    }
    if (key === 'VENTA' || compact.includes('VENTA')) {
      return 'VENTA';
    }
    if (key === 'DESCUENTO_TRABAJADOR' || compact.includes('DESCUENTO')) {
      return 'DESCUENTO_TRABAJADOR';
    }
    return raw;
  }

  loadCambioSolicitudes(): void {
    if (!this.ruc) {
      this.cambioSolicitudes = [];
      return;
    }
    this.cambioEppSolicitudService.listPendientesEntrega(this.ruc).subscribe({
      next: (rows) => this.cambioSolicitudes = rows || [],
      error: () => this.cambioSolicitudes = []
    });
  }

  setTab(tab: 'salida' | 'solicitudes'): void {
    this.activeTab = tab;
    if (tab === 'solicitudes') this.loadCambioSolicitudes();
  }

  prepareCambioEntrega(s: CambioEppSolicitud): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.activeCambioSolicitud = s;
    this.activeTab = 'salida';
    this.createdOutputId = null;
    this.documentUploaded = false;
    this.pdfGenerated = false;
    this.details = [];
    this.lotOptions = {};
    this.selectedFile = null;
    this.documentFileName = '';
    this.documentFileSize = '';
    this.despachadorEmployeeId = null;
    this.despachadorCargo = '';

    const sectionCode = this.getCambioSectionCode(s);
    const sectionLabel = s.sectionLabel || s.formSnapshot?.sectionLabel || sectionCode || '—';
    const notes = [
      `Solicitud cambio EPP ${s.nReporte}`,
      s.tipoAcontecimiento ? `Tipo: ${s.tipoAcontecimiento}` : '',
      sectionLabel ? `Sección: ${sectionLabel}` : '',
      s.formSnapshot?.observaciones ? `Obs: ${s.formSnapshot.observaciones}` : '',
      s.formSnapshot?.talla ? `Talla ref: ${s.formSnapshot.talla}` : ''
    ].filter(Boolean).join(' | ');

    this.outputForm.patchValue({
      outputType: 'EPP_TRABAJADOR',
      employeeId: null,
      authorizedBy: '',
      notes,
      outputNumber: this.generateOutputNumberFallback(),
      outputDate: new Date().toISOString().split('T')[0]
    });

    this.loadNextOutputNumber();

    this.resolveCambioEmployee(s, (emp, inactiveMsg) => {
      if (emp?.id && !inactiveMsg) {
        this.ensureEmployeeInList(emp);
        this.outputForm.patchValue({ employeeId: emp.id });
        this.refreshEmployeePhotoDataUrl();
      } else {
        this.outputForm.patchValue({ employeeId: null });
        this.employeePhotoDataUrl = '';
      }

      this.applyProductFilter();
      if ((this.allProducts || []).length) {
        this.autoFillCambioSectionProduct();
      } else {
        this.loadProducts();
      }

      if (inactiveMsg) {
        this.errorMessage = inactiveMsg;
        this.successMessage = '';
        this.details = [];
      } else if (!emp) {
        this.errorMessage =
          `Solicitud ${s.nReporte} lista. No se encontró trabajador activo con cédula ${s.cedula || '—'}. Selecciónelo manualmente o verifique Talento Humano.`;
      } else if (!sectionCode) {
        this.errorMessage = `La solicitud ${s.nReporte} no tiene sección EPP. No se puede precargar el producto.`;
      } else {
        this.successMessage =
          `Dotación fija: ${emp.nombres || ''} ${emp.apellidos || ''} · sección ${sectionLabel}. Producto y trabajador precargados. Elija quién despacha y pulse “Validar y entregar EPP”.`;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /** Solo limpia la preparación local (no rechaza la solicitud). */
  clearCambioEntregaLocal(): void {
    this.activeCambioSolicitud = null;
    this.details = [];
    this.lotOptions = {};
    this.despachadorEmployeeId = null;
    this.despachadorCargo = '';
    this.successMessage = '';
    this.applyProductFilter();
  }

  onDespachadorSelect(id: number | null): void {
    const num = id == null ? null : Number(id);
    this.despachadorEmployeeId = num != null && !Number.isNaN(num) && num > 0 ? num : null;
    if (!this.despachadorEmployeeId) {
      this.despachadorCargo = '';
      this.outputForm.patchValue({ authorizedBy: '' });
      return;
    }
    const emp = this.employees.find(e => Number(e.id) === Number(this.despachadorEmployeeId));
    if (!emp) {
      this.despachadorCargo = '';
      this.outputForm.patchValue({ authorizedBy: '' });
      return;
    }
    if (!EmployeeService.isEmployeeActive(emp)) {
      this.errorMessage = this.inactiveEmployeeAlert(emp);
      this.despachadorEmployeeId = null;
      this.despachadorCargo = '';
      this.outputForm.patchValue({ authorizedBy: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const name = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || '';
    this.despachadorCargo = emp.positionName || (emp as any)?.position?.name || '';
    this.outputForm.patchValue({ authorizedBy: name });
  }

  /** Si eligen un inactivo (no debería estar en lista), bloquea y alerta. */
  onEmployeeIdChange(id: number | null): void {
    if (id == null) return;
    const emp = this.employees.find(e => Number(e.id) === Number(id));
    if (!emp) return;
    if (!EmployeeService.isEmployeeActive(emp)) {
      this.errorMessage = this.inactiveEmployeeAlert(emp);
      this.outputForm.patchValue({ employeeId: null }, { emitEvent: false });
      this.employeePhotoDataUrl = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private ensureEmployeeInList(emp: EmployeeResponse): void {
    if (!emp?.id) return;
    // Nunca agregar inactivos a la lista de selección EPP.
    if (!EmployeeService.isEmployeeActive(emp)) return;
    if (!this.employees.some(e => Number(e.id) === Number(emp.id))) {
      this.employees = [emp, ...this.employees];
    }
  }

  private inactiveEmployeeAlert(emp: EmployeeResponse): string {
    const name = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || 'Trabajador';
    const ced = emp.cedula ? ` (cédula ${emp.cedula})` : '';
    return `${name}${ced} está INACTIVO. No se puede asignar ni entregar EPP. Reactívelo en Talento Humano o elija otro trabajador activo.`;
  }

  private normalizePersonName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cedulasMatch(a: string, b: string): boolean {
    const na = String(a || '').replace(/\D/g, '');
    const nb = String(b || '').replace(/\D/g, '');
    if (!na || !nb) return false;
    if (na === nb) return true;
    return na.replace(/^0+/, '') === nb.replace(/^0+/, '');
  }

  private findEmployeeLocalForCambio(s: CambioEppSolicitud): EmployeeResponse | null {
    const cedula = String(s.cedula || s.formSnapshot?.cedula || '').trim();
    if (cedula) {
      const byCed = this.employees.find(e => this.cedulasMatch(e.cedula || '', cedula));
      if (byCed) return byCed;
    }
    const name = String(s.trabajador || s.formSnapshot?.nombreTrabajador || '').trim();
    const norm = this.normalizePersonName(name);
    if (norm.length < 3) return null;
    const exact = this.employees.find(e =>
      this.normalizePersonName(`${e.nombres || ''} ${e.apellidos || ''}`.trim() || e.name || '') === norm
    );
    if (exact) return exact;
    const matches = this.employees.filter(e => {
      const full = this.normalizePersonName(`${e.nombres || ''} ${e.apellidos || ''}`.trim() || e.name || '');
      return full.includes(norm) || norm.includes(full);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  /**
   * Resuelve trabajador de la solicitud.
   * Si está inactivo: done(null, mensajeAlerta) — no se permite EPP.
   */
  private resolveCambioEmployee(
    s: CambioEppSolicitud,
    done: (emp: EmployeeResponse | null, inactiveMsg?: string) => void
  ): void {
    const rejectIfInactive = (emp: EmployeeResponse | null) => {
      if (!emp) {
        done(null);
        return;
      }
      if (!EmployeeService.isEmployeeActive(emp)) {
        done(null, this.inactiveEmployeeAlert(emp));
        return;
      }
      done(emp);
    };

    const local = this.findEmployeeLocalForCambio(s);
    if (local) {
      rejectIfInactive(local);
      return;
    }

    const cedula = String(s.cedula || s.formSnapshot?.cedula || '').replace(/\D/g, '');
    if (!this.ruc) {
      done(null);
      return;
    }

    const finishFromList = (list: EmployeeResponse[]) => {
      const found =
        list.find(e => this.cedulasMatch(e.cedula || '', cedula)) ||
        (() => {
          const name = String(s.trabajador || s.formSnapshot?.nombreTrabajador || '').trim();
          const norm = this.normalizePersonName(name);
          if (norm.length < 3) return null;
          return list.find(e =>
            this.normalizePersonName(`${e.nombres || ''} ${e.apellidos || ''}`.trim() || e.name || '') === norm
          ) || null;
        })();
      rejectIfInactive(found || null);
    };

    if (cedula) {
      this.employeeService.getEmployeeByCedulaScopedByRuc(this.ruc, cedula).subscribe({
        next: (emp) => {
          if (emp?.id) {
            rejectIfInactive(emp);
            return;
          }
          this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
            next: (all) => finishFromList(all || []),
            error: () => done(null)
          });
        },
        error: () => {
          this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
            next: (all) => finishFromList(all || []),
            error: () => done(null)
          });
        }
      });
      return;
    }

    this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
      next: (all) => finishFromList(all || []),
      error: () => done(null)
    });
  }

  /** Abre modal para rechazar con motivo (queda visible en Seguridad Industrial). */
  openRejectCambioModal(s?: CambioEppSolicitud | null): void {
    const target = s || this.activeCambioSolicitud;
    if (!target) return;
    this.rejectTarget = target;
    this.rejectReason = '';
    this.rejectError = '';
    this.showRejectModal = true;
  }

  closeRejectCambioModal(): void {
    this.showRejectModal = false;
    this.rejectTarget = null;
    this.rejectReason = '';
    this.rejectError = '';
  }

  confirmRejectCambio(): void {
    const target = this.rejectTarget;
    const motivo = String(this.rejectReason || '').trim();
    if (!target || !this.ruc) return;
    if (motivo.length < 5) {
      this.rejectError = 'Indique el motivo del rechazo (mínimo 5 caracteres).';
      return;
    }
    this.cambioEppSolicitudService.markRechazado(this.ruc, target.id, motivo).subscribe({
      next: () => {
        this.closeRejectCambioModal();
        if (this.activeCambioSolicitud?.id === target.id) {
          this.clearCambioEntregaLocal();
        }
        this.loadCambioSolicitudes();
        this.successMessage = `Solicitud ${target.nReporte} rechazada y guardada en base de datos. En Seguridad Industrial aparecerá como Rechazado.`;
        this.activeTab = 'solicitudes';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.rejectError = err?.error?.message || err?.message || 'No se pudo rechazar la solicitud.';
      }
    });
  }

  /** @deprecated Usar openRejectCambioModal / clearCambioEntregaLocal */
  cancelCambioEntrega(): void {
    this.openRejectCambioModal();
  }

  /** Sección solicitada en Cambio de EPP (CAS, CAM, PAN…). */
  getCambioSectionCode(s?: CambioEppSolicitud | null): string {
    const src = s || this.activeCambioSolicitud;
    return String(src?.sectionCode || src?.formSnapshot?.sectionCode || '').trim().toUpperCase();
  }

  getCambioSectionLabel(): string {
    const s = this.activeCambioSolicitud;
    if (!s) return '';
    return s.sectionLabel || s.formSnapshot?.sectionLabel || this.getCambioSectionCode(s) || '';
  }

  /** True mientras se entrega por solicitud: el producto no se elige libremente. */
  isCambioEntregaLocked(): boolean {
    return !!this.activeCambioSolicitud && !!this.getCambioSectionCode();
  }

  viewCambioSigned(s: CambioEppSolicitud): void {
    this.cambioEppSolicitudService.getSignedFile(this.ruc, s).subscribe({
      next: (file) => {
        if (!file?.blob) {
          this.errorMessage = 'No hay documento firmado disponible para esta solicitud.';
          return;
        }
        this.closeSignedViewer();
        this.signedViewerTitle = `${s.nReporte} · ${s.trabajador || ''}`.trim();
        this.signedViewerIsPdf = /pdf/i.test(file.type || '') || /\.pdf$/i.test(file.name || '');
        try {
          this.signedViewerObjectUrl = URL.createObjectURL(file.blob);
          if (this.signedViewerIsPdf) {
            this.signedViewerSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
              `${this.signedViewerObjectUrl}#toolbar=0&navpanes=0`
            );
            this.signedViewerImgUrl = '';
          } else {
            this.signedViewerImgUrl = this.signedViewerObjectUrl;
            this.signedViewerSafeUrl = null;
          }
        } catch {
          this.errorMessage = 'No se pudo abrir el documento firmado.';
          return;
        }
        this.showSignedViewer = true;
        document.body.style.overflow = 'hidden';
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el documento firmado desde el servidor.';
      }
    });
  }

  closeSignedViewer(): void {
    this.showSignedViewer = false;
    if (this.signedViewerObjectUrl) {
      try { URL.revokeObjectURL(this.signedViewerObjectUrl); } catch {}
      this.signedViewerObjectUrl = '';
    }
    this.signedViewerSafeUrl = null;
    this.signedViewerImgUrl = '';
    this.signedViewerTitle = '';
    document.body.style.overflow = '';
  }

  ngOnDestroy(): void {
    this.closeSignedViewer();
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const header = parts[0] || '';
    const data = parts[1] || '';
    const mime = header.match(/data:([^;]+);/)?.[1] || 'application/pdf';
    const binary = atob(data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  approveAndDeliverCambio(): void {
    if (!this.activeCambioSolicitud) return;
    if (this.details.length === 0) {
      this.errorMessage = this.isCambioEntregaLocked()
        ? `No hay EPP de sección ${this.getCambioSectionLabel()} cargado. Verifique catálogo/stock.`
        : 'Agregue al menos un producto EPP a entregar.';
      return;
    }
    const raw = this.outputForm.value as any;
    if (!raw.employeeId) {
      this.errorMessage = 'Seleccione el trabajador receptor del EPP.';
      return;
    }
    if (!this.despachadorEmployeeId || !String(raw.authorizedBy || '').trim()) {
      this.errorMessage = 'Seleccione la persona que despacha el EPP.';
      return;
    }
    const emp = this.employees.find(e => Number(e.id) === Number(raw.employeeId));
    if (!emp || !EmployeeService.isEmployeeActive(emp)) {
      this.errorMessage = emp
        ? this.inactiveEmployeeAlert(emp)
        : 'El trabajador seleccionado no es válido o está inactivo. No se puede entregar EPP.';
      return;
    }

    const solicitud = this.activeCambioSolicitud;
    this.loading = true;
    this.errorMessage = '';

    this.cambioEppSolicitudService.getSignedFile(this.ruc, solicitud).subscribe({
      next: (signed) => {
        if (!signed?.blob) {
          this.loading = false;
          this.errorMessage = 'Falta el documento firmado de la solicitud. Súbalo desde Seguridad Industrial → Cambio de EPP.';
          return;
        }
        const isPdf = /pdf/i.test(signed.type || '') || /\.pdf$/i.test(signed.name || '');
        if (!isPdf) {
          this.loading = false;
          this.errorMessage = 'Para confirmar la entrega el documento firmado debe ser PDF.';
          return;
        }
        const signedFile = this.cambioEppSolicitudService.signedFileToFile(
          signed,
          `${solicitud.nReporte}_firmado.pdf`
        );
        if (!signedFile) {
          this.loading = false;
          this.errorMessage = 'No se pudo leer el documento firmado guardado.';
          return;
        }
        this.executeCambioDelivery(raw, emp, signedFile, solicitud.id);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar el PDF firmado desde el servidor.';
      }
    });
  }

  private executeCambioDelivery(raw: any, emp: EmployeeResponse | undefined, signedFile: File, solicitudId: string): void {
    if (!this.activeCambioSolicitud) {
      this.loading = false;
      return;
    }

    const empLabel = emp
      ? `${emp.apellidos || ''} ${emp.nombres || emp.name || ''}`.trim() + (emp.cedula ? ` | CED:${emp.cedula}` : '')
      : '';
    const despachadorLabel = String(raw.authorizedBy || '').trim();
    const despachadorNote = despachadorLabel
      ? `[DESPACHA:${despachadorLabel}${this.despachadorCargo ? ' | ' + this.despachadorCargo : ''}]`
      : '';
    const auditNote = empLabel ? `[TRABAJADOR:${empLabel}]` : '';
    const cambioNote = `[CAMBIO-EPP:${this.activeCambioSolicitud.nReporte}]`;
    const solIdNote = `[SOLICITUD_ID:${solicitudId}]`;
    const pendingNote = '[PENDIENTE_3_FIRMAS]';
    const notes = [raw.notes, cambioNote, solIdNote, auditNote, despachadorNote, pendingNote]
      .filter(Boolean).join(' ').trim() || null;

    const solicitud = this.activeCambioSolicitud;
    const fechaEntrega = (() => {
      const d = raw.outputDate ? new Date(`${raw.outputDate}T12:00:00`) : new Date();
      if (isNaN(d.getTime())) return String(raw.outputDate || '');
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    })();

    const payload: any = {
      outputNumber: raw.outputNumber,
      outputDate: raw.outputDate,
      outputType: 'EPP_TRABAJADOR',
      employeeId: raw.employeeId,
      area: raw.area || null,
      project: raw.project || null,
      returnDate: null,
      authorizedBy: raw.authorizedBy || this.deliveredBy || null,
      notes,
      status: 'BORRADOR',
      details: this.details.map(d => ({
        variantId: d.variantId,
        variant: { id: d.variantId },
        quantity: d.quantity,
        unitCost: d.unitCost,
        totalCost: d.totalCost,
        lotNumber: d.lotNumber || null,
        warehouseLocation: d.warehouseLocation || null,
        itemCondition: d.itemCondition || 'NUEVO',
        notes: d.notes || null,
        issuedSize: d.issuedSize || solicitud?.formSnapshot?.talla || null,
        departmentId: d.departmentId || null
      }))
    };

    const snap = {
      ...(solicitud.formSnapshot || this.cambioEppSolicitudService.emptySnapshot()),
      nReporte: solicitud.nReporte || solicitud.formSnapshot?.nReporte || '',
      nombreTrabajador: solicitud.trabajador || solicitud.formSnapshot?.nombreTrabajador || '',
      cedula: solicitud.cedula || solicitud.formSnapshot?.cedula || '',
      cargo: solicitud.cargo || solicitud.formSnapshot?.cargo || '',
      area: solicitud.area || solicitud.formSnapshot?.area || '',
      empresa: solicitud.formSnapshot?.empresa || this.businessName || '',
      despachadorNombre: despachadorLabel,
      despachadorCargo: this.despachadorCargo || '',
      fechaEntregaDespacho: fechaEntrega
    } as any;

    const finishBorradorWithFile = (pdfFile: File, created: any, msg: string) => {
      const outputId = created.id;
      this.fileService.uploadFileToDirectory('inventory_outputs', pdfFile).subscribe({
        next: (resp) => {
          const path = resp?.url || '';
          if (!path) {
            this.loading = false;
            this.errorMessage = 'Salida creada, pero no se pudo subir el PDF.';
            return;
          }
          this.outputService.updateDocument(this.ruc, outputId, path).subscribe({
            next: () => {
              this.activeCambioSolicitud = null;
              this.loadCambioSolicitudes();
              this.refreshGeneratedDocsFromBackend();
              this.loading = false;
              this.successMessage = msg;
              setTimeout(() => {
                this.router.navigate([`/usuario/${this.ruc}/inventario/historial-salidas`]);
              }, 2200);
            },
            error: () => {
              this.loading = false;
              this.errorMessage = 'PDF generado, pero no se asoció a la salida.';
            }
          });
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo subir el PDF de validación.';
        }
      });
    };

    this.cambioEppPdfService.generateBlob(snap, {
      despacho: { nombre: despachadorLabel, cargo: this.despachadorCargo, fecha: fechaEntrega },
      logoDataUrl: this.businessLogoDataUrl || undefined,
      businessName: this.businessName
    }).then(({ blob, fileName }) => {
      const pdfFile = this.cambioEppPdfService.toFile(blob, fileName);
      this.cambioEppPdfService.downloadBlob(blob, fileName);
      this.outputService.create(this.ruc, payload).subscribe({
        next: (created) => {
          if (!created?.id) {
            this.loading = false;
            this.errorMessage = 'La salida se creó sin ID.';
            return;
          }
          this.createdOutputId = created.id;
          if (created?.outputNumber) {
            this.outputForm.patchValue({ outputNumber: created.outputNumber });
          }
          finishBorradorWithFile(
            pdfFile,
            created,
            `PDF listo (incluye quien despacha: ${despachadorLabel}). Descargado. En Historial suba el PDF con las 3 firmas para cerrar la entrega y afectar stock.`
          );
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'No se pudo crear la salida de inventario.';
        }
      });
    }).catch(() => {
      this.outputService.create(this.ruc, payload).subscribe({
        next: (created) => {
          if (!created?.id) {
            this.loading = false;
            this.errorMessage = 'La salida se creó sin ID.';
            return;
          }
          try {
            const url = URL.createObjectURL(signedFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = signedFile.name || 'cambio-epp.pdf';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
          } catch { /* ignore */ }
          finishBorradorWithFile(
            signedFile,
            created,
            'Salida en borrador. En Historial suba el PDF con las 3 firmas para cerrar la entrega.'
          );
        },
        error: (err: any) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'No se pudo crear la salida de inventario.';
        }
      });
    });
  }

  severidadCambioLabel(value: string): string {
    const map: Record<string, string> = {
      insignificante: 'Insignificante',
      poco_importante: 'Poco importante',
      importante: 'Importante',
      urgente: 'Urgente'
    };
    return map[value] || value || '—';
  }

  loadEmployees(): void {
    // Solo activos para nuevas entregas/préstamos (los inactivos quedan en historial/auditoría).
    this.employeeService.getActiveEmployeesByBusinessRuc(this.ruc).subscribe({
      next: (data) => {
        this.employees = (data || []).filter(e => EmployeeService.isEmployeeActive(e));
        this.refreshGeneratedDocsFromBackend();
      },
      error: () => {
        // Fallback: lista completa filtrada en cliente
        this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
          next: (all) => {
            this.employees = (all || []).filter(e => EmployeeService.isEmployeeActive(e));
            this.refreshGeneratedDocsFromBackend();
          },
          error: () => {
            this.employees = [];
            this.refreshGeneratedDocsFromBackend();
          }
        });
      }
    });
  }

  loadProducts(): void {
    this.productService.list(this.ruc).subscribe({
      next: (data) => {
        this.allProducts = data || [];
        this.applyProductFilter();
        if (this.activeCambioSolicitud && this.details.length === 0 && this.getCambioSectionCode()) {
          this.autoFillCambioSectionProduct();
        }
      },
      error: () => {
        this.allProducts = [];
        this.products = [];
      }
    });
  }

  private resolveProductKind(p: InventoryProduct): 'EPP' | 'HERRAMIENTA' | 'PIEZA' {
    const k = (p.productKind || '').toString().toUpperCase();
    if (k === 'EPP' || k === 'HERRAMIENTA' || k === 'PIEZA') return k;
    const cat = (p.categoryRef?.name || p.category || '').toUpperCase();
    if (cat.includes('HERRAMIENT')) return 'HERRAMIENTA';
    if (cat.includes('PIEZA') || cat.includes('REPUESTO')) return 'PIEZA';
    const code = (p.code || '').toUpperCase();
    if (code.startsWith('HER-') || code.startsWith('HERR-')) return 'HERRAMIENTA';
    if (code.startsWith('PIE-')) return 'PIEZA';
    return 'EPP';
  }

  private resolveProductSectionCode(p: InventoryProduct): string {
    const direct = (p.sectionCode || '').toString().trim().toUpperCase();
    if (direct) return direct;
    const code = (p.code || '').toUpperCase();
    const m = code.match(/^[A-Z0-9]{3}-([A-Z0-9]{3})-\d{3}$/);
    return m ? m[1] : '';
  }

  private applyProductFilter(): void {
    const type = this.outputForm?.get('outputType')?.value;
    const list = this.allProducts || [];
    let filtered: InventoryProduct[];
    if (type === 'EPP_TRABAJADOR') {
      filtered = list.filter(p => this.resolveProductKind(p) === 'EPP');
    } else if (type === 'PRESTAMO') {
      filtered = list.filter(p => this.resolveProductKind(p) === 'HERRAMIENTA');
    } else {
      filtered = list.slice();
    }

    // Entrega por solicitud: solo la sección pedida (Casco, Camisa, etc.)
    const section = this.getCambioSectionCode();
    if (this.activeCambioSolicitud && section) {
      filtered = filtered.filter(p => this.resolveProductSectionCode(p) === section);
    }
    this.products = filtered;
  }

  productPickerHint(): string {
    if (this.isCambioEntregaLocked()) {
      const label = this.getCambioSectionLabel();
      return `Solo sección solicitada: ${label} (${this.getCambioSectionCode()}). No se pueden agregar otros EPP.`;
    }
    const type = this.outputForm?.get('outputType')?.value;
    if (type === 'EPP_TRABAJADOR') return 'Mostrando solo productos tipo EPP';
    if (type === 'PRESTAMO') return 'Mostrando solo productos tipo Herramienta';
    return 'Mostrando todo el catálogo';
  }

  /**
   * Precarga en "Productos que Salen" el EPP de la sección de la solicitud
   * (elige variante con stock; prioriza talla del formulario si existe).
   */
  private autoFillCambioSectionProduct(): void {
    const section = this.getCambioSectionCode();
    if (!section || !this.ruc) return;

    this.applyProductFilter();
    const candidates = this.products.filter(p => !!p.id);
    if (!candidates.length) {
      this.errorMessage = `No hay productos en catálogo para la sección ${this.getCambioSectionLabel() || section}. Regístrelos en Inventario → Catálogo (familia EPP → esa sección).`;
      return;
    }

    const tallaRef = String(this.activeCambioSolicitud?.formSnapshot?.talla || '')
      .trim()
      .toLowerCase();

    const calls = candidates.map(p =>
      this.variantService.listByProduct(this.ruc, p.id!).pipe(
        map(variants => ({ product: p, variants: variants || [] })),
        catchError(() => of({ product: p, variants: [] as InventoryVariant[] }))
      )
    );

    forkJoin(calls).subscribe({
      next: (rows) => {
        const prevErr = this.errorMessage;
        type Pick = { product: InventoryProduct; variant: InventoryVariant; score: number };
        const scored: Pick[] = [];
        for (const row of rows) {
          for (const v of row.variants) {
            const stock = Number(v.currentQty || 0);
            if (stock <= 0) continue;
            const size = String(v.sizeLabel || '').trim().toLowerCase();
            let score = 1;
            if (tallaRef && size && (size === tallaRef || size.includes(tallaRef) || tallaRef.includes(size))) {
              score = 100;
            } else if (tallaRef && size) {
              score = 10;
            }
            scored.push({ product: row.product, variant: v, score });
          }
        }
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (!best) {
          this.errorMessage = prevErr
            || `Hay productos de ${this.getCambioSectionLabel() || section}, pero ninguno tiene stock. Abastezca inventario antes de validar.`;
          return;
        }
        this.pushDetailLine(best.product, best.variant, tallaRef || best.variant.sizeLabel || '');
        if (prevErr) {
          this.errorMessage = prevErr;
        } else {
          this.successMessage =
            `Producto cargado automáticamente: ${best.product.name} (${this.getCambioSectionLabel()}). Solo se dota lo solicitado.`;
        }
      },
      error: () => {
        this.errorMessage = this.errorMessage
          || 'No se pudieron cargar las variantes del EPP solicitado.';
      }
    });
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => this.departments = data || [],
      error: () => this.departments = []
    });
  }

  openProductModal(): void {
    if (this.isCambioEntregaLocked() && this.details.length > 0) {
      // En solicitud: solo se permite cambiar variante de la misma sección, no agregar otro EPP.
      this.errorMessage = `Esta entrega está fijada a la sección ${this.getCambioSectionLabel()}. Quite la línea actual si necesita elegir otra variante de la misma sección.`;
      return;
    }
    this.applyProductFilter();
    this.showProductModal = true;
    this.selectedProduct = null;
    this.selectedVariant = null;
    this.variants = [];
    // Si solo hay un producto de la sección, abrirlo de una vez
    if (this.isCambioEntregaLocked() && this.products.length === 1) {
      this.selectProduct(this.products[0]);
    }
  }

  selectProduct(product: InventoryProduct): void {
    if (this.isCambioEntregaLocked()) {
      const section = this.getCambioSectionCode();
      if (section && this.resolveProductSectionCode(product) !== section) {
        this.errorMessage = `Solo puede elegir productos de la sección ${this.getCambioSectionLabel()} (${section}).`;
        return;
      }
    }
    this.selectedProduct = product;
    if (product.id) {
      this.variantService.listByProduct(this.ruc, product.id).subscribe({
        next: (data) => this.variants = data,
        error: () => this.variants = []
      });
    }
  }

  selectVariant(variant: InventoryVariant): void {
    const stock = Number(variant.currentQty || 0);
    if (stock <= 0) {
      this.errorMessage = 'No tiene stock. Indique a su administrador que agregue stock de este material.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.selectedVariant = variant;
  }

  addDetailLine(): void {
    if (!this.selectedVariant || !this.selectedProduct) return;
    if (this.isCambioEntregaLocked() && this.details.length > 0) {
      this.errorMessage = 'Ya hay un EPP cargado por la solicitud. Quite la línea si desea cambiar la variante de la misma sección.';
      return;
    }
    this.pushDetailLine(
      this.selectedProduct,
      this.selectedVariant,
      this.activeCambioSolicitud?.formSnapshot?.talla || this.selectedVariant.sizeLabel || ''
    );
    this.showProductModal = false;
    this.selectedProduct = null;
    this.selectedVariant = null;
  }

  private pushDetailLine(product: InventoryProduct, variant: InventoryVariant, issuedSize?: string): void {
    const stock = Number(variant.currentQty || 0);
    if (stock <= 0) {
      this.errorMessage = 'No tiene stock. Indique a su administrador que agregue stock de este material.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const detail: InventoryOutputDetail = {
      variantId: variant.id!,
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      itemCondition: 'NUEVO',
      productName: product.name,
      variantCode: variant.code,
      productImage: variant.image || product.image,
      issuedSize: issuedSize || variant.sizeLabel || '',
      generalSpecs: variant.generalSpecs || '',
      techSheetPdf: variant.techSheetPdf || '',
      brand: 'NA',
      supplierName: '—',
      minUseTime: '1 AÑO'
    };

    this.details.push(detail);
    const newIndex = this.details.length - 1;
    this.lotService.listAvailable(this.ruc, variant.id!).subscribe({
      next: (lots) => this.lotOptions[newIndex] = lots || [],
      error: () => this.lotOptions[newIndex] = []
    });
    this.attrService.list(this.ruc, variant.id!).subscribe({
      next: (attrs) => {
        const marca = (attrs || []).find(a => (a.attributeName || '').toLowerCase() === 'marca');
        if (marca?.attributeValue) detail.brand = marca.attributeValue;
      },
      error: () => {}
    });
  }

  removeDetail(index: number): void {
    this.details.splice(index, 1);
    delete this.lotOptions[index];
    // Reindexar lotOptions para mantener claves coherentes
    const newMap: { [i: number]: InventoryLotDto[] } = {};
    this.details.forEach((_, i) => {
      if (this.lotOptions[i]) newMap[i] = this.lotOptions[i];
    });
    this.lotOptions = newMap;
  }

  calculateLineCost(detail: InventoryOutputDetail): void {
    if (detail.unitCost && detail.quantity) {
      detail.totalCost = detail.quantity * detail.unitCost;
    }
  }

  getTotalOutput(): number {
    return this.details.reduce((sum, d) => sum + (d.totalCost || 0), 0);
  }

  isHeaderValid(): boolean {
    const v = this.outputForm.value;
    const type = v.outputType;
    
    // Validaciones según tipo de salida
    if (type === 'EPP_TRABAJADOR') {
      return !!(v.outputNumber && v.outputDate && v.employeeId);
    }
    
    if (type === 'PRESTAMO') {
      return !!(v.outputNumber && v.outputDate && v.employeeId && v.returnDate);
    }
    
    if (type === 'CONSUMO_AREA') {
      return !!(v.outputNumber && v.outputDate && v.area);
    }
    
    if (type === 'BAJA') {
      return !!(v.outputNumber && v.outputDate && v.bajaReason);
    }
    
    return false;
  }

  generateOutputNumber(): string {
    return this.outputForm?.get('outputNumber')?.value || this.generateOutputNumberFallback();
  }

  /** Fallback local si el backend no responde: SAL-2026-0001 */
  private generateOutputNumberFallback(): string {
    const year = new Date().getFullYear();
    return `SAL-${year}-0001`;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea PDF
      if (file.type !== 'application/pdf') {
        this.errorMessage = 'Solo se permiten archivos PDF';
        event.target.value = ''; // Limpiar el input
        this.selectedFile = null;
        this.documentFileName = '';
        this.documentFileSize = '';
        return;
      }
      
      // Validar tamaño máximo (2 MB)
      if (file.size > 2 * 1024 * 1024) {
        this.errorMessage = 'El archivo PDF no debe superar los 2 MB';
        event.target.value = '';
        this.selectedFile = null;
        this.documentFileName = '';
        this.documentFileSize = '';
        return;
      }
      
      this.selectedFile = file;
      this.documentFileName = file.name;
      this.documentFileSize = this.formatFileSize(file.size);
      this.errorMessage = ''; // Limpiar mensaje de error si había
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  submit(): void {
    if (this.outputForm.invalid) {
      this.errorMessage = 'Completa todos los campos requeridos';
      return;
    }
    if (this.details.length === 0) {
      this.errorMessage = 'Debes agregar al menos un producto';
      return;
    }

    const raw = this.outputForm.value as any;
    const isEpp = raw.outputType === 'EPP_TRABAJADOR';
    const emp = this.employees.find(e => Number(e.id) === Number(raw.employeeId));
    if ((isEpp || raw.outputType === 'PRESTAMO') && raw.employeeId) {
      if (!emp || !EmployeeService.isEmployeeActive(emp)) {
        this.errorMessage = emp
          ? this.inactiveEmployeeAlert(emp)
          : 'No se puede registrar salida: el trabajador no es válido o está inactivo.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    this.loading = true;
    this.errorMessage = '';

    const empLabel = emp
      ? `${emp.apellidos || ''} ${emp.nombres || emp.name || ''}`.trim() + (emp.cedula ? ` | CED:${emp.cedula}` : '')
      : '';
    const auditNote = empLabel ? `[TRABAJADOR:${empLabel}]` : '';
    const notes = [raw.notes, auditNote].filter(Boolean).join(' ').trim() || null;

    const payload: any = {
      outputNumber: raw.outputNumber,
      outputDate: raw.outputDate,
      outputType: raw.outputType,
      employeeId: raw.employeeId || null,
      area: raw.area || null,
      project: raw.project || null,
      returnDate: raw.returnDate || null,
      authorizedBy: raw.authorizedBy || this.deliveredBy || null,
      notes,
      status: isEpp ? 'BORRADOR' : 'CONFIRMADO',
      details: this.details.map(d => ({
        variantId: d.variantId,
        variant: { id: d.variantId },
        quantity: d.quantity,
        unitCost: d.unitCost,
        totalCost: d.totalCost,
        lotNumber: d.lotNumber || null,
        warehouseLocation: d.warehouseLocation || null,
        itemCondition: d.itemCondition || 'NUEVO',
        notes: d.notes || null,
        issuedSize: d.issuedSize || null,
        departmentId: d.departmentId || null
      }))
    };

    this.outputService.create(this.ruc, payload).subscribe({
      next: (created) => {
        this.createdOutputId = created.id || null;
        if (created?.outputNumber) {
          this.outputForm.patchValue({ outputNumber: created.outputNumber });
        }
        this.loading = false;
        if (isEpp) {
          this.successMessage = 'Salida registrada en BORRADOR. PDF generado automáticamente para impresión.';
          // Generar PDF automáticamente antes de bloquear/limpiar
          this.generatePdf().finally(() => this.lockAfterCreate());
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          this.onSuccessFinal();
        }
      },
      error: (err: any) => {
        this.loading = false;
        if (err.status === 409) {
          this.errorMessage = err?.error?.message || 'El número de documento ya existe. Por favor use un número único.';
        } else {
          this.errorMessage = err?.error?.message || 'Error al registrar la salida';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  private lockAfterCreate(): void {
    // Bloquear el formulario y limpiar campos para iniciar solo la subida de PDF
    try { this.outputForm.reset(); } catch {}
    try { this.outputForm.disable({ emitEvent: false }); } catch {}
    this.details = [];
    this.lotOptions = {};
    this.formLocked = true;
    // Mantener estados de documento para permitir la subida
    this.selectedFile = null;
    this.documentFileName = '';
    this.documentFileSize = '';
    this.pdfGenerated = false;
  }

  newProcess(): void {
    // Reiniciar para una nueva salida sin afectar la creada previamente
    this.formLocked = false;
    this.createdOutputId = null;
    this.documentUploaded = false;
    this.pdfGenerated = false;
    this.selectedFile = null;
    this.documentFileName = '';
    this.documentFileSize = '';
    this.details = [];
    this.lotOptions = {};
    const today = new Date().toISOString().split('T')[0];
    try {
      this.outputForm.enable({ emitEvent: false });
      this.outputForm.reset({
        outputNumber: this.generateOutputNumberFallback(),
        outputDate: today,
        outputType: 'EPP_TRABAJADOR',
        employeeId: null,
        area: '',
        project: '',
        returnDate: '',
        authorizedBy: this.deliveredBy || '',
        notes: '',
        bajaReason: ''
      });
    } catch {}
    this.loadNextOutputNumber();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  uploadDocument(): void {
    if (!this.createdOutputId || !this.selectedFile) return;
    this.loading = true;
    this.fileService.uploadFileToDirectory('inventory_outputs', this.selectedFile).subscribe({
      next: (resp) => {
        const path = resp?.url || '';
        if (!path) {
          this.loading = false;
          this.errorMessage = 'No se pudo obtener la ruta del archivo subido.';
          return;
        }
        this.outputService.updateDocument(this.ruc, this.createdOutputId!, path).subscribe({
          next: () => {
            // Documento asociado, proceder a confirmar automáticamente
            this.documentUploaded = true;
            this.outputService.confirm(this.ruc, this.createdOutputId!).subscribe({
              next: () => this.onSuccessFinal(),
              error: () => {
                this.loading = false;
                this.errorMessage = 'Documento subido, pero ocurrió un error al confirmar la salida.';
              }
            });
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'Error al asociar el documento a la salida.';
          }
        });
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = (e?.message) ? e.message : 'Error al subir el documento PDF.';
      }
    });
  }

  confirmCreatedOutput(): void {
    if (!this.createdOutputId) return;
    if (!this.documentUploaded) {
      this.errorMessage = 'Primero debe subir el PDF firmado para confirmar la salida.';
      return;
    }
    this.loading = true;
    this.outputService.confirm(this.ruc, this.createdOutputId).subscribe({
      next: () => this.onSuccessFinal(),
      error: (err) => {
        this.loading = false;
        this.errorMessage = (err?.error?.message) ? err.error.message : 'Error al confirmar la salida.';
      }
    });
  }

  onSuccessFinal(): void {
    this.loading = false;
    this.successMessage = 'Salida registrada exitosamente. Stock actualizado.';
    setTimeout(() => {
      this.router.navigate([`/usuario/${this.ruc}/inventario/historial-salidas`]);
    }, 2000);
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/img/company-placeholder.svg';
    if (imagePath.startsWith('http')) return imagePath;
    return `/api/files/${imagePath}`;
  }

  getSelectedEmployee(): EmployeeResponse | null {
    const id = this.outputForm?.value?.employeeId;
    if (!id) return null;
    return this.employees.find(e => Number(e.id) === Number(id)) || null;
  }

  getEmployeeFullName(): string {
    const e = this.getSelectedEmployee();
    if (!e) return '';
    const nombres = (e.nombres || '').toString().trim();
    const apellidos = (e.apellidos || '').toString().trim();
    if (nombres || apellidos) return `${nombres} ${apellidos}`.trim();
    return e.name || '';
  }

  // === Documentos Generados persistentes (desde backend) ===
  private refreshGeneratedDocsFromBackend(): void {
    if (!this.ruc) return;
    this.outputService.list(this.ruc).subscribe({
      next: (all) => {
        const pending = (all || []).filter(o => o.status === 'BORRADOR' && o.outputType === 'EPP_TRABAJADOR');
        const mapped = pending.map(o => this.mapOutputToGeneratedDoc(o));
        // Evitar duplicados y priorizar entradas con el mismo id provenientes de sesión
        const ids = new Set(mapped.map(m => m.id));
        const sessionOnes = (this.generatedDocs || []).filter(d => !ids.has(d.id));
        this.generatedDocs = [...mapped, ...sessionOnes];
      },
      error: () => {
        // No cambiar lista si falla
      }
    });
  }

  private mapOutputToGeneratedDoc(o: InventoryOutput): { id: number; name: string; url: string; employeeName: string; cedula: string; description: string } {
    const emp = this.employees.find(e => Number(e.id) === Number(o.employeeId));
    const employeeName = emp ? `${(emp.nombres || '').toString().trim()} ${(emp.apellidos || '').toString().trim()}`.trim() || (emp.name || '') : '';
    const cedula = emp?.cedula || '';
    const name = `Acta-Entrega-EPP-${o.outputNumber}.pdf`;
    // Si ya existe documento cargado (rara vez en BORRADOR), exponer URL, si no, no
    const url = o.documentImage ? this.getImageUrl(o.documentImage) : '';
    return { id: o.id!, name, url, employeeName, cedula, description: 'Falta culminar el proceso' };
  }

  // === Carga de imágenes (logo empresa y foto trabajador) ===
  private async toDataUrlWithAuth(url: string): Promise<string> {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  private loadBusinessLogo(): void {
    if (!this.ruc) return;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: async (biz) => {
        const path = biz?.logo || '';
        const prevDelivered = this.deliveredBy;
        if (biz?.name) {
          this.businessName = biz.name;
          this.deliveredBy = biz.name;
          try {
            // En entrega por solicitud, "quien despacha" lo elige el usuario (no la empresa).
            if (!this.activeCambioSolicitud) {
              const abCtrl = this.outputForm.get('authorizedBy');
              const current = abCtrl?.value || '';
              if (!current || current === prevDelivered) {
                abCtrl?.patchValue(this.deliveredBy || '');
              }
            }
          } catch {}
        }
        if (!path) { this.businessLogoDataUrl = ''; return; }
        const fullUrl = path.startsWith('http') ? path : this.fileService.getFileUrl(path);
        this.businessLogoDataUrl = await this.toDataUrlWithAuth(fullUrl);
      },
      error: () => { this.businessLogoDataUrl = ''; }
    });
  }

  private async refreshEmployeePhotoDataUrl(): Promise<void> {
    const emp = this.getSelectedEmployee() as any;
    const imagePath = emp?.imagePath || emp?.profile_picture || emp?.photo || emp?.foto || '';
    if (!imagePath || typeof imagePath !== 'string') {
      this.employeePhotoDataUrl = '';
      return;
    }
    const clean = String(imagePath).replace(/^\/+/, '').replace(/\\/g, '/');
    const candidates: string[] = [];
    if (/^https?:\/\//i.test(clean)) {
      candidates.push(clean);
    } else {
      const fileOnly = clean.split('/')?.pop() || clean;
      candidates.push(this.fileService.getFileDirectoryUrl('profiles', fileOnly, false));
      candidates.push(this.employeeService.getEmployeePhotoUrl(fileOnly));
      if (clean.includes('/')) {
        candidates.push(this.fileService.getFileUrl(clean));
      }
      // Rutas típicas del backend
      candidates.push(`/api/files/profiles/${fileOnly}`);
      candidates.push(`/api/files/download/profiles/${fileOnly}`);
    }
    let dataUrl = '';
    for (const url of candidates) {
      if (!url) continue;
      dataUrl = await this.toDataUrlWithAuth(url);
      if (dataUrl && dataUrl.startsWith('data:image')) break;
      dataUrl = '';
    }
    this.employeePhotoDataUrl = dataUrl;
  }

  // === Firma en canvas (mouse/touch) ===
  startDraw(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const pos = this.getCanvasPos(event);
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = this.getCanvasPos(event);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  stopDraw(): void {
    this.isDrawing = false;
  }

  clearSignature(): void {
    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.signatureDataUrl = '';
  }

  saveSignature(): void {
    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    this.signatureDataUrl = canvas.toDataURL('image/png');
  }

  private getCanvasPos(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement | null;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if (event instanceof TouchEvent) {
      const t = event.touches[0] || event.changedTouches[0];
      clientX = t?.clientX ?? 0;
      clientY = t?.clientY ?? 0;
    } else {
      const me = event as MouseEvent;
      clientX = me.clientX;
      clientY = me.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // Aviso para préstamos próximos a vencer o vencidos
  getReturnDateWarning(): string | null {
    const v = this.outputForm?.value;
    if (!v || v.outputType !== 'PRESTAMO' || !v.returnDate) return null;
    try {
      const due = new Date(v.returnDate);
      const today = new Date();
      due.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
      if (isNaN(diffDays)) return null;
      if (diffDays < 0) return 'La fecha de devolución está vencida.';
      if (diffDays <= 2) return 'La devolución vence pronto.';
      return null;
    } catch {
      return null;
    }
  }

  // Impresión del comprobante
  printReceipt(): void {
    this.saveSignature();
    this.printing = true;
    setTimeout(() => {
      window.print();
      this.printing = false;
    }, 100);
  }

  // Buscar trabajador por cédula
  searchByCedula(): void {
    const c = (this.cedulaSearch || '').trim();
    if (!c) return;
    this.employeeService.getEmployeeByCedulaScopedByRuc(this.ruc, c).subscribe({
      next: (emp) => {
        if (!emp?.id) {
          this.errorMessage = 'No se encontró trabajador con esa cédula';
          return;
        }
        if (!EmployeeService.isEmployeeActive(emp)) {
          this.errorMessage = this.inactiveEmployeeAlert(emp);
          return;
        }
        this.errorMessage = '';
        this.outputForm.patchValue({ employeeId: emp.id });
        if (!this.employees.find(e => Number(e.id) === Number(emp.id))) {
          this.employees = [emp, ...this.employees];
        }
        this.refreshEmployeePhotoDataUrl();
      },
      error: () => { this.errorMessage = 'No se encontró trabajador con esa cédula'; }
    });
  }

  // Buscar trabajador por código
  searchByCodigo(): void {
    const code = (this.codigoSearch || '').trim();
    if (!code) return;
    this.employeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code, activeOnly: true }).subscribe({
      next: (page) => {
        const emp = page?.content?.[0];
        if (!emp?.id) {
          // Puede existir pero inactivo: verificar sin filtro
          this.employeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code }).subscribe({
            next: (allPage) => {
              const any = allPage?.content?.[0];
              if (any && !EmployeeService.isEmployeeActive(any as any)) {
                this.errorMessage = this.inactiveEmployeeAlert(any as EmployeeResponse);
              } else {
                this.errorMessage = 'Código no encontrado';
              }
            },
            error: () => { this.errorMessage = 'Código no encontrado'; }
          });
          return;
        }
        this.errorMessage = '';
        this.outputForm.patchValue({ employeeId: emp.id });
        if (!this.employees.find(e => Number(e.id) === Number(emp.id))) {
          this.employees = [emp, ...this.employees];
        }
        this.refreshEmployeePhotoDataUrl();
      },
      error: () => { this.errorMessage = 'Error buscando por código'; }
    });
  }

  deleteGeneratedDoc(doc: { id: number }): void {
    const id = doc?.id;
    if (!id) return;
    const ok = window.confirm('¿Eliminar este documento pendiente? Esta acción no se puede deshacer.');
    if (!ok) return;
    this.loading = true;
    this.outputService.delete(this.ruc, id).subscribe({
      next: () => {
        this.generatedDocs = this.generatedDocs.filter(d => d.id !== id);
        delete this.pendingRowFiles[id];
        delete this.pendingRowFileNames[id];
        delete this.pendingRowFileSizes[id];
        this.loading = false;
        this.successMessage = 'Documento pendiente eliminado.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = (err?.error?.message) ? err.error.message : 'No se pudo eliminar el documento pendiente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  private cedulaTimer: any;
  private codigoTimer: any;
  onCedulaInput(): void {
    const c = (this.cedulaSearch || '').trim();
    if (this.cedulaTimer) clearTimeout(this.cedulaTimer);
    this.cedulaTimer = setTimeout(() => {
      if (c && c.length >= 10) this.searchByCedula();
    }, 400);
  }

  onCodigoInput(): void {
    const code = (this.codigoSearch || '').trim();
    if (this.codigoTimer) clearTimeout(this.codigoTimer);
    this.codigoTimer = setTimeout(() => {
      if (code && code.length >= 3) this.searchByCodigo();
    }, 400);
  }
}
