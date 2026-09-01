import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { InventoryOutputService, InventoryOutput } from '../../../../../../services/inventory-output.service';
import { InventoryProductService } from '../../../../../../services/inventory-product.service';
import { BusinessService } from '../../../../../../services/business.service';
import { FileService } from '../../../../../../services/file.service';
import {
  CambioEppFormSnapshot,
  CambioEppSolicitud,
  CambioEppSolicitudService
} from '../../../../../../services/cambio-epp-solicitud.service';
import { EmployeeService } from '../../../talento-humano/services/employee.service';
import { EmployeeResponse } from '../../../talento-humano/models/employee.model';

interface EntregaRow {
  documento: string;
  codigoProducto: string;
  descripcion: string;
  marca: string;
  cantidad: number;
  fecha: string;
  talla: string;
}

interface EppSectionOption {
  prefix: string;
  label: string;
}

type CambioEppForm = CambioEppFormSnapshot;

@Component({
  selector: 'app-cambio-epp',
  templateUrl: './cambio-epp.component.html',
  styleUrls: ['./cambio-epp.component.scss']
})
export class CambioEppComponent implements OnInit, OnDestroy {
  ruc: string | null = null;
  businessName = '';
  private businessLogoDataUrl = '';
  employees: EmployeeResponse[] = [];

  reportEmployeeId: number | null = null;
  reportYear: number = new Date().getFullYear();
  reportMonth: number | null = null;
  reportYears: number[] = [];
  reportMonths = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  loading = false;
  message = '';
  rows: EntregaRow[] = [];
  selectedEmployee: EmployeeResponse | null = null;
  totalCantidad = 0;

  showCambioModal = false;
  formMessage = '';
  pdfBusy = false;
  cedulaLookupMsg = '';
  /** Trabajador elegido en el modal (por nombre). */
  formEmployeeId: number | null = null;
  /** Emisor / reportante elegido en el modal. */
  emisorEmployeeId: number | null = null;
  photoNames: string[] = [];
  private photoFiles: File[] = [];
  form: CambioEppForm = this.emptyForm();
  solicitudes: CambioEppSolicitud[] = [];
  listMessage = '';
  downloadingId: string | null = null;
  uploadTargetId: string | null = null;

  /** Visor solo lectura (sin descarga) */
  showDocViewer = false;
  docViewerTitle = '';
  docViewerIsPdf = true;
  docViewerSafeUrl: SafeResourceUrl | null = null;
  docViewerImgUrl = '';
  private docViewerObjectUrl = '';

  private readonly navy = '#1e3a8a';
  private readonly grey = '#f0f0f0';

  private readonly tipoLabels: Record<string, string> = {
    solicitud_epp: 'Solicitud de EPP',
    incumplimiento: 'Incumplimiento de uso',
    deterioro: 'Deterioro prematuro / EPP en mal estado',
    perdida: 'Pérdida de equipo',
    inspeccion: 'Inspección de rutina'
  };

  /** Tipos dinámicos desde Inventario-Bodega (asignados a la empresa). */
  tiposAcontecimiento: Array<{ name: string }> = [];

  /** Secciones EPP asignadas a la empresa (Configuración → Inventario-Bodega → Sección). */
  eppSections: EppSectionOption[] = [];

  /** Estados del EPI asignados a la empresa. */
  estadosEpi: Array<{ name: string }> = [];

  private readonly estadoLabels: Record<string, string> = {
    bueno: 'Buen estado (Solo falta de uso)',
    regular: 'Desgaste normal',
    malo: 'Mal estado de EPP / Deteriorado / Roto',
    ausente: 'No presenta el equipo'
  };

