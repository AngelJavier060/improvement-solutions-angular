import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryOutputService, InventoryOutput, InventoryOutputDetail } from '../../../../../services/inventory-output.service';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { DepartmentService } from '../../../../../services/department.service';
import { Department } from '../../../../../models/department.model';
import { InventoryLotService, InventoryLotDto } from '../../../../../services/inventory-lot.service';
import { EmployeeService } from '../../../../dashboard/usuario/talento-humano/services/employee.service';
import { BusinessService } from '../../../../../services/business.service';
import { EmployeeResponse } from '../../../../dashboard/usuario/talento-humano/models/employee.model';
import { FileService } from '../../../../../services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-nueva-salida',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './nueva-salida.component.html',
  styleUrls: ['./nueva-salida.component.scss']
})
export class NuevaSalidaComponent implements OnInit {
  ruc: string = '';
  outputForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  
  // Catálogos
  employees: EmployeeResponse[] = [];
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
  
  // Tipos de salida
  outputTypes = [
    { value: 'EPP_TRABAJADOR', label: 'Entrega de EPP a trabajador' },
    { value: 'PRESTAMO', label: 'Préstamo de herramienta' },
    { value: 'CONSUMO_AREA', label: 'Consumo de proyecto/área' },
    { value: 'BAJA', label: 'Baja de productos' }
  ];
  
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
    private lotService: InventoryLotService
  ) {
    const today = new Date().toISOString().split('T')[0];
    const suggestedNumber = this.generateOutputNumber();
    this.outputForm = this.fb.group({
      outputNumber: [suggestedNumber, Validators.required],
      outputDate: [today, Validators.required],
      outputType: ['EPP_TRABAJADOR', Validators.required],
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

  // Generar PDF con pdfmake
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
      const delivered = v?.authorizedBy || this.deliveredBy || '—';
      const employeeName = this.getEmployeeFullName() || '—';
      const cedula = this.getSelectedEmployee()?.cedula || '—';
      const cargo = this.getSelectedEmployee()?.positionName || '—';
      const departamento = this.getSelectedEmployee()?.departmentName || (this.outputForm?.value?.area || '—');
      // Asegurar que la foto esté lista
      await this.refreshEmployeePhotoDataUrl();

      const tableBody = [
        [{ text: 'Producto/Variante', bold: true }, { text: 'Cantidad', bold: true }, { text: 'Lote', bold: true }, { text: 'Departamento', bold: true }, { text: 'Talla', bold: true }],
        ...this.details.map(d => [
          `${d.productName || ''} ${d.variantCode ? '(' + d.variantCode + ')' : ''}`.trim(),
          String(d.quantity || 0),
          d.lotNumber || '—',
          d.departmentId ? String(d.departmentId) : '—',
          d.issuedSize || '—'
        ])
      ];

      const findSize = (kw: string): string => {
        const k = (kw || '').toLowerCase();
        const d = this.details.find(x => (`${x.productName || ''} ${x.variantCode || ''}`).toLowerCase().includes(k));
        return d?.issuedSize || '';
      };
      const botas = findSize('bota');
      const overol = findSize('overol');
      const pantalon = findSize('pantal');
      const camisa = findSize('camisa');
      const buzo = findSize('buzo');

      const eppTableBody = [
        [
          { text: 'Elemento', bold: true, fillColor: '#F5F5F5' },
          { text: 'Cantidad', bold: true, fillColor: '#F5F5F5', alignment: 'right' },
          { text: 'Talla', bold: true, fillColor: '#F5F5F5' },
          { text: 'Lote', bold: true, fillColor: '#F5F5F5' },
          { text: 'Departamento', bold: true, fillColor: '#F5F5F5' }
        ],
        ...this.details.map(d => [
          `${d.productName || ''} ${d.variantCode ? '(' + d.variantCode + ')' : ''}`.trim(),
          { text: String(d.quantity || 0), alignment: 'right' },
          d.issuedSize || '—',
          d.lotNumber || '—',
          (this.departments.find(x => x.id === d.departmentId)?.name || '—')
        ])
      ];

      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [15, 15, 15, 15],
        defaultStyle: { fontSize: 8 },
        content: [
          {
            table: {
              widths: ['20%', '80%'],
              heights: [40, 20],
              body: [
                [
                  (
                    this.businessLogoDataUrl
                      ? { image: this.businessLogoDataUrl, fit: [80, 40], alignment: 'center', margin: [5, 5], rowSpan: 2 }
                      : { text: 'LOGO', alignment: 'center', bold: true, fontSize: 14, margin: [5, 10], rowSpan: 2 }
                  ),
                  {
                    table: {
                      widths: ['*', '*', '*'],
                      body: [
                        [
                          { text: 'Sistema de Gestión de la Seguridad y Salud en el Trabajo', colSpan: 3, alignment: 'center', bold: true, fontSize: 10, margin: [0, 5] }, {}, {}
                        ],
                        [
                          { text: 'NIVEL 7:', bold: true, alignment: 'center', fontSize: 9 },
                          { text: 'FORMATOS N°:', bold: true, alignment: 'center', fontSize: 9 },
                          { text: 'SGI-FT-93', bold: true, alignment: 'center', fontSize: 9 }
                        ]
                      ]
                    },
                    layout: 'noBorders'
                  }
                ],
                [
                  {},
                  { text: 'SG-SST', alignment: 'center', bold: true, fontSize: 10, margin: [0, 3] }
                ]
              ]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          },

          {
            table: {
              widths: ['68%', '32%'],
              body: [
                [
                  { text: 'FORMATO ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL Y\nDOTACIÓN DE TRABAJO', alignment: 'center', bold: true, fontSize: 9, margin: [0, 8] },
                  {
                    stack: [
                      { columns: [ { text: 'Fecha:', bold: true, width: 'auto' }, { text: (v.outputDate || ''), width: '*' } ], margin: [5, 3] },
                      { columns: [ { text: 'Número:', bold: true, width: 'auto' }, { text: (v.outputNumber || ''), width: '*' } ], margin: [5, 3] },
                      { text: 'Versión: 001', bold: true, margin: [5, 2] },
                      { text: 'Página 1 de 1', bold: true, margin: [5, 2] }
                    ],
                    fontSize: 8
                  }
                ]
              ]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          },

          {
            table: {
              widths: ['25%', '75%'],
              body: [
                [
                  (
                    this.employeePhotoDataUrl
                      ? { image: this.employeePhotoDataUrl, fit: [110, 90], alignment: 'center', margin: [0, 10], rowSpan: 3 }
                      : { text: 'FOTO', alignment: 'center', fontSize: 20, color: '#999999', margin: [0, 30], rowSpan: 3 }
                  ),
                  { columns: [ { text: 'Nombre y Apellido:', bold: true, width: '30%' }, { text: employeeName, width: '70%' } ], margin: [5, 5] }
                ],
                [
                  {},
                  { columns: [ { text: 'Cédula:', bold: true, width: '30%' }, { text: cedula, width: '35%' }, { text: 'Departamento:', bold: true, width: '20%' }, { text: departamento, width: '15%' } ], margin: [5, 5] }
                ],
                [
                  {},
                  { columns: [ { text: 'Cargo:', bold: true, width: '30%' }, { text: cargo, width: '70%' } ], margin: [5, 5] }
                ]
              ]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          },

          {
            table: { widths: ['*'], body: [ [ { text: 'DOTACIÓN PERSONAL', alignment: 'center', bold: true, fillColor: '#EEEEEE' } ] ] },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          },

          {
            table: {
              widths: ['20%', '5%', '12%', '13%', '20%', '5%', '12%', '13%'],
              body: [
                [
                  { text: 'Botas', margin: [5, 3] }, { text: '', margin: [5, 3] }, { text: 'Talla', margin: [5, 3] }, { text: botas || '____________', margin: [5, 3] },
                  { text: 'Overol', margin: [5, 3] }, { text: '', margin: [5, 3] }, { text: 'Talla', margin: [5, 3] }, { text: overol || '____________', margin: [5, 3] }
                ],
                [
                  { text: 'Pantalón', margin: [5, 3] }, { text: '', margin: [5, 3] }, { text: 'Talla', margin: [5, 3] }, { text: pantalon || '____________', margin: [5, 3] },
                  { text: 'Camisa', margin: [5, 3] }, { text: '', margin: [5, 3] }, { text: 'Talla', margin: [5, 3] }, { text: camisa || '____________', margin: [5, 3] }
                ],
                [
                  { text: 'Buzo', margin: [5, 3] }, { text: '', margin: [5, 3] }, { text: 'Talla', margin: [5, 3] }, { text: buzo || '____________', margin: [5, 3] },
                  { text: '', colSpan: 4 }, {}, {}, {}
                ]
              ]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          },

          {
            table: { widths: ['*'], body: [ [ { text: 'ELEMENTOS DE PROTECCIÓN PERSONAL', alignment: 'center', bold: true, fillColor: '#EEEEEE' } ] ] },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
            margin: [0, 5, 0, 0]
          },

          { table: { headerRows: 1, widths: ['*', 50, 60, 70, '*'], body: eppTableBody }, layout: { hLineWidth: () => 1, vLineWidth: () => 1 } },

          {
            table: { widths: ['*'], body: [ [ { text: 'FIRMAS', alignment: 'center', bold: true, fillColor: '#EEEEEE' } ] ] },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
            margin: [0, 10, 0, 0]
          },

          {
            table: {
              widths: ['50%', '50%'],
              heights: [60],
              body: [
                [
                  { stack: [ { text: '' } ] },
                  this.signatureDataUrl ? { image: this.signatureDataUrl, fit: [240, 60], alignment: 'center', margin: [0, 0, 0, 0] } : { text: '' }
                ],
                [
                  { text: 'ENTREGA\n' + delivered, alignment: 'center', bold: true, margin: [5, 3] },
                  { text: 'RECIBE\n' + employeeName, alignment: 'center', bold: true, margin: [5, 3] }
                ]
              ]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
          }
        ]
      };

      const fileName = `Salida-EPP-${v.outputNumber}.pdf`;
      const pdfDoc = pdfMake.createPdf(docDefinition);
      // Agregar a listado local solo para EPP_TRABAJADOR con BORRADOR creado
      try {
        const type = this.outputForm.get('outputType')?.value;
        if (type === 'EPP_TRABAJADOR' && this.createdOutputId) {
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
            // Evitar duplicados por id
            this.generatedDocs = [entry, ...this.generatedDocs.filter(d => d.id !== entry.id)];
          });
        }
      } catch {}
      // Abrir o descargar
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

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.loadEmployees();
    this.loadProducts();
    this.loadDepartments();
    this.refreshGeneratedDocsFromBackend();
    this.loadBusinessLogo();
    try { this.outputForm.get('employeeId')?.valueChanges.subscribe(() => this.refreshEmployeePhotoDataUrl()); } catch {}
  }

  loadEmployees(): void {
    this.employeeService.getEmployeesByBusinessRuc(this.ruc).subscribe({
      next: (data) => {
        this.employees = data;
        // Re-mapeo de documentos generados cuando haya catálogo de empleados
        this.refreshGeneratedDocsFromBackend();
      },
      error: () => {
        this.employees = [];
        this.refreshGeneratedDocsFromBackend();
      }
    });
  }

  loadProducts(): void {
    this.productService.list(this.ruc).subscribe({
      next: (data) => this.products = data,
      error: () => this.products = []
    });
  }

  loadDepartments(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => this.departments = data || [],
      error: () => this.departments = []
    });
  }

  openProductModal(): void {
    this.showProductModal = true;
    this.selectedProduct = null;
    this.selectedVariant = null;
    this.variants = [];
  }

  selectProduct(product: InventoryProduct): void {
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
    if (!this.selectedVariant) return;
    const stock = Number(this.selectedVariant.currentQty || 0);
    if (stock <= 0) {
      this.errorMessage = 'No tiene stock. Indique a su administrador que agregue stock de este material.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const detail: InventoryOutputDetail = {
      variantId: this.selectedVariant.id!,
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      itemCondition: 'NUEVO',
      productName: this.selectedProduct?.name,
      variantCode: this.selectedVariant.code,
      productImage: this.selectedProduct?.image,
      issuedSize: this.selectedVariant.sizeLabel || ''
    };
    
    this.details.push(detail);
    const newIndex = this.details.length - 1;
    // Cargar lotes disponibles para la variante
    this.lotService.listAvailable(this.ruc, this.selectedVariant.id!).subscribe({
      next: (lots) => this.lotOptions[newIndex] = lots || [],
      error: () => this.lotOptions[newIndex] = []
    });
    this.showProductModal = false;
    this.selectedProduct = null;
    this.selectedVariant = null;
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
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `SAL-${year}${month}${day}-${hour}${minute}${second}`;
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

    this.loading = true;
    this.errorMessage = '';

    const payload: any = {
      outputNumber: raw.outputNumber,
      outputDate: raw.outputDate,
      outputType: raw.outputType,
      employeeId: raw.employeeId || null,
      area: raw.area || null,
      project: raw.project || null,
      returnDate: raw.returnDate || null,
      authorizedBy: raw.authorizedBy || this.deliveredBy || null,
      notes: raw.notes || null,
      status: isEpp ? 'BORRADOR' : 'CONFIRMADO',
      details: this.details.map(d => ({
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
    const suggestedNumber = this.generateOutputNumber();
    try {
      this.outputForm.enable({ emitEvent: false });
      this.outputForm.reset({
        outputNumber: suggestedNumber,
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
    const name = `Salida-EPP-${o.outputNumber}.pdf`;
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
          this.deliveredBy = biz.name;
          try {
            const abCtrl = this.outputForm.get('authorizedBy');
            const current = abCtrl?.value || '';
            if (!current || current === prevDelivered) {
              abCtrl?.patchValue(this.deliveredBy || '');
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
    const emp = this.getSelectedEmployee();
    const imagePath = emp?.imagePath || emp?.profile_picture || '';
    if (!imagePath) { this.employeePhotoDataUrl = ''; return; }
    const clean = String(imagePath).replace(/^\/+/, '');
    const candidates: string[] = [];
    if (/^https?:\/\//i.test(clean)) {
      candidates.push(clean);
    } else {
      const fileOnly = clean.split('/')?.pop() || clean;
      if (/^uploads\/profiles\//i.test(clean)) {
        candidates.push(this.fileService.getFileDirectoryUrl('profiles', fileOnly));
        candidates.push(this.employeeService.getEmployeePhotoUrl(fileOnly));
      } else {
        candidates.push(this.fileService.getFileDirectoryUrl('profiles', fileOnly));
        candidates.push(this.employeeService.getEmployeePhotoUrl(fileOnly));
      }
    }
    let dataUrl = '';
    for (const url of candidates) {
      dataUrl = await this.toDataUrlWithAuth(url);
      if (dataUrl) break;
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
        if (emp && emp.id) {
          this.outputForm.patchValue({ employeeId: emp.id });
          if (!this.employees.find(e => Number(e.id) === Number(emp.id))) {
            this.employees = [emp, ...this.employees];
          }
          this.refreshEmployeePhotoDataUrl();
        }
      }
    });
  }

  // Buscar trabajador por código
  searchByCodigo(): void {
    const code = (this.codigoSearch || '').trim();
    if (!code) return;
    this.employeeService.getEmployeesByBusinessRucPaginated(this.ruc, { page: 0, size: 1, codigo: code }).subscribe({
      next: (page) => {
        const emp = page?.content?.[0];
        if (emp && emp.id) {
          this.outputForm.patchValue({ employeeId: emp.id });
          if (!this.employees.find(e => Number(e.id) === Number(emp.id))) {
            this.employees = [emp, ...this.employees];
          }
          this.refreshEmployeePhotoDataUrl();
        }
      }
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