  constructor(
    private route: ActivatedRoute,
    private outputService: InventoryOutputService,
    private productService: InventoryProductService,
    private employeeService: EmployeeService,
    private businessService: BusinessService,
    private fileService: FileService,
    private cambioEppSolicitudService: CambioEppSolicitudService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    const y = new Date().getFullYear();
    for (let i = 0; i < 8; i++) this.reportYears.push(y - i);
  }

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }
    if (this.ruc) {
      this.loadEmployees();
      this.loadBusiness();
      this.loadSolicitudes();
      this.loadTiposAcontecimiento();
      this.loadEppSections();
      this.loadEstadosEpi();
    }
  }

  loadTiposAcontecimiento(): void {
    if (!this.ruc) {
      this.tiposAcontecimiento = [];
      return;
    }
    this.cambioEppSolicitudService.listTiposAcontecimiento(this.ruc).subscribe({
      next: (list) => {
        this.tiposAcontecimiento = (list || [])
          .map(t => ({ name: (t?.name || '').toString().trim() }))
          .filter(t => !!t.name);
        if (!this.tiposAcontecimiento.length) {
          this.formMessage =
            'Esta empresa no tiene Tipos de Acontecimiento. Asígnalos en Admin → Empresas → Inventario-Bodega.';
        }
      },
      error: () => {
        this.tiposAcontecimiento = [];
      }
    });
  }

  /** Secciones asignadas a la empresa en Inventario-Bodega. */
  loadEppSections(): void {
    if (!this.ruc) {
      this.eppSections = [];
      return;
    }
    this.productService.getBodegaParams(this.ruc).subscribe({
      next: (params) => {
        this.eppSections = (params?.sections || [])
          .map(s => {
            const prefix = (s?.code || '').toString().trim().toUpperCase();
            const label = (s?.name || prefix || '').toString().trim();
            if (!prefix || !label) return null;
            return { prefix, label };
          })
          .filter((x): x is EppSectionOption => !!x)
          .sort((a, b) => a.label.localeCompare(b.label, 'es'));
        // Si la sección elegida ya no está asignada, limpiar.
        if (this.form.sectionCode && !this.eppSections.some(s => s.prefix === this.form.sectionCode)) {
          this.form.sectionCode = '';
          this.form.sectionLabel = '';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.eppSections = [];
        this.cdr.markForCheck();
      }
    });
  }

  /** Estados del EPI asignados a la empresa. */
  loadEstadosEpi(): void {
    if (!this.ruc) {
      this.estadosEpi = [];
      return;
    }
    this.cambioEppSolicitudService.listEstadosEpi(this.ruc).subscribe({
      next: (list) => {
        this.estadosEpi = (list || [])
          .map(t => ({ name: (t?.name || '').toString().trim() }))
          .filter(t => !!t.name);
        if (this.form.estadoEpi && !this.estadosEpi.some(e => e.name === this.form.estadoEpi)
            && !this.estadoLabels[this.form.estadoEpi]) {
          this.form.estadoEpi = '';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.estadosEpi = [];
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeDocViewer();
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showDocViewer) {
      this.closeDocViewer();
      return;
    }
    if (this.showCambioModal && !this.pdfBusy) this.closeCambioModal();
  }

  loadEmployees(): void {
    const ruc = this.ruc;
    if (!ruc) return;
    // Solo activos: en Cambio EPP no deben aparecer inactivos.
    this.employeeService.getActiveEmployeesByBusinessRuc(ruc).subscribe({
      next: (data) => {
        this.employees = (data || [])
          .filter(e => EmployeeService.isEmployeeActive(e))
          .slice()
          .sort((a, b) =>
            this.employeeFilterLabel(a).localeCompare(this.employeeFilterLabel(b), 'es', { sensitivity: 'base' })
          );
      },
      error: () => {
        // Fallback: lista completa filtrada en cliente
        this.employeeService.getEmployeesByBusinessRuc(ruc).subscribe({
          next: (all) => {
            this.employees = (all || [])
              .filter(e => EmployeeService.isEmployeeActive(e))
              .slice()
              .sort((a, b) =>
                this.employeeFilterLabel(a).localeCompare(this.employeeFilterLabel(b), 'es', { sensitivity: 'base' })
              );
          },
          error: () => this.employees = []
        });
      }
    });
  }

  loadBusiness(): void {
    if (!this.ruc) return;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: async (biz) => {
        this.businessName = biz?.name || '';
        const path = String(biz?.logo || '').trim();
        if (!path) {
          this.businessLogoDataUrl = '';
          return;
        }
        const candidates: string[] = [];
        if (/^https?:\/\//i.test(path) || path.startsWith('/api/')) {
          candidates.push(path);
        } else {
          const clean = path.replace(/^\/+/, '').replace(/\\/g, '/');
          const fileOnly = clean.split('/').pop() || clean;
          candidates.push(this.fileService.getFileUrl(clean));
          candidates.push(this.fileService.getFileDirectoryUrl('logos', fileOnly, false));
          candidates.push(`/api/files/logos/${fileOnly}`);
        }
        for (const url of candidates) {
          if (!url) continue;
          const dataUrl = await this.toDataUrlWithAuth(url);
          if (dataUrl.startsWith('data:image')) {
            this.businessLogoDataUrl = dataUrl;
            return;
          }
        }
        this.businessLogoDataUrl = '';
      },
      error: () => {
        this.businessName = '';
        this.businessLogoDataUrl = '';
      }
    });
  }

  onTipoAcontecimientoChange(value: string): void {
    this.form.tipoAcontecimiento = value || '';
    // La sección EPP aplica a cualquier tipo (solicitud, deterioro, pérdida, etc.).
    this.cdr.markForCheck();
  }

  onTipoNativeChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (!el) return;
    this.onTipoAcontecimientoChange(el.value);
  }

  onSectionChange(code: string): void {
    const found = this.eppSections.find(s => s.prefix === code);
    this.form.sectionCode = code || '';
    this.form.sectionLabel = found?.label || '';
    this.cdr.markForCheck();
  }

  tipoDisplayLabel(tipo: string, sectionLabel?: string): string {
    const base = this.tipoLabels[tipo] || tipo || '—';
    if (sectionLabel) {
      return `${base} · ${sectionLabel}`;
    }
    return base;
  }

  employeeFilterLabel(e: EmployeeResponse): string {
    const name = `${e.nombres || ''} ${e.apellidos || ''}`.trim() || e.name || '—';
    return EmployeeService.isEmployeeActive(e) ? name : `${name} (INACTIVO)`;
  }

  /** Solo activos para formularios de EPP (solicitud / emisor). */
  get activeEmployees(): EmployeeResponse[] {
    return (this.employees || []).filter(e => EmployeeService.isEmployeeActive(e));
  }

  private inactiveWorkerAlert(emp: EmployeeResponse): string {
    const name = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || 'Trabajador';
    const ced = emp.cedula ? ` (cédula ${emp.cedula})` : '';
    return `${name}${ced} está INACTIVO. No se puede registrar solicitud de cambio EPP. Reactívelo en Talento Humano.`;
  }

  onFiltersChange(): void {
    this.loadResumen();
  }

  loadResumen(): void {
    this.message = '';
    this.rows = [];
    this.totalCantidad = 0;
    this.selectedEmployee = null;

    if (!this.ruc) {
      this.message = 'No se pudo obtener el RUC de la empresa.';
      return;
    }
    if (!this.reportEmployeeId) return;
    if (!this.reportYear) {
      this.message = 'Seleccione el año.';
      return;
    }

    this.selectedEmployee =
      this.employees.find(e => Number(e.id) === Number(this.reportEmployeeId)) || null;
    this.loading = true;

    this.outputService.findByEmployee(this.ruc, this.reportEmployeeId).subscribe({
      next: (list) => {
        const filtered = (list || []).filter(o => {
          if (o.status !== 'CONFIRMADO') return false;
          if (o.outputType !== 'EPP_TRABAJADOR') return false;
          const d = this.parseOutputDate(o.outputDate);
          if (!d) return false;
          if (d.getFullYear() !== this.reportYear) return false;
          if (this.reportMonth != null && (d.getMonth() + 1) !== this.reportMonth) return false;
          return true;
        });

        this.rows = this.flattenRows(filtered);
        this.totalCantidad = this.rows.reduce((acc, r) => acc + (r.cantidad || 0), 0);

        if (!this.rows.length) {
          this.message = this.reportMonth
            ? `No hay entregas EPP confirmadas en ${this.monthLabel(this.reportMonth)} ${this.reportYear}.`
            : `No hay entregas EPP confirmadas en el año ${this.reportYear}.`;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.message = 'No se pudieron cargar las salidas del trabajador.';
      }
    });
  }

  openCambioModal(): void {
    this.formMessage = '';
    this.cedulaLookupMsg = '';
    this.formEmployeeId = null;
    this.photoNames = [];
    this.photoFiles = [];
    this.form = this.emptyForm();
    this.form.empresa = this.businessName || '';
    this.form.nReporte = this.peekReportNumber();
    if (this.ruc) {
      this.cambioEppSolicitudService.nextReportNumber(this.ruc).subscribe({
        next: (n) => { this.form.nReporte = n; }
      });
    }
    this.form.fechaElaboracion = this.toLocalDateTimeValue(new Date());

    if (this.selectedEmployee) {
      if (!EmployeeService.isEmployeeActive(this.selectedEmployee)) {
        this.formMessage = this.inactiveWorkerAlert(this.selectedEmployee);
      } else {
        this.applyEmployeeToForm(this.selectedEmployee);
        if (this.rows.length) {
          this.form.fechaDotacion = this.isoDateFromDisplay(this.rows[0].fecha);
          if (this.rows[0].talla && this.rows[0].talla !== '—') {
            this.form.talla = this.rows[0].talla;
          }
        }
      }
    }

    this.emisorEmployeeId = null;
    this.form.nombreEmisor = '';
    this.form.cargoEmisor = '';

    this.showCambioModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeCambioModal(): void {
    if (this.pdfBusy) return;
    this.showCambioModal = false;
    document.body.style.overflow = '';
  }

  resetCambioForm(): void {
    const nReporte = this.form.nReporte;
    const empresa = this.form.empresa;
    this.form = this.emptyForm();
    this.form.nReporte = nReporte;
    this.form.empresa = empresa;
    this.form.fechaElaboracion = this.toLocalDateTimeValue(new Date());
    this.photoNames = [];
    this.photoFiles = [];
    this.formMessage = '';
    this.cedulaLookupMsg = '';
    this.formEmployeeId = null;
    this.emisorEmployeeId = null;

    if (this.selectedEmployee) {
      if (EmployeeService.isEmployeeActive(this.selectedEmployee)) {
        this.applyEmployeeToForm(this.selectedEmployee);
      } else {
        this.formMessage = this.inactiveWorkerAlert(this.selectedEmployee);
      }
    }
  }

  /** Selección desde combo de nombre: llena cédula, cargo y área. */
  onFormEmployeeSelect(id: number | null): void {
    const num = id == null ? null : Number(id);
    this.formEmployeeId = num != null && !Number.isNaN(num) && num > 0 ? num : null;
    if (!this.formEmployeeId) {
      this.form.nombreTrabajador = '';
      this.form.cedula = '';
      this.form.cargo = '';
      this.form.area = '';
      this.cedulaLookupMsg = '';
      return;
    }
    const emp = this.employees.find(e => Number(e.id) === Number(this.formEmployeeId));
    if (!emp) return;
    if (!EmployeeService.isEmployeeActive(emp)) {
      this.formEmployeeId = null;
      this.form.nombreTrabajador = '';
      this.form.cedula = '';
      this.form.cargo = '';
      this.form.area = '';
      this.cedulaLookupMsg = this.inactiveWorkerAlert(emp);
      this.formMessage = this.cedulaLookupMsg;
      return;
    }
    this.applyEmployeeToForm(emp);
    this.cedulaLookupMsg = 'Trabajador seleccionado.';
    this.formMessage = '';
  }

  /** Selección del reportante (emisor). */
  onEmisorEmployeeSelect(id: number | null): void {
    const num = id == null ? null : Number(id);
    this.emisorEmployeeId = num != null && !Number.isNaN(num) && num > 0 ? num : null;
    if (!this.emisorEmployeeId) {
      this.form.nombreEmisor = '';
      this.form.cargoEmisor = '';
      return;
    }
    const emp = this.employees.find(e => Number(e.id) === Number(this.emisorEmployeeId));
    if (!emp) return;
    if (!EmployeeService.isEmployeeActive(emp)) {
      this.emisorEmployeeId = null;
      this.form.nombreEmisor = '';
      this.form.cargoEmisor = '';
      this.formMessage = this.inactiveWorkerAlert(emp);
      return;
    }
    this.form.nombreEmisor = this.employeeFilterLabel(emp).replace(/\s*\(INACTIVO\)\s*$/, '');
    this.form.cargoEmisor = emp.positionName || (emp as any)?.position?.name || '';
  }

  /** Si escribe la cédula, busca y completa el resto. */
  onCedulaChange(raw: string): void {
    const cedula = String(raw || '').replace(/\D/g, '').trim();
    this.form.cedula = cedula;
    this.cedulaLookupMsg = '';

    if (cedula.length < 10) {
      return;
    }

    const local = this.employees.find(e => String(e.cedula || '').replace(/\D/g, '') === cedula);
    if (local) {
      if (!EmployeeService.isEmployeeActive(local)) {
        this.formEmployeeId = null;
        this.form.nombreTrabajador = '';
        this.form.cargo = '';
        this.form.area = '';
        this.cedulaLookupMsg = this.inactiveWorkerAlert(local);
        this.formMessage = this.cedulaLookupMsg;
        return;
      }
      this.applyEmployeeToForm(local);
      this.cedulaLookupMsg = 'Trabajador encontrado.';
      this.formMessage = '';
      return;
    }

    if (!this.ruc) {
      this.cedulaLookupMsg = 'No se pudo validar la cédula sin RUC de empresa.';
      return;
    }

    this.cedulaLookupMsg = 'Buscando trabajador...';
    this.employeeService.getEmployeeByCedulaScopedByRuc(this.ruc, cedula).subscribe({
      next: (emp) => {
        if (!emp) {
          this.cedulaLookupMsg = 'No se encontró un trabajador con esa cédula.';
          return;
        }
        if (!EmployeeService.isEmployeeActive(emp)) {
          this.formEmployeeId = null;
          this.form.nombreTrabajador = '';
          this.form.cargo = '';
          this.form.area = '';
          this.cedulaLookupMsg = this.inactiveWorkerAlert(emp);
          this.formMessage = this.cedulaLookupMsg;
          return;
        }
        this.applyEmployeeToForm(emp);
        this.cedulaLookupMsg = 'Trabajador encontrado.';
        this.formMessage = '';
        // No agregar inactivos; la lista ya es solo activos.
        if (EmployeeService.isEmployeeActive(emp) && !this.employees.some(e => Number(e.id) === Number(emp.id))) {
          this.employees = [...this.employees, emp].sort((a, b) =>
            this.employeeFilterLabel(a).localeCompare(this.employeeFilterLabel(b), 'es', { sensitivity: 'base' })
          );
        }
      },
      error: () => {
        this.cedulaLookupMsg = 'No se encontró un trabajador con esa cédula en esta empresa.';
      }
    });
  }

  private applyEmployeeToForm(emp: EmployeeResponse): void {
    this.formEmployeeId = emp?.id != null ? Number(emp.id) : null;
    this.form.nombreTrabajador = this.employeeFilterLabel(emp).replace(/\s*\(INACTIVO\)\s*$/, '');
    this.form.cedula = emp.cedula || '';
    this.form.cargo = emp.positionName || (emp as any)?.position?.name || '';
    this.form.area = emp.departmentName || (emp as any)?.department?.name || '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).slice(0, 2);
    this.photoFiles = files;
    this.photoNames = files.map(f => f.name);
  }

  async submitCambioForm(event: Event): Promise<void> {
    event.preventDefault();
    this.formMessage = '';

    if (!this.form.nombreTrabajador?.trim() || !this.form.cedula?.trim()) {
      this.formMessage = 'Complete al menos el nombre y la cédula del trabajador.';
      return;
    }
    const empSel = this.employees.find(e => Number(e.id) === Number(this.formEmployeeId))
      || this.employees.find(e => String(e.cedula || '').replace(/\D/g, '') === String(this.form.cedula || '').replace(/\D/g, ''));
    if (empSel && !EmployeeService.isEmployeeActive(empSel)) {
      this.formMessage = this.inactiveWorkerAlert(empSel);
      return;
    }
    if (!this.form.nombreEmisor?.trim()) {
      this.formMessage = 'Seleccione el nombre del reportante (emisor).';
      return;
    }
    if (!this.form.tipoAcontecimiento) {
      this.formMessage = 'Seleccione el tipo de acontecimiento.';
      return;
    }
    if (!this.form.sectionCode) {
      this.formMessage = 'Seleccione la sección EPP (Casco, Pantalón, Camisa, etc.).';
      return;
    }
    if (!this.ruc) {
      this.formMessage = 'No se pudo identificar la empresa (RUC).';
      return;
    }

    this.pdfBusy = true;
    try {
      this.form.nReporte = await new Promise<string>((resolve, reject) => {
        this.cambioEppSolicitudService.nextReportNumber(this.ruc!).subscribe({
          next: n => resolve(n),
          error: e => reject(e)
        });
      });
      const photos = await this.readPhotoDataUrls();
      await this.generateCambioEppPdf(this.form, photos);
      await this.registerSolicitudPendiente();
      this.closeCambioModalAfterSuccess();
      this.listMessage = 'Solicitud guardada en base de datos. Estado: pendiente en subir el documento validado.';
    } catch (e: any) {
      this.formMessage = e?.error?.message || e?.message || 'No se pudo guardar la solicitud. Verifique el backend y pdfmake.';
    } finally {
      this.pdfBusy = false;
    }
  }

  private closeCambioModalAfterSuccess(): void {
    this.showCambioModal = false;
    document.body.style.overflow = '';
    this.formMessage = '';
    this.cedulaLookupMsg = '';
    this.photoNames = [];
    this.photoFiles = [];
  }

  private registerSolicitudPendiente(): Promise<void> {
    if (!this.ruc) return Promise.resolve();
    const f = this.form;
    const tipoTxt = this.tipoDisplayLabel(f.tipoAcontecimiento, f.sectionLabel);
    const payload: Partial<CambioEppSolicitud> = {
      nReporte: f.nReporte,
      trabajador: (f.nombreTrabajador || '').trim(),
      cedula: (f.cedula || '').trim(),
      cargo: (f.cargo || '').trim(),
      area: (f.area || '').trim(),
      tipoAcontecimiento: tipoTxt,
      sectionCode: f.sectionCode || '',
      sectionLabel: f.sectionLabel || '',
      estadoEpi: this.estadoLabels[f.estadoEpi] || f.estadoEpi || '—',
      severidad: f.severidad || '—',
      fechaElaboracion: this.formatDateTimeDisplay(f.fechaElaboracion),
      status: 'PENDIENTE_APROBACION',
      formSnapshot: { ...f }
    };
    return new Promise((resolve, reject) => {
      this.cambioEppSolicitudService.create(this.ruc!, payload).subscribe({
        next: () => {
          this.loadSolicitudes();
          resolve();
        },
        error: (err) => reject(err)
      });
    });
  }

  async viewSolicitudPdf(s: CambioEppSolicitud): Promise<void> {
    this.listMessage = '';
    if (!s?.formSnapshot?.nReporte && !s?.formSnapshot?.nombreTrabajador) {
      this.listMessage = 'Esta solicitud antigua no tiene datos para regenerar el PDF. Genere una nueva.';
      return;
    }
    this.downloadingId = s.id;
    try {
      await this.generateCambioEppPdf({ ...s.formSnapshot }, [], 'view');
      this.listMessage = '';
    } catch {
      this.listMessage = 'No se pudo abrir el PDF. Intente nuevamente.';
    } finally {
      this.downloadingId = null;
    }
  }

  canViewPdf(s: CambioEppSolicitud): boolean {
    return !!(s?.formSnapshot?.nReporte || s?.formSnapshot?.nombreTrabajador);
  }

  triggerSignedUpload(s: CambioEppSolicitud): void {
    this.listMessage = '';
    this.uploadTargetId = s.id;
    const input = document.getElementById('cepp-signed-upload') as HTMLInputElement | null;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async onSignedFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const targetId = this.uploadTargetId;
    this.uploadTargetId = null;
    if (!file || !targetId || !this.ruc) return;

    const okType = /pdf|image\//i.test(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (!okType) {
      this.listMessage = 'Suba un PDF o imagen del documento firmado.';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.listMessage = 'El archivo supera 8MB. Suba un archivo más liviano.';
      return;
    }

    this.listMessage = 'Subiendo documento firmado a la base de datos…';
    this.cambioEppSolicitudService.uploadSignedAndMarkEnEspera(this.ruc, targetId, file).subscribe({
      next: () => {
        this.loadSolicitudes();
        this.listMessage = 'Documento firmado guardado. Quedó en espera de validación en Inventario → Nueva Salida.';
      },
      error: (err) => {
        this.listMessage = err?.error?.message || err?.message || 'No se pudo guardar el documento firmado en el servidor.';
      }
    });
  }

  viewSignedFile(s: CambioEppSolicitud): void {
    this.listMessage = '';
    if (!this.ruc) return;
    this.cambioEppSolicitudService.getSignedFile(this.ruc, s).subscribe({
      next: (parsed) => {
        if (!parsed?.blob) {
          this.listMessage = 'No hay archivo firmado guardado para esta solicitud.';
          return;
        }
        const isPdf = /pdf/i.test(parsed.type || '') || /\.pdf$/i.test(parsed.name || '');
        this.openDocViewer({
          title: `${s.nReporte} · documento validado`,
          isPdf,
          blob: parsed.blob,
          mime: parsed.type
        });
      },
      error: () => {
        this.listMessage = 'No se pudo abrir el documento firmado desde el servidor.';
      }
    });
  }

  closeDocViewer(): void {
    this.showDocViewer = false;
    if (this.docViewerObjectUrl) {
      try { URL.revokeObjectURL(this.docViewerObjectUrl); } catch { /* ignore */ }
      this.docViewerObjectUrl = '';
    }
    this.docViewerSafeUrl = null;
    this.docViewerImgUrl = '';
    this.docViewerTitle = '';
    if (!this.showCambioModal) {
      document.body.style.overflow = '';
    }
  }

  private openDocViewer(opts: { title: string; isPdf: boolean; dataUrl?: string; blob?: Blob; mime?: string }): void {
    this.closeDocViewer();
    this.docViewerTitle = opts.title;
    this.docViewerIsPdf = opts.isPdf;
    try {
      let blob = opts.blob;
      if (!blob && opts.dataUrl) {
        blob = this.dataUrlToBlob(opts.dataUrl);
      }
      if (!blob) {
        this.listMessage = 'No se pudo abrir el documento.';
        return;
      }
      this.docViewerObjectUrl = URL.createObjectURL(blob);
      if (opts.isPdf) {
        this.docViewerSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `${this.docViewerObjectUrl}#toolbar=0&navpanes=0`
        );
        this.docViewerImgUrl = '';
      } else {
        this.docViewerImgUrl = this.docViewerObjectUrl;
        this.docViewerSafeUrl = null;
      }
    } catch {
      this.listMessage = 'No se pudo abrir el documento.';
      return;
    }
    this.showDocViewer = true;
    document.body.style.overflow = 'hidden';
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const header = parts[0] || '';
    const data = parts[1] || '';
    const mime = header.match(/data:([^;]+);/)?.[1] || 'application/octet-stream';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  private loadSolicitudes(): void {
    if (!this.ruc) {
      this.solicitudes = [];
      return;
    }
    this.cambioEppSolicitudService.list(this.ruc).subscribe({
      next: (rows) => this.solicitudes = rows || [],
      error: () => this.solicitudes = []
    });
  }

  statusLabel(status: string): string {
    if (status === 'EN_ESPERA_INVENTARIO' || status === 'VALIDADO_FIRMADO') {
      return 'En espera · validando en inventario';
    }
    if (status === 'VALIDADO_ENTREGADO' || status === 'ENTREGADO') {
      return 'Validado / Entregado';
    }
    if (status === 'RECHAZADO') {
      return 'Rechazado';
    }
    if (status === 'PENDIENTE_APROBACION') {
      return 'Pendiente en subir el documento validado';
    }
    return status;
  }

  severidadLabel(value: string): string {
    const map: Record<string, string> = {
      insignificante: 'Insignificante',
      poco_importante: 'Poco importante',
      importante: 'Importante',
      urgente: 'Urgente'
    };
    return map[value] || value || '—';
  }

  private async generateCambioEppPdf(
    formData: CambioEppForm,
    photos: string[] = [],
    mode: 'download' | 'view' | 'blob' = 'download',
    despacho?: { nombre?: string; cargo?: string; fecha?: string }
  ): Promise<Blob | void> {
    const pdfMakeImport: any = await import('pdfmake/build/pdfmake');
    const pdfFontsImport: any = await import('pdfmake/build/vfs_fonts');
    const pdfMake: any = pdfMakeImport?.default || pdfMakeImport;
    const pdfFonts: any = pdfFontsImport?.default || pdfFontsImport;
    const vfs = pdfFonts?.pdfMake?.vfs || pdfFonts?.vfs;
    if (vfs) pdfMake.vfs = vfs;

    const navy = this.navy;
    const grey = this.grey;
    const border = {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => navy,
      vLineColor: () => navy
    };

    const f = formData;
    const despachoNombre = String(despacho?.nombre || (f as any).despachadorNombre || '').trim();
    const despachoCargo = String(despacho?.cargo || (f as any).despachadorCargo || '').trim();
    const despachoFecha = String(despacho?.fecha || (f as any).fechaEntregaDespacho || '').trim();
    const tipoTxt = this.tipoDisplayLabel(f.tipoAcontecimiento, f.sectionLabel);
    const estadoTxt = this.estadoLabels[f.estadoEpi] || f.estadoEpi || '—';
    const elaboracion = this.formatDateTimeDisplay(f.fechaElaboracion);
    const notificacion = this.formatDateTimeDisplay(f.fechaNotificacion);
    const dotacion = this.formatDateDisplay(f.fechaDotacion);
    const empresa = (f.empresa || this.businessName || '—').toUpperCase();

    // Misma medida para ambas fotos (lado a lado, sin desbordar la página)
    const photoW = 220;
    const photoH = 130;
    const photoCells: any[] = [0, 1].map(i => {
      if (photos[i]) {
        return {
          image: photos[i],
          width: photoW,
          height: photoH,
          alignment: 'center',
          margin: [6, 6, 6, 6]
        };
      }
      return {
        text: 'Sin imagen',
        color: '#94a3b8',
        fontSize: 9,
        alignment: 'center',
        margin: [4, 55, 4, 55]
      };
    });

    const headerCell = (text: string): any => ({
      text,
      bold: true,
      color: '#fff',
      fillColor: navy,
      fontSize: 8,
      alignment: 'center',
      margin: [2, 4]
    });

    const labelCell = (text: string): any => ({
      text,
      bold: true,
      fillColor: grey,
      fontSize: 8,
      alignment: 'left',
      margin: [4, 4]
    });

    const valueCell = (text: string, opts: any = {}): any => ({
      text: text || '—',
      fontSize: 8,
      alignment: opts.align || 'center',
      margin: [4, 4],
      bold: opts.bold || false
    });

    const checkItem = (label: string, checked: boolean): any => ({
      columns: [
        { text: label, bold: true, fontSize: 8, width: '*', alignment: 'right', margin: [0, 3, 4, 0] },
        {
          table: {
            widths: [14],
            heights: [14],
            body: [[{
              text: checked ? 'X' : '',
              fontSize: 9,
              bold: true,
              color: '#fff',
              fillColor: checked ? '#3b82f6' : '#fff',
              alignment: 'center',
              margin: [0, 1, 0, 0]
            }]]
          },
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => navy,
            vLineColor: () => navy
          },
          width: 18
        }
      ],
      margin: [4, 2]
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 28],
      defaultStyle: { fontSize: 9, color: '#111' },
      content: [
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                {
                  table: {
                    widths: [90, '*'],
                    heights: [70],
                    body: [[
                      this.businessLogoDataUrl
                        ? { image: this.businessLogoDataUrl, fit: [70, 60], alignment: 'center', margin: [4, 5] }
                        : {
                            text: (f.empresa || this.businessName || 'EMPRESA').slice(0, 28).toUpperCase(),
                            alignment: 'center',
                            bold: true,
                            color: navy,
                            fontSize: 8,
                            margin: [4, 18]
                          },
                      {
                        text: 'REPORTE DE SOLICITUD DE CAMBIO DE ELEMENTOS DE PROTECCIÓN PERSONAL',
                        alignment: 'center',
                        bold: true,
                        color: navy,
                        fontSize: 12,
                        margin: [8, 18]
                      }
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'DATOS ESPECÍFICOS',
                      bold: true,
                      color: '#fff',
                      fillColor: navy,
                      fontSize: 9,
                      alignment: 'center',
                      margin: [2, 4]
                    }]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['14%', '18%', '20%', '22%', '26%'],
                    body: [[
                      labelCell('EMPRESA'),
                      valueCell(empresa, { align: 'left', bold: true }),
                      labelCell('TIPO DE ACONTECIMIENTO'),
                      valueCell(tipoTxt, { align: 'left' }),
                      {
                        text: [
                          { text: 'N° de Reporte  ', bold: true, fontSize: 8 },
                          { text: f.nReporte || '—', fontSize: 9, bold: true }
                        ],
                        alignment: 'right',
                        margin: [4, 4]
                      }
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['25%', '25%', '25%', '25%'],
                    body: [
                      [
                        headerCell('NOMBRE DEL TRABAJADOR'),
                        headerCell('N° DE CÉDULA'),
                        headerCell('CARGO'),
                        headerCell('ÁREA')
                      ],
                      [
                        valueCell((f.nombreTrabajador || '—').toUpperCase()),
                        valueCell(f.cedula || '—'),
                        valueCell((f.cargo || '—').toUpperCase()),
                        valueCell(f.area || '—')
                      ]
                    ]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['34%', '33%', '33%'],
                    body: [
                      [
                        headerCell('ESTADO DE EPI'),
                        headerCell('FECHA DE ELABORACIÓN DE REPORTE'),
                        headerCell('FECHA DE NOTIFICACIÓN DEL EPP')
                      ],
                      [
                        valueCell(estadoTxt),
                        {
                          stack: [
                            { text: 'FECHA Y HORA', bold: true, fillColor: grey, fontSize: 7, alignment: 'center', margin: [0, 2] },
                            { text: elaboracion, fontSize: 8, alignment: 'center', margin: [2, 6] }
                          ]
                        },
                        {
                          stack: [
                            { text: 'FECHA Y HORA', bold: true, fillColor: grey, fontSize: 7, alignment: 'center', margin: [0, 2] },
                            { text: notificacion, fontSize: 8, alignment: 'center', margin: [2, 6] }
                          ]
                        }
                      ]
                    ]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'ACONTECIMIENTO DE:',
                      bold: true,
                      color: '#fff',
                      fillColor: navy,
                      fontSize: 8,
                      alignment: 'center',
                      margin: [2, 3]
                    }]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*', '*', '*', '*'],
                    body: [[
                      checkItem('SUSPENSIÓN', !!f.accionSuspension),
                      checkItem('MULTA', !!f.accionMulta),
                      checkItem('NOTIFICACIÓN', !!f.accionNotificacion),
                      checkItem('CAMBIO', !!f.accionCambio)
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'SEVERIDAD',
                      bold: true,
                      color: '#fff',
                      fillColor: navy,
                      fontSize: 8,
                      alignment: 'center',
                      margin: [2, 3]
                    }]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*', '*', '*', '*'],
                    body: [[
                      checkItem('INSIGNIFICANTE', f.severidad === 'insignificante'),
                      checkItem('POCO IMPORTANTE', f.severidad === 'poco_importante'),
                      checkItem('IMPORTANTE', f.severidad === 'importante'),
                      checkItem('URGENTE', f.severidad === 'urgente')
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'OBSERVACIONES',
                      bold: true,
                      color: '#fff',
                      fillColor: navy,
                      fontSize: 8,
                      alignment: 'center',
                      margin: [2, 3]
                    }]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*'],
                    heights: [90],
                    body: [[{
                      text: f.observaciones || ' ',
                      fontSize: 8,
                      bold: true,
                      alignment: 'left',
                      margin: [6, 6]
                    }]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['25%', '25%', '20%', '30%'],
                    body: [[
                      headerCell('FECHA DE DOTACIÓN'),
                      valueCell(dotacion),
                      headerCell('TALLA'),
                      valueCell(f.talla || '—')
                    ]]
                  },
                  layout: border
                },
                {
                  table: {
                    widths: ['*'],
                    body: [[{
                      text: 'REPORTE FOTOGRÁFICO',
                      bold: true,
                      color: '#fff',
                      fillColor: navy,
                      fontSize: 8,
                      alignment: 'center',
                      margin: [2, 3]
                    }]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  table: {
                    widths: ['*', '*'],
                    heights: [145],
                    body: [photoCells.map((cell: any) => ({
                      ...cell,
                      border: [true, true, true, true]
                    }))]
                  },
                  layout: {
                    ...border,
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 4,
                    paddingBottom: () => 4
                  }
                },
                {
                  table: {
                    widths: ['28%', '22%', '18%', '32%'],
                    body: [[
                      headerCell('NOMBRE DE LA PERSONA QUE REPORTA'),
                      valueCell((f.nombreEmisor || '—').toUpperCase(), { align: 'left' }),
                      headerCell('CARGO'),
                      valueCell((f.cargoEmisor || '—').toUpperCase(), { align: 'left' })
                    ]]
                  },
                  layout: border,
                  margin: [0, 1, 0, 0]
                },
                {
                  // Altura fija real para firmar (el margin vacío de pdfmake no reserva espacio)
                  unbreakable: true,
                  table: {
                    widths: ['*', '*', '*'],
                    heights: [120],
                    body: [[
                      {
                        stack: [
                          {
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 68, color: '#ffffff', lineColor: '#ffffff' }],
                            alignment: 'center'
                          },
                          {
                            canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }],
                            alignment: 'center'
                          },
                          { text: 'FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'SUPERVISOR DE SSA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 6] }
                        ],
                        margin: [4, 4, 4, 4]
                      },
                      {
                        stack: [
                          {
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 68, color: '#ffffff', lineColor: '#ffffff' }],
                            alignment: 'center'
                          },
                          {
                            canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }],
                            alignment: 'center'
                          },
                          { text: 'NOMBRE Y FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'SUPERVISOR DE ÁREA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 6] }
                        ],
                        margin: [4, 4, 4, 4]
                      },
                      {
                        stack: [
                          {
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 160, h: 52, color: '#ffffff', lineColor: '#ffffff' }],
                            alignment: 'center'
                          },
                          {
                            canvas: [{ type: 'line', x1: 20, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: navy }],
                            alignment: 'center'
                          },
                          { text: 'FIRMA', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 8, 0, 0] },
                          { text: 'PERSONA QUE DESPACHA EPP', alignment: 'center', bold: true, fontSize: 7, color: navy, margin: [0, 2, 0, 0] },
                          ...(despachoNombre
                            ? [
                                { text: String(despachoNombre).toUpperCase(), alignment: 'center', bold: true, fontSize: 8, color: navy, margin: [0, 4, 0, 0] },
                                ...(despachoCargo
                                  ? [{ text: String(despachoCargo), alignment: 'center', fontSize: 7, color: navy, margin: [0, 1, 0, 0] }]
                                  : [])
                              ]
                            : []),
                          {
                            columns: [
                              { text: 'Fecha de entrega:', fontSize: 7, bold: true, color: navy, width: 'auto' },
                              despachoFecha
                                ? { text: despachoFecha, fontSize: 8, bold: true, color: navy, width: '*', margin: [4, 0, 0, 0] }
                                : {
                                    canvas: [{ type: 'line', x1: 0, y1: 8, x2: 70, y2: 8, lineWidth: 0.8, lineColor: navy }],
                                    width: '*'
                                  }
                            ],
                            margin: [10, 10, 10, 4]
                          }
                        ],
                        margin: [4, 4, 4, 4]
                      }
                    ]]
                  },
                  layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => navy,
                    vLineColor: () => navy,
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: () => 2,
                    paddingBottom: () => 2
                  },
                  margin: [0, 2, 0, 0]
                }
              ]
            }]]
          },
          layout: {
            hLineWidth: () => 2,
            vLineWidth: () => 2,
            hLineColor: () => navy,
            vLineColor: () => navy
          }
        }
      ]
    };

    const safeName = (f.nombreTrabajador || 'trabajador').replace(/[^\w\-]+/g, '_').slice(0, 40);
    const fileName = `${f.nReporte || 'REP'}_${safeName}.pdf`;
    const pdf = pdfMake.createPdf(docDefinition);
    if (mode === 'blob') {
      return await new Promise<Blob>((resolve, reject) => {
        try {
          pdf.getBlob((b: Blob) => resolve(b));
        } catch (e) {
          reject(e);
        }
      });
    }
    if (mode === 'view') {
      const blob: Blob = await new Promise((resolve, reject) => {
        try {
          pdf.getBlob((b: Blob) => resolve(b));
        } catch (e) {
          reject(e);
        }
      });
      this.openDocViewer({
        title: `${f.nReporte || 'Reporte'} · vista previa`,
        isPdf: true,
        blob
      });
      return;
    }
    pdf.download(fileName);
  }

  private async readPhotoDataUrls(): Promise<string[]> {
    const out: string[] = [];
    // Medida única en el PDF: ambas fotos quedan iguales y lado a lado
    const targetW = 460;
    const targetH = 300;
    for (const file of this.photoFiles.slice(0, 2)) {
      const data = await this.fileToDataUrl(file);
      if (!data.startsWith('data:image')) continue;
      const resized = await this.resizeImageDataUrl(data, targetW, targetH);
      out.push(resized || data);
    }
    return out;
  }

  /** Escala la imagen (contain) a un canvas de tamaño fijo para el PDF. */
  private resizeImageDataUrl(dataUrl: string, maxW: number, maxH: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxW;
          canvas.height = maxH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, maxW, maxH);
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const x = Math.round((maxW - w) / 2);
          const y = Math.round((maxH - h) / 2);
          ctx.drawImage(img, x, y, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
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

  private emptyForm(): CambioEppForm {
    return {
      empresa: '',
      tipoAcontecimiento: '',
      sectionCode: '',
      sectionLabel: '',
      nReporte: '',
      nombreTrabajador: '',
      cedula: '',
      cargo: '',
      area: '',
      estadoEpi: '',
      fechaElaboracion: '',
      fechaNotificacion: '',
      fechaDotacion: '',
      talla: '',
      accionSuspension: false,
      accionMulta: false,
      accionNotificacion: false,
      accionCambio: true,
      severidad: '',
      observaciones: '',
      nombreEmisor: '',
      cargoEmisor: ''
    };
  }

  private reportStorageKey(): string {
    return `cambio-epp-report-${this.ruc || 'x'}`;
  }

  private peekReportNumber(): string {
    const year = new Date().getFullYear();
    let n = 1;
    try {
      const raw = localStorage.getItem(this.reportStorageKey());
      n = (raw ? parseInt(raw, 10) : 0) + 1;
    } catch {
      n = 1;
    }
    return `REP-${year}-${String(n).padStart(5, '0')}`;
  }

  private consumeReportNumber(): string {
    const year = new Date().getFullYear();
    let n = 1;
    try {
      const key = this.reportStorageKey();
      const raw = localStorage.getItem(key);
      n = (raw ? parseInt(raw, 10) : 0) + 1;
      localStorage.setItem(key, String(n));
    } catch {
      n = 1;
    }
    return `REP-${year}-${String(n).padStart(5, '0')}`;
  }

  private toLocalDateTimeValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private formatDateTimeDisplay(value?: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private formatDateDisplay(value?: string): string {
    if (!value) return '—';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
    return value;
  }

  private isoDateFromDisplay(fecha: string): string {
    const m = String(fecha || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return '';
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }

  private flattenRows(outputs: InventoryOutput[]): EntregaRow[] {
    const rows: EntregaRow[] = [];
    const sorted = [...outputs].sort((a, b) =>
      String(b.outputDate || '').localeCompare(String(a.outputDate || ''))
    );
    for (const o of sorted) {
      const fechaTxt = this.formatDateEs(o.outputDate);
      for (const det of (o.details || [])) {
        rows.push({
          documento: o.outputNumber || '—',
          codigoProducto: det.variantCode || String(det.variantId || '—'),
          descripcion: (det.productName || det.variantCode || '—').toUpperCase(),
          marca: det.brand || '—',
          cantidad: Number(det.quantity || 0),
          fecha: fechaTxt,
          talla: det.issuedSize || '—'
        });
      }
    }
    return rows;
  }

  private parseOutputDate(iso?: string): Date | null {
    if (!iso) return null;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDateEs(outputDate?: string): string {
    const base = this.parseOutputDate(outputDate);
    if (!base) return outputDate || '—';
    return `${base.getDate()}/${base.getMonth() + 1}/${base.getFullYear()}`;
  }

  private monthLabel(m: number): string {
    return this.reportMonths.find(x => x.value === m)?.label || String(m);
  }

  get selectedEmployeeName(): string {
    if (!this.selectedEmployee) return '';
    return this.employeeFilterLabel(this.selectedEmployee);
  }
}
