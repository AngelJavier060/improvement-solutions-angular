import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BusinessService } from '../../../../services/business.service';
import { DepartmentService } from '../../../../services/department.service';
import { UserService } from '../../../../services/user.service';
import { CreateUserRequest, Role } from '../../../../services/user.service';
import { CargoService } from '../../../../services/cargo.service';
import { TipoDocumentoService } from '../../../../services/tipo-documento.service';
import { TypeContractService } from '../../../../services/type-contract.service';
import { ObligationMatrixService } from '../../../../services/obligation-matrix.service';
import { BusinessObligationMatrixService } from '../../../../services/business-obligation-matrix.service';
import { IessService } from '../../../../services/iess.service';
import { ContractorCompanyService } from '../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../services/contractor-block.service';
import { ApprovalService } from '../../../../services/approval.service';
import { CourseCertificationService } from '../../../../services/course-certification.service';
import { CardService } from '../../../../services/card.service';
import { WorkScheduleService } from '../../../../services/work-schedule.service';
import { WorkShiftService } from '../../../../services/work-shift.service';
import { WorkSchedule } from '../../../../models/work-schedule.model';
import { WorkShift } from '../../../../models/work-shift.model';
import { environment } from '../../../../../environments/environment';
import { BusinessAdapterService } from '../../../../core/adapters/business-adapter.service';
import { QrLegalDocsService } from '../../../../core/services/qr-legal-docs.service';
import { forkJoin } from 'rxjs';
import { User } from './user-modal/user-modal.component';
import { EmployeeService } from '../../usuario/talento-humano/services/employee.service';
import { EmployeeResponse } from '../../usuario/talento-humano/models/employee.model';
import { InventoryCategoryService, InventoryCategory } from '../../../../services/inventory-category.service';
import { InventorySupplierService, InventorySupplier } from '../../../../services/inventory-supplier.service';
import { BusinessContextService } from '../../../../core/services/business-context.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserAdminService } from '../usuarios/user-admin.service';

@Component({
  selector: 'app-detalle-empresa-admin',
  templateUrl: './detalle-empresa-admin.component.html',
  styleUrls: ['./detalle-empresa-admin.component.scss']
})
export class DetalleEmpresaAdminComponent implements OnInit {
  empresaId!: number;
  empresa: any = null;
  loading = true;
  error: string | null = null;

  // Listas para todos los datos disponibles
  departamentos: any[] = [];
  cargos: any[] = [];
  tiposDocumentos: any[] = [];
  tiposContratos: any[] = [];
  obligacionesMatriz: any[] = [];
  iessList: any[] = [];
  cursosCertificaciones: any[] = [];
  tarjetas: any[] = [];
  roles: Role[] = [];
  // Aprobaciones de la empresa
  approvals: any[] = [];
  approvalsLoading = false;
  approvalsError: string | null = null;
  pendingApprovals: any[] = [];
  private readonly pendingStatuses = new Set(['PENDING','CREATED','REQUESTED','WAITING','NEW','OPEN','PENDIENTE','EN_REVISION']);
  
  // Empresas contratistas y bloques
  contractorCompanies: any[] = [];
  contractorBlocks: any[] = [];
  availableBlocks: any[] = [];
  
  // Variables para gestión de usuarios
  users: User[] = [];
  userToEdit: User | null = null;
  showUserModal = false;

  // Listado de personal por empresa (multi-empresa por RUC/ID)
  companyEmployees: EmployeeResponse[] = [];
  employeesLoading = false;
  employeesFilter = '';
  // Edición de código del trabajador (solo admin en este panel)
  editingEmployeeCodeId: number | null = null;
  editEmployeeCodeValue: string = '';
  savingEmployeeCode = false;

  // Variables para crear usuarios
  showCreateUserModal = false;
  editingUserId: number | null = null;
  isEditingUser = false;
  newUser = {
    nombres: '',
    apellidos: '',
    cedula: '',
    telefono: '',
    email: '',
    username: '',
    password: '',
    selectedRoles: [] as number[]
  };
  showPassword = false;

  // Variables para modales de asignación (simplificados)
  showAsignDepartmentModal = false;
  showAsignCargoModal = false;
  showAsignDocumentModal = false;
  showAsignContractModal = false;
  showAsignObligationModal = false;
  showAsignIessModal = false;
  showAsignContractorModal = false;
  showAsignCourseCertModal = false;
  showAsignCardModal = false;
  showAsignWorkScheduleModal = false;
  showAsignWorkShiftModal = false;

  // Catálogos globales de jornadas y horarios
  workSchedules: WorkSchedule[] = [];
  workShifts: WorkShift[] = [];
  selectedWorkSchedules: number[] = [];
  selectedWorkShifts: number[] = [];

  // Variables para selección de elementos (permitir múltiples selecciones)
  selectedDepartamentos: number[] = [];
  selectedCargos: number[] = [];
  selectedTiposDocumentos: number[] = [];
  selectedTiposContratos: number[] = [];
  selectedCourseCertifications: number[] = [];
  selectedCards: number[] = [];
  // IDs de catálogo seleccionados para asignar matrices legales
  selectedObligacionesMatriz: number[] = [];
  // Para IESS usaremos objetos completos con ngModel ([ngValue])
  selectedIess: any[] = [];
  
  // Variables para empresas contratistas
  selectedContractorCompanies: any[] = [];
  selectedBlocks: any[] = [];

  // Inventario (por empresa)
  inventoryCategories: InventoryCategory[] = [];
  inventorySuppliers: InventorySupplier[] = [];
  invCatLoading = false; invCatError: string | null = null;
  invSupLoading = false; invSupError: string | null = null;
  newCategoryName: string = '';
  newCategoryDescription: string = '';
  invCatOk: string | null = null;
  invSupOk: string | null = null;
  newSupplier: { name: string; ruc?: string; phone?: string; email?: string; address?: string } = {
    name: '', ruc: '', phone: '', email: '', address: ''
  };
  globalCategoryCatalog: Array<{ name: string; description?: string }> = [];
  globalSupplierCatalog: Array<{ name: string; ruc?: string; phone?: string; email?: string; address?: string }> = [];
  selectedGlobalCategoryName: string | null = null;
  selectedGlobalSupplier: any = null;
  // Selección desde configuración existente
  selectedCategoryId: number | null = null;
  selectedSupplierId: number | null = null;
  // Edición de categoría
  editingCategoryId: number | null = null;
  editCategoryForm: { name: string; description: string } = { name: '', description: '' };
  // Edición de proveedor
  editingSupplierId: number | null = null;
  editSupplierForm: { name: string; ruc: string; phone: string; email: string; address: string } = { name: '', ruc: '', phone: '', email: '', address: '' };

  // Contexto de edición inline por sección
  editingContext: { section: 'department' | 'position' | 'type_document' | 'course_cert' | 'card' | 'iess' | 'obligation' | 'type_contract' | 'contractor_company' | 'work_schedule' | 'work_shift', originalId: number } | null = null;

  // Estado de eliminación en curso para matrices de obligación
  private deletingObligationIds: Set<number> = new Set<number>();

  // Estado de edición de obligación (relación por empresa)
  showEditObligationModal = false;
  savingObligation = false;
  obligationToEdit: any = null;

  // Archivos de matrices legales y pendientes
  matrixFiles: { [matrixId: number]: any[] | undefined } = {};
  matrixPending: { [matrixId: number]: any[] } = {};
  matrixFilesVisible: { [matrixId: number]: boolean } = {};
  matrixFilesLoading: { [matrixId: number]: boolean } = {};
  matrixPendingLoading: { [matrixId: number]: boolean } = {};

  // QR público (vista previa)
  qrPreviewToken: string | null = null;

  // Administradores de esta empresa
  isSuperAdmin = false;
  businessAdmins: User[] = [];
  allSystemUsers: User[] = [];
  showAssignAdminModal = false;
  selectedUserIdForAdmin: number | null = null;

  // Configuración de mantenimiento por empresa
  showMaintenanceModal = false;
  savingMaintenance = false;
  maintenanceConfig: any = {
    enabled: false,
    serviceIntervalKm: 10000,
    serviceIntervalMonths: 6,
    notifyDaysBefore: 7,
    workshopInternal: false,
    notificationEmails: '',
    clases: ['Trailer', 'Cabezal', 'Camión', 'Camioneta']
  };

  // Tipos de Vehículo asignados a la empresa
  tipoVehiculos: any[] = [];
  allTipoVehiculos: any[] = [];
  showAsignVehicleTypeModal = false;
  selectedVehicleTypeId: number | null = null;
  savingVehicleType = false;

  // Estados de Unidad asignados a la empresa
  estadoUnidades: any[] = [];
  allEstadoUnidades: any[] = [];
  showAsignUnitStatusModal = false;
  selectedUnitStatusId: number | null = null;
  savingUnitStatus = false;

  // Marcas de Vehículo
  marcaVehiculos: any[] = [];
  allMarcaVehiculos: any[] = [];
  showAsignMarcaModal = false;
  selectedMarcaId: number | null = null;
  savingMarca = false;

  claseVehiculos: any[] = [];
  allClaseVehiculos: any[] = [];
  showAsignClaseModal = false;
  selectedClaseId: number | null = null;
  savingClase = false;

  entidadRemitentes: any[] = [];
  allEntidadRemitentes: any[] = [];
  showAsignEntidadRemModal = false;
  selectedEntidadRemId: number | null = null;
  savingEntidadRem = false;

  // Tipos de Combustible
  tipoCombustibles: any[] = [];
  allTipoCombustibles: any[] = [];
  showAsignCombustibleModal = false;
  selectedCombustibleId: number | null = null;
  savingCombustible = false;

  // Colores de Vehículo
  colorVehiculos: any[] = [];
  allColorVehiculos: any[] = [];
  showAsignColorModal = false;
  selectedColorId: number | null = null;
  savingColor = false;

  // Transmisiones
  transmisiones: any[] = [];
  allTransmisiones: any[] = [];
  showAsignTransmisionModal = false;
  selectedTransmisionId: number | null = null;
  savingTransmision = false;

  // Propietarios de Vehículo
  propietarioVehiculos: any[] = [];
  allPropietarioVehiculos: any[] = [];
  showAsignPropietarioModal = false;
  selectedPropietarioId: number | null = null;
  savingPropietario = false;

  // Tipos de Documento Vehículo
  tipoDocumentoVehiculos: any[] = [];
  allTipoDocumentoVehiculos: any[] = [];
  showAsignTipoDocVehModal = false;
  selectedTipoDocVehId: number | null = null;
  savingTipoDocVeh = false;

  // Unidades de Medida
  unidadMedidas: any[] = [];
  allUnidadMedidas: any[] = [];
  showAsignUnidadMedidaModal = false;
  selectedUnidadMedidaId: number | null = null;
  savingUnidadMedida = false;

  // Ubicaciones/Rutas
  ubicacionRutas: any[] = [];
  allUbicacionRutas: any[] = [];
  showAsignUbicacionModal = false;
  selectedUbicacionId: number | null = null;
  savingUbicacion = false;

  // Países de Origen
  paisOrigenes: any[] = [];
  allPaisOrigenes: any[] = [];
  showAsignPaisModal = false;
  selectedPaisId: number | null = null;
  savingPais = false;

  numeroEjes: any[] = [];
  allNumeroEjes: any[] = [];
  showAsignNumeroEjeModal = false;
  selectedNumeroEjeId: number | null = null;
  savingNumeroEje = false;

  configuracionEjes: any[] = [];
  allConfiguracionEjes: any[] = [];
  showAsignConfiguracionEjeModal = false;
  selectedConfiguracionEjeId: number | null = null;
  savingConfiguracionEje = false;

  // === GERENCIA DE VIAJES — parámetros por empresa ===
  distanciaRecorrers: any[] = []; allDistanciaRecorrers: any[] = [];
  showAsignDistanciaModal = false; selectedDistanciaId: number | null = null; savingDistancia = false;

  tipoVias: any[] = []; allTipoVias: any[] = [];
  showAsignTipoViaModal = false; selectedTipoViaId: number | null = null; savingTipoVia = false;

  condicionClimaticas: any[] = []; allCondicionClimaticas: any[] = [];
  showAsignCondicionModal = false; selectedCondicionId: number | null = null; savingCondicion = false;

  horarioCirculaciones: any[] = []; allHorarioCirculaciones: any[] = [];
  showAsignHorarioCircModal = false; selectedHorarioCircId: number | null = null; savingHorarioCirc = false;

  estadoCarreteras: any[] = []; allEstadoCarreteras: any[] = [];
  showAsignEstadoCarrModal = false; selectedEstadoCarrId: number | null = null; savingEstadoCarr = false;

  tipoCargas: any[] = []; allTipoCargas: any[] = [];
  showAsignTipoCargaModal = false; selectedTipoCargaId: number | null = null; savingTipoCarga = false;

  horaConducciones: any[] = []; allHoraConducciones: any[] = [];
  showAsignHoraCondModal = false; selectedHoraCondId: number | null = null; savingHoraCond = false;

  horaDescansos: any[] = []; allHoraDescansos: any[] = [];
  showAsignHoraDescModal = false; selectedHoraDescId: number | null = null; savingHoraDesc = false;

  medioComunicaciones: any[] = []; allMedioComunicaciones: any[] = [];
  showAsignMedioComModal = false; selectedMedioComId: number | null = null; savingMedioCom = false;

  transportaPasajeros: any[] = []; allTransportaPasajeros: any[] = [];
  showAsignTransportaModal = false; selectedTransportaId: number | null = null; savingTransporta = false;

  metodologiaRiesgos: any[] = []; allMetodologiaRiesgos: any[] = [];
  showAsignMetodologiaModal = false; selectedMetodologiaId: number | null = null; savingMetodologia = false;

  posiblesRiesgosVia: any[] = []; allPosiblesRiesgosVia: any[] = [];
  showAsignPosibleRiesgoViaModal = false; selectedPosibleRiesgoViaId: number | null = null; savingPosibleRiesgoVia = false;

  // Modal para editar empresa
  showEditEmpresaModal = false;
  savingEmpresa = false;
  editEmpresa = {
    name: '',
    ruc: '',
    businessType: '',
    active: true,
    representative_legal: '',
    email: '',
    phone: '',
    secondaryPhone: '',
    website: '',
    address: '',
    nameShort: '',
    tradeName: '',
    commercialActivity: '',
    description: ''
  };
  editObligation: {
    id: number | null,
    legalRegulation: string,
    entryDate: string | null,
    dueDate: string | null,
    priority: string | null,
    status: string | null,
    observations: string
  } = {
    id: null,
    legalRegulation: '',
    entryDate: null,
    dueDate: null,
    priority: null,
    status: null,
    observations: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private departmentService: DepartmentService,
    private userService: UserService,
    private cargoService: CargoService,
    private tipoDocumentoService: TipoDocumentoService,
    private typeContractService: TypeContractService,
    private obligationMatrixService: ObligationMatrixService,
    private iessService: IessService,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService,
    private title: Title,
    private businessAdapter: BusinessAdapterService,
    private bomService: BusinessObligationMatrixService,
    private approvalService: ApprovalService,
    private courseCertificationService: CourseCertificationService,
    private cardService: CardService,
    private workScheduleService: WorkScheduleService,
    private workShiftService: WorkShiftService,
    private employeeService: EmployeeService,
    private inventoryCategoryService: InventoryCategoryService,
    private inventorySupplierService: InventorySupplierService,
    private businessCtx: BusinessContextService,
    private qrLegalDocsService: QrLegalDocsService,
    private authService: AuthService,
    private userAdminService: UserAdminService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.hasRole('ROLE_SUPER_ADMIN');
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.empresaId = +params['id'];
        this.loadData();
        this.loadApprovals();
        this.loadBusinessAdmins();
      }
    });
  }

  // === Configuración de Mantenimiento (por empresa) ===
  private defaultMaintenanceConfig(): any {
    return {
      enabled: false,
      serviceIntervalKm: 10000,
      serviceIntervalMonths: 6,
      notifyDaysBefore: 7,
      workshopInternal: false,
      notificationEmails: '',
      /** Clases de vehículo para fichas de flota (ficha técnica); editable en JSON al guardar configuración */
      clases: ['Trailer', 'Cabezal', 'Camión', 'Camioneta']
    };
  }

  loadMaintenanceConfig(): void {
    if (!this.empresaId) return;
    this.businessService.getMaintenanceConfig(this.empresaId).subscribe({
      next: (cfg) => {
        const def = this.defaultMaintenanceConfig();
        try {
          this.maintenanceConfig = { ...def, ...(cfg || {}) };
          this.maintenanceConfig.enabled = !!this.maintenanceConfig.enabled;
          this.maintenanceConfig.serviceIntervalKm = Number(this.maintenanceConfig.serviceIntervalKm) || def.serviceIntervalKm;
          this.maintenanceConfig.serviceIntervalMonths = Number(this.maintenanceConfig.serviceIntervalMonths) || def.serviceIntervalMonths;
          this.maintenanceConfig.notifyDaysBefore = Number(this.maintenanceConfig.notifyDaysBefore) || def.notifyDaysBefore;
          this.maintenanceConfig.workshopInternal = !!this.maintenanceConfig.workshopInternal;
          this.maintenanceConfig.notificationEmails = (this.maintenanceConfig.notificationEmails || '').toString();
          const rawClases = this.maintenanceConfig.clases;
          if (Array.isArray(rawClases)) {
            this.maintenanceConfig.clases = rawClases
              .map((c: any) => (typeof c === 'string' ? c.trim() : (c && c.name ? String(c.name).trim() : '')))
              .filter((s: string) => !!s);
          } else {
            this.maintenanceConfig.clases = [...def.clases];
          }
        } catch {
          this.maintenanceConfig = def;
        }
      },
      error: () => {
        this.maintenanceConfig = this.defaultMaintenanceConfig();
      }
    });
  }

  openMaintenanceModal(): void {
    this.showMaintenanceModal = true;
  }

  closeMaintenanceModal(): void {
    this.showMaintenanceModal = false;
  }

  saveMaintenanceConfig(): void {
    if (!this.empresaId) return;
    this.savingMaintenance = true;
    const cfg = { ...this.maintenanceConfig };
    if (typeof cfg.notificationEmails === 'string') {
      cfg.notificationEmails = cfg.notificationEmails.split(',').map((s: string) => s.trim()).filter((s: string) => !!s).join(', ');
    }
    this.businessService.updateMaintenanceConfig(this.empresaId, cfg).subscribe({
      next: () => {
        this.savingMaintenance = false;
        this.showMaintenanceModal = false;
        alert('Configuración de mantenimiento guardada');
      },
      error: () => {
        this.savingMaintenance = false;
        alert('No se pudo guardar la configuración de mantenimiento');
      }
    });
  }

  // Marcar archivo como visible/no visible para QR público
  isPdf(file: any): boolean {
    try {
      const n = (file?.name ?? file?.path ?? '').toString().toLowerCase();
      return n.endsWith('.pdf');
    } catch { return false; }
  }

  isPublicFile(file: any): boolean {
    try {
      const desc = (file?.description ?? '').toString();
      return desc.includes('[PUBLIC]');
    } catch { return false; }
  }

  countPublicFor(matrixId: number): number {
    const list = this.matrixFiles[matrixId] || [];
    return (Array.isArray(list) ? list : []).filter(f => this.isPdf(f) && this.isPublicFile(f)).length;
  }

  togglePublic(file: any, matrixId: number): void {
    if (!file?.id || !matrixId) return;
    if (!this.isPdf(file)) { alert('Solo se pueden marcar como visibles los archivos PDF.'); return; }
    const currentlyPublic = this.isPublicFile(file);
    if (!currentlyPublic) {
      const count = this.countPublicFor(matrixId);
      if (count >= 5) { alert('Solo puede seleccionar hasta 5 PDFs visibles por obligación.'); return; }
    }
    const currentDesc = (file?.description ?? '').toString();
    const descBase = currentDesc.replace('[PUBLIC]', '').trim();
    const newDesc = currentlyPublic ? descBase : (`[PUBLIC] ${descBase}`).trim();
    this.matrixFilesLoading[matrixId] = true;
    this.bomService.updateFile(Number(file.id), newDesc).subscribe({
      next: () => {
        this.refreshMatrixFiles(matrixId);
        this.matrixFilesLoading[matrixId] = false;
        alert(currentlyPublic ? 'El PDF ya no será mostrado al usuario.' : 'PDF marcado para mostrar al usuario.');
      },
      error: (err) => {
        console.error('Error al actualizar visibilidad de archivo:', err);
        this.matrixFilesLoading[matrixId] = false;
        alert('No se pudo actualizar la visibilidad del archivo.');
      }
    });
  }

  // QR público: emitir token y construir URLs de vista previa
  generateQrPreviewToken(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc) { alert('No se pudo determinar el RUC de la empresa.'); return; }
    this.qrLegalDocsService.issueToken(ruc).subscribe({
      next: (res) => { this.qrPreviewToken = res?.token || null; },
      error: () => { this.qrPreviewToken = null; alert('No se pudo generar el token de QR.'); }
    });
  }

  rotateQrToken(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc) { alert('No se pudo determinar el RUC de la empresa.'); return; }
    if (!confirm('Esto invalidará todos los QR anteriores. ¿Desea continuar?')) return;
    this.qrLegalDocsService.rotateToken(ruc).subscribe({
      next: (res) => {
        this.qrPreviewToken = res?.token || null;
        alert('Token rotado correctamente. Actualice las credenciales impresas con el nuevo QR.');
      },
      error: () => { alert('No se pudo rotar el token.'); }
    });
  }

  getQrPortalUrl(): string {
    try {
      const ruc = this.getBusinessRuc() || '';
      let base = (environment as any).publicSiteUrl?.trim();
      if (!base && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const path = window.location.pathname || '';
        const seg1 = (path.split('/')[1] || '').trim();
        const isLocale = /^[a-z]{2}-[A-Z]{2}$/.test(seg1);
        base = isLocale ? `${origin}/${seg1}` : origin;
      }
      const token = this.qrPreviewToken || '';
      if (!ruc || !token || !base) return '';
      return `${base}/public/qr/${ruc}?token=${encodeURIComponent(token)}`;
    } catch { return ''; }
  }

  getQrImageUrl(): string {
    try {
      const target = this.getQrPortalUrl();
      if (!target) return '';
      const data = encodeURIComponent(target);
      return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${data}`;
    } catch { return ''; }
  }

  copyQrUrl(): void {
    try {
      const url = this.getQrPortalUrl();
      if (!url) return;
      const done = () => alert('Enlace copiado');
      if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        (navigator as any).clipboard.writeText(url).then(done).catch(() => {
          // fallback below
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      }
    } catch {}
  }

  // === Ojo a nivel de obligación (toggle sobre el PDF actual) ===
  rowEyeIcon(obligation: any): string {
    try {
      const matrixId = this.getMatrixRelationId(obligation);
      const list = this.matrixFiles[matrixId] || [];
      const anyPublic = (Array.isArray(list) ? list : []).some(f => this.isPdf(f) && this.isPublicFile(f));
      return anyPublic ? 'fa-eye' : 'fa-eye-slash';
    } catch { return 'fa-eye-slash'; }
  }

  toggleLatestPublicOnRow(obligation: any): void {
    try {
      const matrixId = this.getMatrixRelationId(obligation);
      if (!matrixId) return;
      // Obtener archivos actuales y alternar el último PDF
      this.bomService.listFiles(matrixId, { currentOnly: true }).subscribe({
        next: (files) => {
          const arr = Array.isArray(files) ? files : [];
          const pdfs = arr.filter((f: any) => this.isPdf(f));
          if (pdfs.length === 0) {
            alert('No hay PDFs actuales para esta obligación. Sube un PDF y luego márcalo como visible.');
            return;
          }
          // Elegir el más reciente (por updatedAt o id)
          pdfs.sort((a: any, b: any) => {
            const da = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const db = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            if (db !== da) return db - da;
            const ia = Number(a?.id) || 0; const ib = Number(b?.id) || 0;
            return ib - ia;
          });
          const target = pdfs[0];
          const currentlyPublic = this.isPublicFile(target);
          if (!currentlyPublic && this.countPublicFor(matrixId) >= 5) {
            alert('Límite de 5 PDFs visibles por obligación alcanzado.');
            return;
          }
          const baseDesc = (target?.description ?? '').toString().replace('[PUBLIC]', '').trim();
          const newDesc = currentlyPublic ? baseDesc : (`[PUBLIC] ${baseDesc}`).trim();
          this.matrixFilesLoading[matrixId] = true;
          this.bomService.updateFile(Number(target.id), newDesc).subscribe({
            next: () => {
              this.refreshMatrixFiles(matrixId);
              this.matrixFilesLoading[matrixId] = false;
            },
            error: () => {
              this.matrixFilesLoading[matrixId] = false;
              alert('No se pudo actualizar la visibilidad del archivo.');
            }
          });
        },
        error: () => alert('No se pudo consultar archivos de la obligación.')
      });
    } catch {}
  }

  // === Gestión de Código del trabajador ===
  getEmployeeCodeAdmin(emp: any): string {
    try {
      return String(emp?.codigoTrabajador || emp?.codigoEmpresa || '').trim();
    } catch { return ''; }
  }

  startEditEmployeeCode(emp: EmployeeResponse): void {
    this.editingEmployeeCodeId = emp?.id ?? null;
    this.editEmployeeCodeValue = this.getEmployeeCodeAdmin(emp);
  }

  cancelEditEmployeeCode(): void {
    this.editingEmployeeCodeId = null;
    this.editEmployeeCodeValue = '';
  }

  saveEmployeeCode(emp: EmployeeResponse): void {
    if (!emp?.id) return;
    const newCode = (this.editEmployeeCodeValue || '').trim();
    if (!newCode) {
      alert('Ingrese el Código del trabajador.');
      return;
    }
    this.savingEmployeeCode = true;
    this.employeeService.updateEmployee(emp.id, { codigoEmpresa: newCode }).subscribe({
      next: () => {
        this.savingEmployeeCode = false;
        this.cancelEditEmployeeCode();
        this.loadCompanyEmployees();
        alert('Código del trabajador actualizado.');
      },
      error: (err) => {
        this.savingEmployeeCode = false;
        const msg = err?.error?.message || 'No se pudo actualizar el código del trabajador.';
        alert(msg);
      }
    });
  }

  // === Catálogo global de inventario (sin RUC) ===
  loadGlobalCategoryCatalog(): void {
    // Usar SOLO el catálogo global (sin mezclar categorías por empresa)
    this.inventoryCategoryService.listGlobal().subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        // Mapear a estructura usada por el componente (name/description)
        this.globalCategoryCatalog = arr.map((g: any) => ({
          name: (g?.name ?? '').toString(),
          description: (g?.description ?? undefined)
        }));
      },
      error: (err) => {
        console.error('[INVENTORY] Error cargando catálogo global de categorías:', err);
        this.globalCategoryCatalog = [];
      }
    });
  }

  loadGlobalSupplierCatalog(): void {
    // Usar SOLO el catálogo global (sin mezclar proveedores por empresa)
    this.inventorySupplierService.listGlobal().subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        this.globalSupplierCatalog = arr.map((g: any) => ({
          name: (g?.name ?? '').toString(),
          ruc: g?.ruc ?? undefined,
          phone: g?.phone ?? undefined,
          email: g?.email ?? undefined,
          address: g?.address ?? undefined
        }));
      },
      error: (err) => {
        console.error('[INVENTORY] Error cargando catálogo global de proveedores:', err);
        this.globalSupplierCatalog = [];
      }
    });
  }

  addCategoryFromGlobalCatalog(): void {
    const ruc = this.getBusinessRuc();
    const nameRaw = (this.selectedGlobalCategoryName || '').trim();
    if (!ruc || !nameRaw) return;
    const name = nameRaw;
    const lower = name.toLowerCase();
    const existing = (this.inventoryCategories || []).find(c => c && String(c.name || '').trim().toLowerCase() === lower);
    if (existing) {
      if (existing.active === true) {
        this.invCatOk = 'Categoría ya asignada';
        this.selectedGlobalCategoryName = null;
        return;
      }
      this.invCatLoading = true; this.invCatError = null; this.invCatOk = null;
      const payload: InventoryCategory = { name: existing.name, description: existing.description, active: true } as InventoryCategory;
      this.inventoryCategoryService.update(ruc, Number(existing.id), payload).subscribe({
        next: () => {
          this.invCatOk = 'Categoría asignada';
          this.selectedGlobalCategoryName = null;
          this.loadInventoryCategories();
        },
        error: (err) => {
          this.invCatLoading = false;
          this.invCatError = err?.error?.message || 'No se pudo asignar la categoría';
        }
      });
      return;
    }
    const found = (this.globalCategoryCatalog || []).find(g => String(g?.name) === name);
    const description = found?.description || '';
    this.invCatLoading = true; this.invCatError = null; this.invCatOk = null;
    this.inventoryCategoryService.create(ruc, { name, description, active: true } as InventoryCategory).subscribe({
      next: () => {
        this.invCatOk = 'Categoría agregada';
        this.selectedGlobalCategoryName = null;
        this.loadInventoryCategories();
      },
      error: (err) => {
        this.invCatLoading = false;
        this.invCatError = err?.error?.message || 'No se pudo agregar la categoría';
      }
    });
  }

  addSupplierFromGlobalCatalog(): void {
    const ruc = this.getBusinessRuc();
    const g: any = this.selectedGlobalSupplier;
    if (!ruc || !g || !g.name) return;
    const key = (obj: any) => {
      const r = String(obj?.ruc || '').trim();
      if (r) return 'R:' + r;
      const n = String(obj?.name || '').trim().toLowerCase();
      return 'N:' + n;
    };
    const existing = (this.inventorySuppliers || []).find(s => key(s) === key(g));
    if (existing) {
      if (existing.active === true) {
        this.invSupOk = 'Proveedor ya asignado';
        this.selectedGlobalSupplier = null;
        return;
      }
      this.invSupLoading = true; this.invSupError = null; this.invSupOk = null;
      const payload: InventorySupplier = {
        name: existing.name || g.name,
        ruc: existing.ruc || g.ruc,
        phone: existing.phone || g.phone,
        email: existing.email || g.email,
        address: existing.address || g.address,
        active: true
      } as InventorySupplier;
      this.inventorySupplierService.update(ruc, Number(existing.id), payload).subscribe({
        next: () => {
          this.invSupOk = 'Proveedor asignado';
          this.selectedGlobalSupplier = null;
          this.loadInventorySuppliers();
        },
        error: (err) => {
          this.invSupLoading = false;
          this.invSupError = err?.error?.message || 'No se pudo asignar el proveedor';
        }
      });
      return;
    }
    this.invSupLoading = true; this.invSupError = null; this.invSupOk = null;
    const payload: InventorySupplier = {
      name: g.name,
      ruc: g.ruc,
      phone: g.phone,
      email: g.email,
      address: g.address,
      active: true
    } as InventorySupplier;
    this.inventorySupplierService.create(ruc, payload).subscribe({
      next: () => {
        this.invSupOk = 'Proveedor agregado';
        this.selectedGlobalSupplier = null;
        this.loadInventorySuppliers();
      },
      error: (err) => {
        this.invSupLoading = false;
        this.invSupError = err?.error?.message || 'No se pudo agregar el proveedor';
      }
    });
  }

  // === Personal por Empresa (para panel de "Gestionar personal de la empresa") ===
  loadCompanyEmployees(): void {
    if (!this.empresaId && !this.empresa?.ruc) return;
    this.employeesLoading = true;
    const done = () => { this.employeesLoading = false; };
    // Preferir RUC si está disponible para mayor precisión multi-empresa
    const ruc = this.empresa?.ruc;
    const obs = ruc
      ? this.employeeService.getEmployeesByBusinessRuc(String(ruc))
      : this.employeeService.getEmployeesByBusiness(Number(this.empresaId));
    obs.subscribe({
      next: (list) => {
        this.companyEmployees = (list || []).map((e: any) => ({ ...e } as EmployeeResponse));
        done();
      },
      error: (err) => {
        console.error('Error cargando empleados de la empresa', err);
        this.companyEmployees = [];
        done();
      }
    });
  }

  filteredCompanyEmployees(): EmployeeResponse[] {
    const term = (this.employeesFilter || '').trim().toLowerCase();
    if (!term) return this.companyEmployees || [];
    return (this.companyEmployees || []).filter((e: any) => {
      const full = `${e.nombres || ''} ${e.apellidos || ''} ${e.name || ''}`.toLowerCase();
      const ced = String(e.cedula || '').toLowerCase();
      return full.includes(term) || ced.includes(term);
    });
  }

  getEmployeePhotoUrlAdmin(emp: any): string {
    try {
      let rel = String(emp?.imagePath || emp?.photo || emp?.profile_picture || '').replace(/\\/g, '/').replace(/^\.?\/?/, '').trim();
      if (!rel) return 'assets/img/default-avatar.svg';
      if (/^https?:\/\//i.test(rel)) return rel;
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      if (rel.startsWith('profiles/') || rel.includes('/profiles/')) return `/api/files/${rel}`;
      if (!rel.includes('/')) return `/api/files/profiles/${rel}`;
      return `/api/files/${rel}`;
    } catch { return 'assets/img/default-avatar.svg'; }
  }

  onImgError(event: Event): void {
    const img = event?.target as HTMLImageElement | null;
    if (img) {
      img.src = 'assets/img/default-avatar.svg';
    }
  }

  goToTHEmployees(): void {
    const ruc = this.empresa?.ruc;
    if (ruc) {
      this.router.navigate(['/usuario', ruc, 'talento-humano', 'gestion-empleados']);
    }
  }

  goToUsersAdmin(): void {
    this.router.navigate(['/dashboard', 'admin', 'usuarios']);
  }

  goToConfig(section: string): void {
    this.router.navigate(['/dashboard', 'admin', 'configuracion', section]);
  }

  loadCourseCertifications(): void {
    this.courseCertificationService.getAll().subscribe({
      next: (data: any[]) => {
        this.cursosCertificaciones = data || [];
        this.hydrateEmpresaArrays();
      },
      error: (error: any) => {
        console.error('Error al cargar cursos/certificaciones globales:', error);
        this.cursosCertificaciones = [];
      }
    });
  }

  loadCards(): void {
    this.cardService.getAll().subscribe({
      next: (data: any[]) => {
        this.tarjetas = data || [];
        this.hydrateEmpresaArrays();
      },
      error: (error: any) => {
        console.error('Error al cargar tarjetas globales:', error);
        this.tarjetas = [];
      }
    });
  }

  loadWorkSchedules(): void {
    this.workScheduleService.getAll().subscribe({
      next: (data) => { this.workSchedules = data || []; },
      error: () => { this.workSchedules = []; }
    });
  }

  loadWorkShifts(): void {
    this.workShiftService.getAll().subscribe({
      next: (data) => { this.workShifts = data || []; },
      error: () => { this.workShifts = []; }
    });
  }

  // === JORNADAS DE TRABAJO ===
  openAsignWorkScheduleModal(): void {
    this.selectedWorkSchedules = [];
    this.showAsignWorkScheduleModal = true;
  }

  editWorkSchedule(ws: any): void {
    this.selectedWorkSchedules = [Number(ws?.id)];
    this.editingContext = { section: 'work_schedule', originalId: Number(ws?.id) };
    this.showAsignWorkScheduleModal = true;
  }

  asignWorkSchedule(): void {
    if (!this.selectedWorkSchedules.length || !this.empresa?.id) return;
    const performAdd = async () => {
      if (this.editingContext?.section === 'work_schedule' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedWorkSchedules[0]);
        if (newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeWorkScheduleFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }
      const ids = Array.from(new Set(this.selectedWorkSchedules.map((n: number) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)));
      const assignedIds = new Set<number>((this.empresa?.work_schedules || []).map((w: any) => Number(w?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'work_schedule' && Number(this.editingContext.originalId) === id) return false;
        return !assignedIds.has(id);
      });
      for (const wsId of idsToAdd) {
        try {
          await this.businessService.addWorkScheduleToBusiness(this.empresa.id, Number(wsId)).toPromise();
        } catch (e: any) {
          const status = e?.status;
          if (status !== 409) throw e;
        }
      }
      idsToAdd.forEach(selectedId => {
        const item = this.workSchedules.find((w: any) => Number(w.id) === Number(selectedId));
        if (item && !(this.empresa.work_schedules || []).some((w: any) => Number(w.id) === Number(selectedId))) {
          if (!this.empresa.work_schedules) this.empresa.work_schedules = [];
          this.empresa.work_schedules.push({ id: item.id, name: item.name });
        }
      });
    };
    performAdd().then(() => {
      this.selectedWorkSchedules = [];
      this.showAsignWorkScheduleModal = false;
      this.editingContext = null;
      this.loadData();
      alert('Jornadas de trabajo asignadas exitosamente');
    }).catch((error: any) => {
      console.error('Error al asignar jornadas de trabajo:', error);
      this.loadData();
      alert('Error al asignar jornadas de trabajo.');
    });
  }

  removeWorkSchedule(wsId: number): void {
    if (!this.empresa?.id) return;
    if (confirm('¿Está seguro de eliminar esta jornada de la empresa?')) {
      this.businessService.removeWorkScheduleFromBusiness(this.empresa.id, Number(wsId)).subscribe({
        next: () => {
          this.empresa.work_schedules = (this.empresa.work_schedules || []).filter((w: any) => Number(w.id) !== Number(wsId));
          alert('Jornada de trabajo eliminada exitosamente');
        },
        error: () => { alert('Error al eliminar la jornada de trabajo.'); }
      });
    }
  }

  getAvailableWorkSchedules(): WorkSchedule[] {
    if (!Array.isArray(this.workSchedules)) return [];
    const assignedIds = new Set<number>((this.empresa?.work_schedules || []).map((w: any) => Number(w?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedWorkSchedules || []).map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    if (this.editingContext?.section === 'work_schedule') {
      return this.workSchedules.filter((w: any) => !assignedIds.has(Number(w.id)) || Number(this.editingContext?.originalId) === Number(w.id));
    }
    return this.workSchedules.filter((w: any) => !assignedIds.has(Number(w.id)) || selectedIds.has(Number(w.id)));
  }

  // === HORARIOS DE TRABAJO ===
  openAsignWorkShiftModal(): void {
    this.selectedWorkShifts = [];
    this.showAsignWorkShiftModal = true;
  }

  editWorkShift(ws: any): void {
    this.selectedWorkShifts = [Number(ws?.id)];
    this.editingContext = { section: 'work_shift', originalId: Number(ws?.id) };
    this.showAsignWorkShiftModal = true;
  }

  asignWorkShift(): void {
    if (!this.selectedWorkShifts.length || !this.empresa?.id) return;
    const performAdd = async () => {
      if (this.editingContext?.section === 'work_shift' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedWorkShifts[0]);
        if (newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeWorkShiftFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }
      const ids = Array.from(new Set(this.selectedWorkShifts.map((n: number) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)));
      const assignedIds = new Set<number>((this.empresa?.work_shifts || []).map((w: any) => Number(w?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'work_shift' && Number(this.editingContext.originalId) === id) return false;
        return !assignedIds.has(id);
      });
      for (const wshId of idsToAdd) {
        try {
          await this.businessService.addWorkShiftToBusiness(this.empresa.id, Number(wshId)).toPromise();
        } catch (e: any) {
          const status = e?.status;
          if (status !== 409) throw e;
        }
      }
      idsToAdd.forEach(selectedId => {
        const item = this.workShifts.find((w: any) => Number(w.id) === Number(selectedId));
        if (item && !(this.empresa.work_shifts || []).some((w: any) => Number(w.id) === Number(selectedId))) {
          if (!this.empresa.work_shifts) this.empresa.work_shifts = [];
          this.empresa.work_shifts.push({ id: item.id, name: item.name });
        }
      });
    };
    performAdd().then(() => {
      this.selectedWorkShifts = [];
      this.showAsignWorkShiftModal = false;
      this.editingContext = null;
      this.loadData();
      alert('Horarios de trabajo asignados exitosamente');
    }).catch((error: any) => {
      console.error('Error al asignar horarios de trabajo:', error);
      this.loadData();
      alert('Error al asignar horarios de trabajo.');
    });
  }

  removeWorkShift(wshId: number): void {
    if (!this.empresa?.id) return;
    if (confirm('¿Está seguro de eliminar este horario de la empresa?')) {
      this.businessService.removeWorkShiftFromBusiness(this.empresa.id, Number(wshId)).subscribe({
        next: () => {
          this.empresa.work_shifts = (this.empresa.work_shifts || []).filter((w: any) => Number(w.id) !== Number(wshId));
          alert('Horario de trabajo eliminado exitosamente');
        },
        error: () => { alert('Error al eliminar el horario de trabajo.'); }
      });
    }
  }

  getAvailableWorkShifts(): WorkShift[] {
    if (!Array.isArray(this.workShifts)) return [];
    const assignedIds = new Set<number>((this.empresa?.work_shifts || []).map((w: any) => Number(w?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedWorkShifts || []).map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    if (this.editingContext?.section === 'work_shift') {
      return this.workShifts.filter((w: any) => !assignedIds.has(Number(w.id)) || Number(this.editingContext?.originalId) === Number(w.id));
    }
    return this.workShifts.filter((w: any) => !assignedIds.has(Number(w.id)) || selectedIds.has(Number(w.id)));
  }

  private getStatus(req: any): string {
    try {
      const raw = (req?.status ?? req?.state ?? req?.approvalStatus ?? '').toString().toUpperCase();
      return raw;
    } catch {
      return '';
    }
  }

  canDecide(req: any): boolean {
    return this.pendingStatuses.has(this.getStatus(req));
  }
  /* Duplicated helper and early openCreateUserModal removed; single definitions exist further below */

  // === Helpers de presentación ===
  getPositionNameByEmployee(employee: any): string {
    if (!employee) return 'Sin asignar';
    const direct = employee.position?.name || employee.position_name || employee.positionName;
    if (direct && String(direct).trim().length > 0) return String(direct);

    const posId = employee.position_id ?? employee.positionId ?? employee.position?.id;
    if (posId != null) {
      const fromEmpresa = (this.empresa?.positions || []).find((p: any) => Number(p?.id) === Number(posId));
      if (fromEmpresa?.name) return String(fromEmpresa.name);
      const fromCatalog = (this.cargos || []).find((p: any) => Number(p?.id) === Number(posId));
      if (fromCatalog?.name) return String(fromCatalog.name);
      return `#${posId}`;
    }
    return 'Sin asignar';
  }

  getDepartmentNameByEmployee(employee: any): string {
    if (!employee) return 'Sin asignar';
    const direct = employee.department?.name || employee.department_name || employee.departmentName;
    if (direct && String(direct).trim().length > 0) return String(direct);

    const depId = employee.department_id ?? employee.departmentId ?? employee.department?.id;
    if (depId != null) {
      const fromEmpresa = (this.empresa?.departments || []).find((d: any) => Number(d?.id) === Number(depId));
      if (fromEmpresa?.name) return String(fromEmpresa.name);
      const fromCatalog = (this.departamentos || []).find((d: any) => Number(d?.id) === Number(depId));
      if (fromCatalog?.name) return String(fromCatalog.name);
      return `#${depId}`;
    }
    return 'Sin asignar';
  }

  getContractorCompanyDisplayName(company: any): string {
    if (!company) return '—';
    const name = company.name || company.nombre || company.nameShort || '';
    const ruc = company.ruc || '';
    const code = company.code || '';
    const label = [ruc, name].filter(Boolean).join(' - ') || name || ruc || code || 'Empresa contratista';
    return label;
  }

  getContractorBlockDisplayName(block: any): string {
    if (!block) return '—';
    return block.name || block.nombre || block.code || `Bloque #${block.id ?? ''}`;
  }

  // Navegar a pantallas de configuración para editar catálogos/relaciones
  editCatalog(section: string, id?: number): void {
    const base = ['/dashboard', 'admin', 'configuracion', section];
    if (id != null) {
      this.router.navigate(base, { queryParams: { edit: id } });
    } else {
      this.router.navigate(base);
    }
  }

  // Helpers de normalización (a nivel de clase)
  private resolveNested(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let cur: any = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  private normalizeItemName(item: any, keys: string[]): any {
    if (!item) return item;
    const current = (item.name ?? '').toString().trim();
    if (current.length > 0) return item;
    for (const k of keys) {
      const v = this.resolveNested(item, k);
      if (v !== undefined && v !== null && String(v).trim().length > 0) {
        item.name = v;
        break;
      }
    }
    return item;
  }

  // Obtener nombre desde un catálogo por ID con múltiples alternativas
  private getNameFromCatalog(catalog: any[], id: any, altKeys: string[] = ['name', 'nombre', 'title', 'description']): string | null {
    if (!catalog || !Array.isArray(catalog)) return null;
    const nId = Number(id);
    const found = catalog.find((x: any) => Number(x?.id) === nId);
    if (!found) return null;
    for (const k of altKeys) {
      const v = this.resolveNested(found, k);
      if (v !== undefined && v !== null && String(v).trim().length > 0) return String(v);
    }
    return null;
  }

  // UI helper para saber si un item está en eliminación
  isDeletingObligation(obligation: any): boolean {
    const id = this.getObligationCatalogId(obligation);
    if (id == null) return false;
    return this.deletingObligationIds.has(Number(id));
  }

  // trackBy para listas de obligaciones en el modal
  trackById(index: number, item: any): any {
    const id = Number(item?.id);
    return isNaN(id) ? index : id;
  }

  // Formatear etiqueta visible de la obligación en el modal
  formatObligationLabel(ob: any): string {
    if (!ob) return 'Matriz legal';
    const name = ob.name || ob.title || ob.description || ob?.obligationMatrix?.name || '';
    const legal = ob.legalRegulation || ob?.obligationMatrix?.legalRegulation || '';
    const parts = [name || `#${ob.id}`];
    if (legal) parts.push(`- ${legal}`);
    return parts.join(' ');
  }

  // === Archivos por matriz legal ===
  toggleMatrixFiles(obligation: any): void {
    const matrixId = Number(obligation?.id ?? obligation?.obligation_matrix_id ?? obligation?.obligationMatrixId);
    if (isNaN(matrixId)) return;
    this.matrixFilesVisible[matrixId] = !this.matrixFilesVisible[matrixId];
    if (this.matrixFilesVisible[matrixId]) {
      this.refreshMatrixFiles(matrixId);
    }
  }

  refreshMatrixFiles(matrixId: number): void {
    if (!matrixId) return;
    this.matrixFilesLoading[matrixId] = true;
    // NO usar currentOnly=true para mostrar TODOS los archivos
    this.bomService.listFiles(matrixId).subscribe({
      next: (files) => {
        const list = Array.isArray(files) ? files : [];
        // Ordenar: más recientes primero (por updatedAt o id)
        list.sort((a: any, b: any) => {
          const da = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const db = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          if (db !== da) return db - da;
          const ia = Number(a?.id) || 0; const ib = Number(b?.id) || 0;
          return ib - ia;
        });
        this.matrixFiles[matrixId] = list;
        this.matrixFilesLoading[matrixId] = false;
        console.log(`Archivos cargados para matriz ${matrixId}:`, list.length);
      },
      error: (e) => {
        console.error('Error listando archivos de matriz', matrixId, e);
        this.matrixFiles[matrixId] = [];
        this.matrixFilesLoading[matrixId] = false;
      }
    });
    this.refreshMatrixPending(matrixId);
  }

  refreshMatrixPending(matrixId: number): void {
    if (!matrixId) return;
    this.matrixPendingLoading[matrixId] = true;
    this.bomService.listPendingUploads(matrixId).subscribe({
      next: (pending) => {
        this.matrixPending[matrixId] = pending || [];
        this.matrixPendingLoading[matrixId] = false;
      },
      error: (e) => {
        console.error('Error listando pendientes de matriz', matrixId, e);
        this.matrixPending[matrixId] = [];
        this.matrixPendingLoading[matrixId] = false;
      }
    });
  }

  cancelPendingUpload(approvalRequestId: number, matrixId: number): void {
    if (!approvalRequestId) return;
    if (!confirm('¿Cancelar esta subida pendiente? El archivo en staging será eliminado.')) return;
    this.approvalService.cancel(approvalRequestId).subscribe({
      next: () => {
        this.refreshMatrixPending(matrixId);
      },
      error: (e) => {
        console.error('No se pudo cancelar la subida pendiente', e);
        alert('No se pudo cancelar la subida pendiente.');
      }
    });
  }

  getMatrixFileUrl(file: any): string {
    const id = Number(file?.id);
    if (isNaN(id)) return '#';
    return `${environment.apiUrl}/api/obligation-matrices/files/${id}/download`;
  }

  getMatrixRelationId(obligation: any): number {
    // La relación BusinessObligationMatrix tiene su propio ID (relación por empresa)
    const relId = Number(obligation?.id ?? obligation?.relationId ?? obligation?.relation_id);
    return isNaN(relId) ? 0 : relId;
  }

  formatObligationDate(date: any): string {
    if (!date) return '—';
    try {
      // Puede llegar como array [year, month, day, ...], ISO string o timestamp
      let d: Date;
      if (Array.isArray(date)) {
        d = new Date(date[0], date[1] - 1, date[2], date[3] || 0, date[4] || 0, date[5] || 0);
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return String(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}/${d.getFullYear()}`;
    } catch {
      return String(date);
    }
  }

  toDateInputString(date: any): string | null {
    if (!date) return null;
    try {
      let d: Date;
      if (Array.isArray(date)) {
        d = new Date(date[0], date[1] - 1, date[2]);
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  }

  deleteMatrixFile(fileId: number, matrixId: number): void {
    if (!fileId) return;
    
    // Buscar el nombre del archivo para la confirmación
    const files = this.matrixFiles[matrixId] || [];
    const file = files.find(f => Number(f?.id) === Number(fileId));
    const fileName = file?.name || `Archivo #${fileId}`;
    
    if (!confirm(`¿Está seguro de eliminar el archivo "${fileName}"?`)) return;
    
    this.bomService.deleteFile(fileId).subscribe({
      next: () => {
        this.refreshMatrixFiles(matrixId);
        alert('Archivo eliminado correctamente.');
      },
      error: (e) => {
        console.error('Error al eliminar archivo:', e);
        if (e?.status === 403) {
          alert('No tienes permisos para eliminar este archivo.');
        } else if (e?.status === 404) {
          alert('El archivo no fue encontrado. Actualizando lista...');
          this.refreshMatrixFiles(matrixId);
        } else {
          const msg = e?.error?.message || 'No se pudo eliminar el archivo.';
          alert(msg);
        }
      }
    });
  }

  uploadMatrixFile(obligation: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const matrixId = this.getMatrixRelationId(obligation);
    if (!matrixId) {
      alert('No se pudo determinar el ID de la matriz legal.');
      input.value = '';
      return;
    }

    // Validar tamaño (20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. Máximo permitido: 20 MB');
      input.value = '';
      return;
    }

    // Validar tipo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const fileName = file.name.toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx');
    
    if (!isValidType) {
      alert('Solo se permiten archivos PDF y Word (.doc, .docx)');
      input.value = '';
      return;
    }

    this.matrixFilesLoading[matrixId] = true;
    this.bomService.uploadFile(matrixId, file).subscribe({
      next: () => {
        input.value = '';
        this.refreshMatrixFiles(matrixId);
        this.matrixFilesLoading[matrixId] = false;
        alert('Archivo subido correctamente.');
      },
      error: (err) => {
        console.error('Error al subir archivo:', err);
        input.value = '';
        this.matrixFilesLoading[matrixId] = false;
        
        if (err?.status === 409) {
          alert('Archivo subido con nombre único (se detectó duplicado).');
          this.refreshMatrixFiles(matrixId);
        } else if (err?.status === 403) {
          alert('No tienes permisos para subir archivos.');
        } else if (err?.status === 413) {
          alert('El archivo es demasiado grande.');
        } else {
          const msg = err?.error?.message || 'Error al subir el archivo.';
          alert(msg);
        }
      }
    });
  }

  // Abrir modal para editar los parámetros de la relación de obligación por empresa
  openEditObligationModal(obligation: any): void {
    if (!obligation) return;
    this.obligationToEdit = obligation;
    const relId = Number(obligation?.id);
    const legalRegulation = obligation?.obligationMatrix?.legalRegulation || obligation?.legalRegulation || '—';
    const entryDate = this.toDateInputString(obligation?.createdAt);
    const dueDate = this.toDateInputString(obligation?.dueDate);
    const priority = obligation?.priority || null;
    const status = obligation?.status || null;
    const observations = obligation?.observations || obligation?.description || '';
    this.editObligation = { id: relId || null, legalRegulation, entryDate, dueDate, priority, status, observations };
    this.showEditObligationModal = true;
  }

  closeEditObligationModal(): void {
    this.showEditObligationModal = false;
    this.obligationToEdit = null;
  }

  // === MODAL PARA EDITAR EMPRESA ===
  openEditEmpresaModal(): void {
    if (!this.empresa) return;

    this.editEmpresa = {
      name: this.empresa.name || '',
      ruc: this.empresa.ruc || '',
      businessType: this.empresa.businessType || '',
      active: (this.empresa.active === undefined ? true : !!this.empresa.active),
      representative_legal: this.empresa.legalRepresentative || this.empresa.representative_legal || '',
      email: this.empresa.email || '',
      phone: this.empresa.phone || '',
      secondaryPhone: this.empresa.secondaryPhone || '',
      website: this.empresa.website || '',
      address: this.empresa.address || '',
      nameShort: this.empresa.nameShort || '',
      tradeName: this.empresa.tradeName || '',
      commercialActivity: this.empresa.commercialActivity || '',
      description: this.empresa.description || ''
    };

    this.showEditEmpresaModal = true;
  }

  closeEditEmpresaModal(): void {
    this.showEditEmpresaModal = false;
  }

  saveEmpresaEdit(): void {
    if (!this.empresa?.id) return;

    this.savingEmpresa = true;

    const payload = {
      name: this.editEmpresa.name,
      ruc: this.editEmpresa.ruc,
      businessType: this.editEmpresa.businessType,
      active: !!this.editEmpresa.active,
      legalRepresentative: this.editEmpresa.representative_legal,
      email: this.editEmpresa.email,
      phone: this.editEmpresa.phone,
      secondaryPhone: this.editEmpresa.secondaryPhone,
      website: this.editEmpresa.website,
      address: this.editEmpresa.address,
      nameShort: this.editEmpresa.nameShort,
      tradeName: this.editEmpresa.tradeName,
      commercialActivity: this.editEmpresa.commercialActivity,
      description: this.editEmpresa.description
    };

    this.businessService.update(this.empresa.id, payload).subscribe({
      next: (updatedEmpresa) => {
        this.empresa = { ...this.empresa, ...updatedEmpresa };
        this.savingEmpresa = false;
        this.showEditEmpresaModal = false;
        alert('Empresa actualizada exitosamente');
        // Actualizar el título de la página
        this.title.setTitle(`Administrando: ${this.empresa.name || `Empresa #${this.empresaId}`}`);
      },
      error: (error) => {
        console.error('Error al actualizar empresa:', error);
        this.savingEmpresa = false;
        alert('Error al actualizar la empresa. Por favor, inténtelo de nuevo.');
      }
    });
  }

  saveObligationEdit(): void {
    if (!this.editObligation.id || !this.obligationToEdit) return;
    const relationId = Number(this.editObligation.id);
    // Mantener el vínculo al catálogo para no romper la relación en backend
    const catalogId = this.getObligationCatalogId(this.obligationToEdit);
    const payload: any = {
      obligationMatrix: catalogId ? { id: Number(catalogId) } : undefined,
      createdAt: this.editObligation.entryDate ? `${this.editObligation.entryDate}T00:00:00` : undefined,
      dueDate: this.editObligation.dueDate,
      priority: this.editObligation.priority,
      status: this.editObligation.status,
      observations: this.editObligation.observations,
      description: this.editObligation.observations  // compatibilidad backend
    };
    this.savingObligation = true;
    this.bomService.update(relationId, payload).subscribe({
      next: () => {
        this.savingObligation = false;
        this.showEditObligationModal = false;
        this.loadObligationMatrices();
        alert('Matriz legal actualizada exitosamente');
      },
      error: (e) => {
        console.error('Error al actualizar matriz legal (relación):', e);
        this.savingObligation = false;
        alert('No se pudo actualizar la matriz legal. Intente nuevamente.');
      }
    });
  }

  // Enriquecer arrays de la empresa con nombres desde catálogos globales si faltan
  private hydrateEmpresaArrays(): void {
    if (!this.empresa) return;

    // Departamentos
    if (Array.isArray(this.empresa.departments) && this.departamentos?.length) {
      this.empresa.departments = this.empresa.departments.map((d: any) => {
        if (typeof d === 'number') {
          const name = this.getNameFromCatalog(this.departamentos, d);
          return { id: d, name: name || `#${d}` };
        }
        if (!d?.name || String(d.name).trim().length === 0) {
          const name = this.getNameFromCatalog(this.departamentos, d?.id ?? d?.department_id ?? d?.departmentId);
          if (name) d.name = name;
        }
        return d;
      });
    }

    // Cargos (positions)
    if (Array.isArray(this.empresa.positions) && this.cargos?.length) {
      this.empresa.positions = this.empresa.positions.map((p: any) => {
        if (typeof p === 'number') {
          const name = this.getNameFromCatalog(this.cargos, p);
          return { id: p, name: name || `#${p}` };
        }
        if (!p?.name || String(p.name).trim().length === 0) {
          const name = this.getNameFromCatalog(this.cargos, p?.id ?? p?.position_id ?? p?.positionId);
          if (name) p.name = name;
        }
        return p;
      });
    }

    // Tipos de documento
    if (Array.isArray(this.empresa.type_documents) && this.tiposDocumentos?.length) {
      this.empresa.type_documents = this.empresa.type_documents.map((t: any) => {
        if (typeof t === 'number') {
          const name = this.getNameFromCatalog(this.tiposDocumentos, t);
          return { id: t, name: name || `#${t}` };
        }
        if (!t?.name || String(t.name).trim().length === 0) {
          const name = this.getNameFromCatalog(this.tiposDocumentos, t?.id ?? t?.type_document_id ?? t?.typeDocumentId);
          if (name) t.name = name;
        }
        return t;
      });
    }

    // Tipos de contrato
    if (Array.isArray(this.empresa.type_contracts) && this.tiposContratos?.length) {
      this.empresa.type_contracts = this.empresa.type_contracts.map((t: any) => {
        if (typeof t === 'number') {
          const name = this.getNameFromCatalog(this.tiposContratos, t);
          return { id: t, name: name || `#${t}` };
        }
        if (!t?.name || String(t.name).trim().length === 0) {
          const name = this.getNameFromCatalog(this.tiposContratos, t?.id ?? t?.type_contract_id ?? t?.typeContractId);
          if (name) t.name = name;
        }
        return t;
      });
    }

    // Obligaciones (matriz)
    if (Array.isArray(this.empresa.obligation_matrices) && this.obligacionesMatriz?.length) {
      this.empresa.obligation_matrices = this.empresa.obligation_matrices.map((o: any) => {
        if (typeof o === 'number') {
          const name = this.getNameFromCatalog(this.obligacionesMatriz, o);
          return { id: o, name: name || `#${o}` };
        }
        if (!o?.name || String(o.name).trim().length === 0) {
          const name = this.getNameFromCatalog(this.obligacionesMatriz, o?.id ?? o?.obligation_matrix_id ?? o?.obligationMatrixId);
          if (name) o.name = name;
        }
        return o;
      });
    }
  }

  loadObligationMatrices(): void {
    if (!this.empresaId) return;
    this.bomService.getByBusiness(this.empresaId).subscribe({
      next: (relaciones: any[]) => {
        this.empresa.obligation_matrices = Array.isArray(relaciones) ? relaciones : [];
        // Precargar conteo de archivos para todos las obligaciones
        this.preloadMatrixFileCounts(this.empresa.obligation_matrices);
      },
      error: (err) => {
        console.error('Error al cargar matriz legal de empresa:', err);
      }
    });
  }

  private preloadMatrixFileCounts(obligations: any[]): void {
    if (!Array.isArray(obligations)) return;
    obligations.forEach(ob => {
      const matrixId = this.getMatrixRelationId(ob);
      if (!matrixId || this.matrixFiles[matrixId] !== undefined) return;
      this.matrixFilesLoading[matrixId] = true;
      this.bomService.listFiles(matrixId).subscribe({
        next: (files) => {
          const list = Array.isArray(files) ? files : [];
          list.sort((a: any, b: any) => {
            const da = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const db = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return db !== da ? db - da : (Number(b?.id) || 0) - (Number(a?.id) || 0);
          });
          this.matrixFiles[matrixId] = list;
          this.matrixFilesLoading[matrixId] = false;
        },
        error: () => {
          this.matrixFiles[matrixId] = [];
          this.matrixFilesLoading[matrixId] = false;
        }
      });
    });
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Cargando datos para empresa ID:', this.empresaId);
    
    // Cargar empresa con detalles de administración (incluye todas las relaciones)
    this.businessService.getBusinessAdminDetails(this.empresaId).subscribe({
      next: (empresa: any) => {
        console.log('=== DEBUGGING EMPRESA DATA ===');
        console.log('Empresa completa:', empresa);
        console.log('=== DEBUGGING IESS ===');
        console.log('IESS data received from backend:', empresa.ieses);
        console.log('Tipo de datos IESS:', typeof empresa.ieses);
        console.log('Es array?:', Array.isArray(empresa.ieses));
        console.log('Longitud de IESS:', empresa.ieses?.length);
        
        // Verificar si existe la propiedad
        if (empresa.hasOwnProperty('ieses')) {
          console.log('✅ Propiedad ieses existe');
        } else {
          console.log('❌ Propiedad ieses NO existe');
          console.log('📋 Propiedades disponibles:', Object.keys(empresa));
        }
        
        // Verificar otras propiedades relacionadas con IESS
        console.log('🔍 Buscando propiedades relacionadas con IESS:');
        const allKeys = Object.keys(empresa);
        const iessRelated = allKeys.filter(key => key.toLowerCase().includes('ies'));
        console.log('📋 Propiedades relacionadas con IESS:', iessRelated);
        
        // Imprimir toda la estructura de la empresa para análisis
        console.log('🏢 Estructura completa de empresa:', JSON.stringify(empresa, null, 2));
        
        this.empresa = empresa;
        // Adaptar/normalizar inmediatamente las listas a objetos con {id, name}
        try {
          this.empresa = this.businessAdapter.adaptBusinessAdminDetails(this.empresa);
        } catch (e) {
          console.warn('No se pudo adaptar empresa via BusinessAdapterService:', e);
        }
        
        // Asegurar que todas las propiedades array existen (como frontend-admin)
        if (!this.empresa.departments) this.empresa.departments = [];
        if (!this.empresa.positions) this.empresa.positions = [];
        if (!this.empresa.type_documents) this.empresa.type_documents = [];
        if (!this.empresa.type_contracts) this.empresa.type_contracts = [];
        if (!this.empresa.course_certifications) this.empresa.course_certifications = [];
        if (!this.empresa.cards) this.empresa.cards = [];

        // Normalizar jornadas/horarios (backend suele devolver camelCase: workSchedules/workShifts)
        if (!this.empresa.work_schedules && (this.empresa as any).workSchedules) {
          this.empresa.work_schedules = (this.empresa as any).workSchedules;
        }
        if (!this.empresa.work_shifts && (this.empresa as any).workShifts) {
          this.empresa.work_shifts = (this.empresa as any).workShifts;
        }
        if (!this.empresa.work_schedules && (this.empresa as any).work_schedules) {
          this.empresa.work_schedules = (this.empresa as any).work_schedules;
        }
        if (!this.empresa.work_shifts && (this.empresa as any).work_shifts) {
          this.empresa.work_shifts = (this.empresa as any).work_shifts;
        }
        if (!this.empresa.work_schedules) this.empresa.work_schedules = [];
        if (!this.empresa.work_shifts) this.empresa.work_shifts = [];

        // Normalizar nombre de propiedad de IESS desde backend
        if (!this.empresa.ieses && (this.empresa as any).iessItems) {
          this.empresa.ieses = (this.empresa as any).iessItems;
        }
        if (!this.empresa.ieses && (this.empresa as any).iess) {
          this.empresa.ieses = (this.empresa as any).iess;
        }
        if (!this.empresa.ieses) {
          console.log('Inicializando array de IESS vacío');
          this.empresa.ieses = [];
        }
        // Cargar inventario por empresa (RUC) y catálogos globales
        this.loadInventoryCategories();
        this.loadInventorySuppliers();
        this.loadGlobalCategoryCatalog();
        this.loadGlobalSupplierCatalog();
        if (!this.empresa.users) this.empresa.users = [];
        if (!this.empresa.employees) this.empresa.employees = [];
        if (!this.empresa.obligation_matrices) this.empresa.obligation_matrices = [];

        // Cargar obligaciones desde el mismo endpoint que usa el módulo usuario
        // garantiza que el admin ve exactamente los mismos datos que /seguridad-industrial/matriz-legal
        this.loadObligationMatrices();
        
        // Inicializar propiedades de empresas contratistas
        if (!this.empresa.contractor_companies) this.empresa.contractor_companies = [];
        if (!this.empresa.contractor_blocks) this.empresa.contractor_blocks = [];
        
        console.log('IESS después de inicialización:', this.empresa.ieses);
        console.log('Longitud final de IESS:', this.empresa.ieses.length);

        // Normalizar nombres para que se muestren siempre, aunque vengan anidados o con otra clave
        try {
          this.empresa.departments = (this.empresa.departments || []).map((d: any) => this.normalizeItemName(d, ['name', 'department.name', 'nombre', 'title']));
          this.empresa.positions = (this.empresa.positions || []).map((p: any) => this.normalizeItemName(p, ['name', 'position.name', 'nombre', 'title', 'description']));
          this.empresa.type_documents = (this.empresa.type_documents || []).map((t: any) => this.normalizeItemName(t, ['name', 'typeDocument.name', 'nombre', 'description', 'title']));
          this.empresa.type_contracts = (this.empresa.type_contracts || []).map((t: any) => this.normalizeItemName(t, ['name', 'typeContract.name', 'nombre', 'title', 'description']));
          this.empresa.obligation_matrices = (this.empresa.obligation_matrices || []).map((o: any) => this.normalizeItemName(o, ['name', 'obligationMatrix.name', 'title', 'description']));
          this.empresa.course_certifications = (this.empresa.course_certifications || []).map((c: any) => this.normalizeItemName(c, ['name', 'nombre', 'title', 'description']));
          this.empresa.cards = (this.empresa.cards || []).map((c: any) => this.normalizeItemName(c, ['name', 'nombre', 'title', 'description']));
        } catch (e) {
          console.warn('No se pudo normalizar nombres de listas de empresa:', e);
        }
        // Enriquecer con nombres desde catálogos si están disponibles
        this.hydrateEmpresaArrays();

        console.log('=== FIN DEBUGGING ===');

        // Título dinámico del documento
        try {
          const empresaNombre = this.empresa?.name || this.empresa?.nameShort || `Empresa #${this.empresaId}`;
          this.title.setTitle(`Administrando: ${empresaNombre}`);
        } catch (e) {
          console.warn('No se pudo actualizar el título del documento', e);
        }
        
        // Cargar usuarios por separado
        this.loadUsers();
        
        // Cargar datos globales para las listas desplegables de asignación
        this.loadConfigurationData();
        // Cargar configuración de mantenimiento específica de esta empresa
        this.loadMaintenanceConfig();
        
        // Cargar todos los parámetros de mantenimiento asignados a la empresa
        this.tipoVehiculos = empresa.tipoVehiculos || [];
        this.estadoUnidades = empresa.estadoUnidades || [];
        this.marcaVehiculos = empresa.marcaVehiculos || [];
        this.claseVehiculos = empresa.claseVehiculos || [];
        this.entidadRemitentes = empresa.entidadRemitentes || [];
        this.tipoCombustibles = empresa.tipoCombustibles || [];
        this.colorVehiculos = empresa.colorVehiculos || [];
        this.transmisiones = empresa.transmisiones || [];
        this.propietarioVehiculos = empresa.propietarioVehiculos || [];
        this.tipoDocumentoVehiculos = empresa.tipoDocumentoVehiculos || [];
        this.unidadMedidas = empresa.unidadMedidas || [];
        this.ubicacionRutas = empresa.ubicacionRutas || [];
        this.paisOrigenes = empresa.paisOrigenes || [];
        this.numeroEjes = empresa.numeroEjes || [];
        this.configuracionEjes = empresa.configuracionEjes || [];

        // Gerencia de Viajes
        this.distanciaRecorrers = empresa.distanciaRecorrers || [];
        this.tipoVias = empresa.tipoVias || [];
        this.condicionClimaticas = empresa.condicionClimaticas || [];
        this.horarioCirculaciones = empresa.horarioCirculaciones || [];
        this.estadoCarreteras = empresa.estadoCarreteras || [];
        this.tipoCargas = empresa.tipoCargas || [];
        this.horaConducciones = empresa.horaConducciones || [];
        this.horaDescansos = empresa.horaDescansos || [];
        this.medioComunicaciones = empresa.medioComunicaciones || [];
        this.transportaPasajeros = empresa.transportaPasajeros || [];
        this.metodologiaRiesgos = empresa.metodologiaRiesgos || [];
        this.posiblesRiesgosVia = empresa.posiblesRiesgosVia || [];

        // Cargar catálogos globales de mantenimiento
        this.loadMaintenanceCatalogs();
        
        console.log('Datos específicos de la empresa cargados:', empresa);
        console.log('Departamentos de la empresa:', empresa.departments?.length || 0);
        console.log('Cargos de la empresa:', empresa.positions?.length || 0);
        console.log('Documentos de la empresa:', empresa.type_documents?.length || 0);
        
        this.loading = false;
        // Cargar listado de personal de esta empresa
        this.loadCompanyEmployees();
      },
      error: (error: any) => {
        console.error('Error al cargar empresa:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        console.error('Is this really an error?', error.status !== 200);
        
        // Solo mostrar error si realmente es un error (no 200)
        if (error.status !== 200) {
          this.error = `Error al cargar la empresa: ${error.message || error.status || 'Error desconocido'}`;
          this.loading = false;
        } else {
          console.log('Respuesta exitosa interpretada como error - ignorando');
        }
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsersByBusiness(this.empresaId).subscribe({
      next: (users: any) => {
        console.log('Usuarios cargados:', users);
        // Mostrar solo usuarios de la empresa (excluir administradores globales)
        this.users = (users || []).filter((u: any) => {
          const roles: string[] = Array.isArray(u?.roles) ? u.roles : [];
          return !roles.includes('ROLE_ADMIN') && !roles.includes('ROLE_SUPER_ADMIN');
        });
      },
      error: (error: any) => {
        console.error('Error al cargar usuarios:', error);
        this.users = [];
      }
    });
  }

  loadBusinessAdmins(): void {
    this.userService.getUsersByBusiness(this.empresaId).subscribe({
      next: (users: any) => {
        this.businessAdmins = (users || []).filter((u: any) => {
          const roles: string[] = Array.isArray(u?.roles) ? u.roles : [];
          return roles.includes('ROLE_ADMIN');
        });
      },
      error: () => { this.businessAdmins = []; }
    });
  }

  openAssignAdminModal(): void {
    this.showAssignAdminModal = true;
    this.selectedUserIdForAdmin = null;
    // Cargar todos los usuarios del sistema para seleccionar
    this.userAdminService.getUsers().subscribe({
      next: (users: any) => {
        // Filtrar: no mostrar usuarios que ya son admin de esta empresa
        const adminIds = new Set(this.businessAdmins.map((a: any) => a.id));
        this.allSystemUsers = (users || []).filter((u: any) => {
          const roles: string[] = Array.isArray(u?.roles) ? u.roles : [];
          return !roles.includes('ROLE_SUPER_ADMIN') && !adminIds.has(u.id);
        });
      },
      error: () => { this.allSystemUsers = []; }
    });
  }

  closeAssignAdminModal(): void {
    this.showAssignAdminModal = false;
    this.selectedUserIdForAdmin = null;
    this.allSystemUsers = [];
  }

  confirmAssignAdmin(): void {
    if (!this.selectedUserIdForAdmin || !this.empresaId) return;
    this.businessService.promoteUserToBusinessAdmin(this.empresaId, this.selectedUserIdForAdmin).subscribe({
      next: () => {
        alert('Usuario promovido a administrador de esta empresa exitosamente.');
        this.closeAssignAdminModal();
        this.loadBusinessAdmins();
        this.loadUsers();
      },
      error: (err: any) => {
        console.error('Error al promover usuario:', err);
        alert('Error al asignar administrador: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  loadConfigurationData(): void {
    console.log('Iniciando carga de datos de configuración para listas desplegables...');
    
    // Cargar cada servicio individualmente para las listas desplegables
    // Estos datos NO sobrescriben los datos específicos de la empresa
    this.loadDepartamentos();
    this.loadCargos();
    this.loadTiposDocumentos();
    this.loadTiposContratos();
    this.loadObligacionesMatriz();
    this.loadIessList();
    this.loadRoles();
    this.loadContractorCompanies();
    this.loadCourseCertifications();
    this.loadCards();
    this.loadWorkSchedules();
    this.loadWorkShifts();
  }

  loadDepartamentos(): void {
    this.departmentService.getAllDepartments().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.departamentos = data || [];
        console.log('Departamentos globales cargados para listas desplegables:', this.departamentos.length);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('Error al cargar departamentos globales:', error);
        this.departamentos = [];
      }
    });
  }

  loadCargos(): void {
    this.cargoService.getCargos().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.cargos = data || [];
        console.log('Cargos globales cargados para listas desplegables:', this.cargos.length);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('Error al cargar cargos globales:', error);
        this.cargos = [];
      }
    });
  }

  loadTiposDocumentos(): void {
    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.tiposDocumentos = data || [];
        console.log('Tipos de documentos globales cargados para listas desplegables:', this.tiposDocumentos.length);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('Error al cargar tipos de documentos globales:', error);
        this.tiposDocumentos = [];
      }
    });
  }

  loadTiposContratos(): void {
    this.typeContractService.getAllTypeContracts().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.tiposContratos = data || [];
        console.log('Tipos de contratos globales cargados para listas desplegables:', this.tiposContratos.length);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('Error al cargar tipos de contratos globales:', error);
        this.tiposContratos = [];
      }
    });
  }

  loadObligacionesMatriz(): void {
    this.obligationMatrixService.getObligationMatrices().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.obligacionesMatriz = data || [];
        console.log('Obligaciones matriz globales cargadas para listas desplegables:', this.obligacionesMatriz.length);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('Error al cargar obligaciones matriz globales:', error);
        this.obligacionesMatriz = [];
      }
    });
  }

  loadIessList(): void {
    console.log('🔄 Iniciando carga de IESS globales...');
    this.iessService.getIessItems().subscribe({
      next: (data) => {
        // Solo cargar para las listas desplegables, NO sobrescribir datos de empresa
        this.iessList = data || [];
        console.log('🛡️ IESS items globales cargados para listas desplegables:', this.iessList.length);
        console.log('🛡️ Datos IESS globales completos:', this.iessList);
        console.log('🛡️ Primer item IESS:', this.iessList[0]);
        this.hydrateEmpresaArrays();
      },
      error: (error) => {
        console.error('❌ Error al cargar IESS items globales:', error);
        this.iessList = [];
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = data || [];
        console.log('Roles cargados:', this.roles.length);
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.roles = [
          { id: 1, name: 'ROLE_ADMIN', description: 'Administrador' },
          { id: 2, name: 'ROLE_USER', description: 'Usuario' }
        ];
      }
    });
  }

  loadContractorCompanies(): void {
    this.contractorCompanyService.getAllActiveCompanies().subscribe({
      next: (data: any) => {
        this.contractorCompanies = data || [];
        console.log('Empresas contratistas globales cargadas para listas desplegables:', this.contractorCompanies.length);
      },
      error: (error: any) => {
        console.error('Error al cargar empresas contratistas globales:', error);
        this.contractorCompanies = [];
      }
    });
  }

  loadContractorBlocks(contractorCompanyId: number): void {
    if (!contractorCompanyId) {
      this.availableBlocks = [];
      return;
    }
    
    this.contractorBlockService.getActiveBlocksByCompanyId(contractorCompanyId).subscribe({
      next: (data: any) => {
        this.availableBlocks = data || [];
        console.log('Bloques cargados para empresa contratista:', this.availableBlocks.length);
      },
      error: (error: any) => {
        console.error('Error al cargar bloques:', error);
        this.availableBlocks = [];
      }
    });
  }
  // Helper: resolver ID de rol por nombre (fallback a 2 => ROLE_USER)
  private getRoleIdByName(name: string): number {
    const found = (this.roles || []).find(r => (r.name || '').toUpperCase() === (name || '').toUpperCase());
    return found && found.id != null ? Number(found.id) : 2;
  }

  // Logo de la empresa con fallback para evitar titileo por imagen faltante
  getLogoUrl(): string {
    const logo = this.empresa?.logo;
    if (!logo) {
      return 'assets/img/company-placeholder.svg';
    }

    // Normalizar: quitar backslashes, barras iniciales y extraer solo el nombre de archivo
    try {
      let normalized = String(logo).replace(/\\/g, '/').replace(/^\/+/, '');
      try { normalized = decodeURIComponent(normalized); } catch {}
      const filename = normalized.split('/').pop() || '';
      if (!filename) return 'assets/img/company-placeholder.svg';
      return `${environment.apiUrl}/api/files/logos/${filename}`;
    } catch {
      return 'assets/img/company-placeholder.svg';
    }
  }
  // === USUARIOS ===
  // === USUARIOS ===
  openCreateUserModal(): void {
    this.resetUserForm();
    this.isEditingUser = false;
    // Forzar rol "Usuario estándar" (ROLE_USER) para creación dentro de la empresa
    const roleUserId = this.getRoleIdByName('ROLE_USER')
      ?? this.getRoleIdByName('USER')
      ?? 2; // fallback común
    this.newUser.selectedRoles = [Number(roleUserId)];
    this.showCreateUserModal = true;
  }

  createUser(): void {
    if (!this.empresa?.id) {
      alert('Error: No se encontró la información de la empresa');
      return;
    }

    // Si estamos en modo edición, llamar a updateUser en su lugar
    if (this.isEditingUser) {
      this.updateUser();
      return;
    }

    const userData: CreateUserRequest = {
      name: `${this.newUser.nombres} ${this.newUser.apellidos}`,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password,
      phone: this.newUser.telefono,
      business_id: this.empresa.id,
      role_ids: this.newUser.selectedRoles.length > 0 ? this.newUser.selectedRoles : undefined
    };

    console.log('Datos del usuario a crear:', userData);
    console.log('ID de la empresa:', this.empresa.id);

    this.userService.createUser(userData).subscribe({
      next: (response) => {
        console.log('Usuario creado exitosamente:', response);
        
        // Mostrar roles asignados en el mensaje
        let message = 'Usuario creado exitosamente para la empresa';
        if (response.roles && response.roles.length > 0) {
          const roleNames = response.roles.map(role => role.name).join(', ');
          message += `\nRoles asignados: ${roleNames}`;
        }
        
        alert(message);
        this.closeUserModal();
        // Recargar los datos de la empresa
        this.loadData();
      },
      error: (error) => {
        console.error('Error al crear usuario:', error);
        console.error('Detalles del error:', error.error);
        
        let errorMessage = 'Error al crear el usuario para la empresa';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          // Verificar si es por email duplicado u otros errores comunes
          if (error.error && error.error.includes && error.error.includes('email')) {
            errorMessage = 'Este email ya está registrado en el sistema. Por favor, use otro email.';
          } else {
            errorMessage = 'Datos incorrectos. Verifique que todos los campos estén completos y válidos.';
          }
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Intente nuevamente más tarde.';
        }
        
        alert(errorMessage);
      }
    });
  }

  resetUserForm(): void {
    this.newUser = {
      nombres: '',
      apellidos: '',
      cedula: '',
      telefono: '',
      email: '',
      username: '',
      password: '',
      selectedRoles: []
    };
  }

  onRoleChange(roleId: number, event: any): void {
    if (event.target.checked) {
      if (!this.newUser.selectedRoles.includes(roleId)) {
        this.newUser.selectedRoles.push(roleId);
      }
    } else {
      this.newUser.selectedRoles = this.newUser.selectedRoles.filter(id => id !== roleId);
    }
    console.log('Roles seleccionados:', this.newUser.selectedRoles);
  }

  // Método temporal para depurar la validación del formulario
  debugFormValidation(form: any): void {
    console.log('Form valid:', form.valid);
    console.log('Form controls:', form.controls);
    console.log('Form errors:', form.errors);
    console.log('User data:', this.newUser);
    
    // Verificar cada control individualmente
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key];
      console.log(`${key}: valid=${control.valid}, value='${control.value}', errors=`, control.errors);
    });
  }

  // Validación personalizada del formulario
  isFormValid(): boolean {
    const isValid = !!(
      this.newUser.nombres &&
      this.newUser.apellidos &&
      this.newUser.email &&
      this.newUser.username &&
      this.newUser.password &&
      this.newUser.nombres.trim() !== '' &&
      this.newUser.apellidos.trim() !== '' &&
      this.newUser.email.trim() !== '' &&
      this.newUser.username.trim() !== '' &&
      this.newUser.password.trim() !== ''
    );
    
    console.log('Form validation check:', {
      nombres: this.newUser.nombres,
      apellidos: this.newUser.apellidos,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password,
      isValid: isValid
    });
    
    return isValid;
  }

  openEditUserModal(user: User): void {
    this.userToEdit = user;
    this.showUserModal = true;
  }

  onUserSaved(user: User): void {
    if (this.userToEdit) {
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index] = user;
      }
    } else {
      this.users.push(user);
    }
    this.showUserModal = false;
    this.userToEdit = null;
  }

  // === DEPARTAMENTOS ===
  openAsignDepartmentModal(): void {
    this.selectedDepartamentos = [];
    this.showAsignDepartmentModal = true;
  }

  closeAsignDepartmentModal(): void {
    this.showAsignDepartmentModal = false;
  }

  asignDepartment(): void {
    if (!this.selectedDepartamentos.length || !this.empresa?.id) return;
    
    const performAdd = async () => {
      // Si estamos en modo edición y hay un cambio, primero eliminar el original
      if (this.editingContext?.section === 'department' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedDepartamentos[0]);
        if (newId !== this.editingContext.originalId) {
          await this.businessService.removeDepartmentFromBusiness(this.empresa.id, this.editingContext.originalId).toPromise();
        }
      }
      // Agregar seleccionados (uno o varios), evitando duplicados ya asignados
      const ids = Array.from(new Set(this.selectedDepartamentos.map((n: number) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)));
      const assignedIds = new Set<number>((this.empresa?.departments || []).map((d: any) => Number(d?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        // Si está en modo edición, no volver a agregar el original
        if (this.editingContext?.section === 'department' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false;
        }
        return !assignedIds.has(id);
      });
      for (const departmentId of idsToAdd) {
        await this.businessService.addDepartmentToBusiness(this.empresa.id, Number(departmentId)).toPromise();
      }
    };

    performAdd().then(() => {
      // Refrescar vista local de forma simple
      this.loadData();
      this.selectedDepartamentos = [];
      this.showAsignDepartmentModal = false;
      this.editingContext = null;
      alert('Departamentos asignados/actualizados exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar departamentos:', error);
      alert('Error al asignar/actualizar departamentos. Por favor, inténtelo de nuevo.');
    });
  }

  removeDepartment(departmentId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este departamento de la empresa?')) {
      this.businessService.removeDepartmentFromBusiness(this.empresa.id, departmentId).subscribe({
        next: () => {
          this.empresa.departments = this.empresa.departments.filter((d: any) => d.id !== departmentId);
          alert('Departamento eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar departamento:', error);
          alert('Error al eliminar el departamento. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === CARGOS ===
  openAsignCargoModal(): void {
    this.selectedCargos = [];
    this.showAsignCargoModal = true;
  }

  asignCargo(): void {
    if (!this.selectedCargos.length || !this.empresa?.id) return;
    
    const performAdd = async () => {
      if (this.editingContext?.section === 'position' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedCargos[0]);
        if (newId !== this.editingContext.originalId) {
          await this.businessService.removePositionFromBusiness(this.empresa.id, this.editingContext.originalId).toPromise();
        }
      }
      const ids = Array.from(new Set(this.selectedCargos.map((n: number) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)));
      const assignedIds = new Set<number>((this.empresa?.positions || []).map((p: any) => Number(p?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'position' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false;
        }
        return !assignedIds.has(id);
      });
      for (const cargoId of idsToAdd) {
        await this.businessService.addPositionToBusiness(this.empresa.id, Number(cargoId)).toPromise();
      }
    };

    performAdd().then(() => {
      this.loadData();
      this.selectedCargos = [];
      this.showAsignCargoModal = false;
      this.editingContext = null;
      alert('Cargos asignados/actualizados exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar cargos:', error);
      alert('Error al asignar/actualizar cargos. Por favor, inténtelo de nuevo.');
    });
  }

  // Disparadores de edición inline
  editDepartment(dept: any): void {
    this.selectedDepartamentos = [Number(dept?.id)];
    this.editingContext = { section: 'department', originalId: Number(dept?.id) };
    this.showAsignDepartmentModal = true;
  }

  editCargo(cargo: any): void {
    this.selectedCargos = [Number(cargo?.id)];
    this.editingContext = { section: 'position', originalId: Number(cargo?.id) };
    this.showAsignCargoModal = true;
  }

  editDocument(doc: any): void {
    this.selectedTiposDocumentos = [Number(doc?.id)];
    this.editingContext = { section: 'type_document', originalId: Number(doc?.id) };
    this.showAsignDocumentModal = true;
  }

  editIess(ies: any): void {
    const match = this.iessList?.find((i: any) => Number(i?.id) === Number(ies?.id));
    this.selectedIess = [match || ies];
    this.editingContext = { section: 'iess', originalId: Number(ies?.id) };
    this.showAsignIessModal = true;
  }

  // Reemplazar relación de Matriz Legal por otra del catálogo a nivel empresa
  replaceObligation(obligation: any): void {
    const catId = this.getObligationCatalogId(obligation);
    if (!catId) return;
    this.selectedObligacionesMatriz = [Number(catId)];
    this.editingContext = { section: 'obligation', originalId: Number(catId) };
    this.showAsignObligationModal = true;
  }

  // Editar relación de Tipo de Contrato (reemplazar por otro) a nivel empresa
  editContract(contract: any): void {
    this.selectedTiposContratos = [Number(contract?.id)];
    this.editingContext = { section: 'type_contract', originalId: Number(contract?.id) };
    this.showAsignContractModal = true;
  }

  // Editar empresa contratista (reemplazo) a nivel empresa
  editContractorCompany(company: any): void {
    // Preferir la referencia desde el catálogo global si está
    const match = this.contractorCompanies?.find((c: any) => Number(c?.id) === Number(company?.id));
    this.selectedContractorCompanies = [match || company];
    this.editingContext = { section: 'contractor_company', originalId: Number(company?.id) };
    this.showAsignContractorModal = true;
  }

  removeCargo(cargoId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este cargo de la empresa?')) {
      this.businessService.removePositionFromBusiness(this.empresa.id, cargoId).subscribe({
        next: () => {
          this.empresa.positions = this.empresa.positions.filter((p: any) => p.id !== cargoId);
          alert('Cargo eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar cargo:', error);
          alert('Error al eliminar el cargo. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // Editar relación de Cursos/Certificaciones a nivel empresa
  editCourseCert(cc: any): void {
    this.selectedCourseCertifications = [Number(cc?.id)];
    this.editingContext = { section: 'course_cert', originalId: Number(cc?.id) };
    this.showAsignCourseCertModal = true;
  }

  // Editar relación de Tarjetas a nivel empresa
  editCard(card: any): void {
    this.selectedCards = [Number(card?.id)];
    this.editingContext = { section: 'card', originalId: Number(card?.id) };
    this.showAsignCardModal = true;
  }

  // === TIPOS DE DOCUMENTOS ===
  openAsignDocumentModal(): void {
    this.selectedTiposDocumentos = [];
    this.showAsignDocumentModal = true;
  }

  asignDocument(): void {
    if (!this.selectedTiposDocumentos.length || !this.empresa?.id) return;

    const performAdd = async () => {
      // Si estamos editando y hay cambio, eliminar el original primero
      if (this.editingContext?.section === 'type_document' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedTiposDocumentos[0]);
        if (newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeTypeDocumentFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }

      // IDs únicos y válidos
      const ids = Array.from(new Set(this.selectedTiposDocumentos
        .map((n: number) => Number(n))
        .filter((n: number) => !isNaN(n) && n > 0)));
      // Excluir ya asignados
      const assignedIds = new Set<number>((this.empresa?.type_documents || [])
        .map((t: any) => Number(t?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'type_document' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false; // no volver a agregar el original en modo edición
        }
        return !assignedIds.has(id);
      });
      for (const typeDocumentId of idsToAdd) {
        await this.businessService.addTypeDocumentToBusiness(this.empresa.id, Number(typeDocumentId)).toPromise();
      }
    };

    performAdd().then(() => {
      // Refrescar desde backend para consistencia
      this.loadData();
      this.selectedTiposDocumentos = [];
      this.showAsignDocumentModal = false;
      this.editingContext = null;
      alert('Tipos de documento asignados/actualizados exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar tipos de documento:', error);
      alert('Error al asignar/actualizar tipos de documento. Por favor, inténtelo de nuevo.');
    });
  }

  removeDocument(documentId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este tipo de documento de la empresa?')) {
      this.businessService.removeTypeDocumentFromBusiness(this.empresa.id, documentId).subscribe({
        next: () => {
          this.empresa.type_documents = this.empresa.type_documents.filter((t: any) => t.id !== documentId);
          alert('Tipo de documento eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar tipo de documento:', error);
          alert('Error al eliminar el tipo de documento. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === CURSOS Y CERTIFICACIONES ===
  openAsignCourseCertModal(): void {
    this.selectedCourseCertifications = [];
    this.showAsignCourseCertModal = true;
  }

  asignCourseCert(): void {
    if (!this.selectedCourseCertifications.length || !this.empresa?.id) return;

    const performAdd = async () => {
      // Si estamos editando y hay cambio, eliminar el original primero
      if (this.editingContext?.section === 'course_cert' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedCourseCertifications[0]);
        if (newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeCourseCertificationFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }

      // IDs únicos y válidos
      const ids = Array.from(new Set(this.selectedCourseCertifications
        .map((n: number) => Number(n))
        .filter((n: number) => !isNaN(n) && n > 0)));
      // Excluir ya asignados
      const assignedIds = new Set<number>((this.empresa?.course_certifications || [])
        .map((c: any) => Number(c?.id))
        .filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'course_cert' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false; // no volver a agregar el original en modo edición
        }
        return !assignedIds.has(id);
      });
      for (const courseCertificationId of idsToAdd) {
        await this.businessService.addCourseCertificationToBusiness(this.empresa.id, Number(courseCertificationId)).toPromise();
      }
    };

    performAdd().then(() => {
      // Refrescar desde backend para mantener consistencia
      this.loadData();
      this.selectedCourseCertifications = [];
      this.showAsignCourseCertModal = false;
      this.editingContext = null;
      alert('Cursos y certificaciones asignados/actualizados exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar cursos y certificaciones:', error);
      alert('Error al asignar/actualizar cursos y certificaciones. Por favor, inténtelo de nuevo.');
    });
  }

  removeCourseCert(courseCertificationId: number): void {
    if (!this.empresa?.id) return;

    if (confirm('¿Está seguro de eliminar este curso/certificación de la empresa?')) {
      this.businessService.removeCourseCertificationFromBusiness(this.empresa.id, Number(courseCertificationId)).subscribe({
        next: () => {
          this.empresa.course_certifications = (this.empresa.course_certifications || [])
            .filter((c: any) => Number(c.id) !== Number(courseCertificationId));
          alert('Curso/Certificación eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar curso/certificación:', error);
          alert('Error al eliminar el curso/certificación. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === TARJETAS ===
  openAsignCardModal(): void {
    this.selectedCards = [];
    this.showAsignCardModal = true;
  }

  asignCard(): void {
    if (!this.selectedCards.length || !this.empresa?.id) return;

    const performAdd = async () => {
      // Si estamos editando y hay cambio, eliminar el original primero
      if (this.editingContext?.section === 'card' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedCards[0]);
        if (newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeCardFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }

      // IDs únicos y válidos
      const ids = Array.from(new Set(this.selectedCards
        .map((n: number) => Number(n))
        .filter((n: number) => !isNaN(n) && n > 0)));
      // Excluir ya asignados
      const assignedIds = new Set<number>((this.empresa?.cards || [])
        .map((c: any) => Number(c?.id))
        .filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'card' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false; // no volver a agregar el original en modo edición
        }
        return !assignedIds.has(id);
      });
      for (const cardId of idsToAdd) {
        await this.businessService.addCardToBusiness(this.empresa.id, Number(cardId)).toPromise();
      }
    };

    performAdd().then(() => {
      // Refrescar desde backend para mantener consistencia
      this.loadData();
      this.selectedCards = [];
      this.showAsignCardModal = false;
      this.editingContext = null;
      alert('Tarjetas asignadas/actualizadas exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar tarjetas:', error);
      alert('Error al asignar/actualizar tarjetas. Por favor, inténtelo de nuevo.');
    });
  }

  removeCard(cardId: number): void {
    if (!this.empresa?.id) return;

    if (confirm('¿Está seguro de eliminar esta tarjeta de la empresa?')) {
      this.businessService.removeCardFromBusiness(this.empresa.id, Number(cardId)).subscribe({
        next: () => {
          this.empresa.cards = (this.empresa.cards || []).filter((c: any) => Number(c.id) !== Number(cardId));
          alert('Tarjeta eliminada exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar tarjeta:', error);
          alert('Error al eliminar la tarjeta. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === TIPOS DE CONTRATOS ===
  openAsignContractModal(): void {
    this.selectedTiposContratos = [];
    this.showAsignContractModal = true;
  }

  asignContract(): void {
    if (!this.selectedTiposContratos.length || !this.empresa?.id) return;
    
    const performAdd = async () => {
      // Si estamos editando y cambió la selección, eliminar el original primero
      if (this.editingContext?.section === 'type_contract' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedTiposContratos[0]);
        if (!isNaN(newId) && newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeTypeContractFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }

      // IDs únicos y válidos
      const ids = Array.from(new Set(this.selectedTiposContratos.map((n: number) => Number(n)).filter((n: number) => !isNaN(n) && n > 0)));
      // Excluir ya asignados y el original en modo edición
      const assignedIds = new Set<number>((this.empresa?.type_contracts || []).map((t: any) => Number(t?.id)).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'type_contract' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false;
        }
        return !assignedIds.has(id);
      });

      // Crear promesas para agregar cada tipo de contrato
      const addPromises = idsToAdd.map(typeContractId => 
        this.businessService.addTypeContractToBusiness(this.empresa.id, Number(typeContractId)).toPromise()
      );
      await Promise.all(addPromises);

      // Actualizar la vista local
      idsToAdd.forEach(selectedId => {
        const tipoSelected = this.tiposContratos.find((t: any) => Number(t.id) === Number(selectedId));
        if (tipoSelected) {
          const exists = (this.empresa.type_contracts || []).some((t: any) => Number(t.id) === Number(selectedId));
          if (!exists) {
            this.empresa.type_contracts = [...(this.empresa.type_contracts || []), tipoSelected];
          }
        }
      });
    };

    performAdd().then(() => {
      this.selectedTiposContratos = [];
      this.showAsignContractModal = false;
      this.editingContext = null;
      alert('Tipos de contrato asignados/actualizados exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar tipos de contrato:', error);
      alert('Error al asignar/actualizar tipos de contrato. Por favor, inténtelo de nuevo.');
    });
  }

  removeContract(contractId: number): void {
    if (!this.empresa?.id) return;
    
    if (confirm('¿Está seguro de eliminar este tipo de contrato de la empresa?')) {
      this.businessService.removeTypeContractFromBusiness(this.empresa.id, contractId).subscribe({
        next: () => {
          this.empresa.type_contracts = this.empresa.type_contracts.filter((t: any) => t.id !== contractId);
          alert('Tipo de contrato eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar tipo de contrato:', error);
          alert('Error al eliminar el tipo de contrato. Por favor, inténtelo de nuevo.');
        }
      });
    }
  }

  // === OBLIGACIONES ===
  openAsignObligationModal(): void {
    console.log('Abriendo modal de obligaciones');
    console.log('Catálogo de obligaciones cargado:', this.obligacionesMatriz);
    console.log('Total catálogo:', this.obligacionesMatriz.length);
    const available = this.getAvailableObligacionesMatriz();
    console.log('Disponibles para asignar (filtrados):', available);
    console.log('Cantidad disponibles:', available.length);
    this.selectedObligacionesMatriz = [];
    this.showAsignObligationModal = true;
  }

  asignObligation(): void {
    if (!this.selectedObligacionesMatriz.length || !this.empresa?.id) {
      console.warn('asignObligation: nada seleccionado o empresa sin ID', this.selectedObligacionesMatriz, this.empresa?.id);
      return;
    }

    // Si estamos en modo edición y cambió la selección, eliminar el original antes
    const performAdd = async () => {
      if (this.editingContext?.section === 'obligation' && this.editingContext.originalId != null) {
        const newId = Number(this.selectedObligacionesMatriz[0]);
        if (!isNaN(newId) && newId !== Number(this.editingContext.originalId)) {
          await this.businessService.removeObligationMatrixFromBusiness(this.empresa.id, Number(this.editingContext.originalId)).toPromise();
        }
      }

      // Asegurar números únicos
      const ids = Array.from(new Set(this.selectedObligacionesMatriz.map(n => Number(n)).filter(n => !isNaN(n) && n > 0)));
      console.log('asignObligation -> empresa:', this.empresa.id, 'catalog IDs:', ids);

      // Excluir ya asignados y excluir el original en modo edición
      const assignedIds = new Set<number>((this.empresa?.obligation_matrices || [])
        .map((o: any) => Number(this.getObligationCatalogId(o))).filter((n: number) => !isNaN(n)));
      const idsToAdd = ids.filter((id: number) => {
        if (this.editingContext?.section === 'obligation' && this.editingContext.originalId != null && id === Number(this.editingContext.originalId)) {
          return false;
        }
        return !assignedIds.has(id);
      });

      const addPromises = idsToAdd.map(obligationMatrixId =>
        this.businessService.addObligationMatrixToBusiness(this.empresa.id, Number(obligationMatrixId)).toPromise()
      );
      await Promise.all(addPromises);
    };

    performAdd().then(() => {
      this.selectedObligacionesMatriz = [];
      this.showAsignObligationModal = false;
      this.editingContext = null;
      // Recargar obligaciones desde el mismo endpoint que usa el módulo usuario
      this.loadObligationMatrices();
      alert('Matrices de obligación asignadas/actualizadas exitosamente');
    }).catch(error => {
      console.error('Error al asignar/actualizar matrices de obligación:', error);
      alert('Error al asignar/actualizar matrices de obligación. Por favor, inténtelo de nuevo.');
    });
  }

  removeObligation(obligation: any | number): void {
    if (!this.empresa?.id) return;
    const obligationId = typeof obligation === 'number' ? obligation : this.getObligationCatalogId(obligation);
    if (obligationId == null) {
      alert('No se pudo determinar el ID de la obligación a eliminar.');
      return;
    }

    // Construir detalles para confirmación
    const name = (typeof obligation === 'object') 
      ? (obligation?.name || obligation?.obligationMatrix?.name || `#${obligationId}`)
      : `#${obligationId}`;
    const legal = (typeof obligation === 'object') ? (obligation?.obligationMatrix?.legalRegulation || '') : '';
    const desc = (typeof obligation === 'object') ? (obligation?.description || obligation?.obligationMatrix?.description || '') : '';
    const confirmMsg = `¿Eliminar esta matriz legal de la empresa?\n\nNombre: ${name}\nNormativa: ${legal}\nDescripción: ${desc}`;

    if (confirm(confirmMsg)) {
      this.deletingObligationIds.add(Number(obligationId));
      this.businessService.removeObligationMatrixFromBusiness(this.empresa.id, Number(obligationId)).subscribe({
        next: () => {
          // Actualizar UI local inmediatamente
          this.empresa.obligation_matrices = (this.empresa.obligation_matrices || []).filter((o: any) => {
            const id = this.getObligationCatalogId(o);
            return Number(id) !== Number(obligationId);
          });

          // Verificación: recargar obligaciones desde endpoint directo para confirmar que persistió
          this.bomService.getByBusiness(this.empresa.id).subscribe({
            next: (relaciones: any[]) => {
              const stillThere = (relaciones || []).some((o: any) => {
                const id = this.getObligationCatalogId(o);
                return Number(id) === Number(obligationId);
              });
              if (stillThere) {
                console.warn('La obligación aún aparece tras eliminar con ID catálogo. Intentando eliminar por ID de relación...');
                const relationId = (typeof obligation === 'object') ? Number(obligation?.id) : null;
                if (relationId) {
                  this.bomService.delete(relationId).subscribe({
                    next: () => {
                      this.loadObligationMatrices();
                      alert('Matriz de obligación eliminada exitosamente (por relación).');
                      this.deletingObligationIds.delete(Number(obligationId));
                    },
                    error: (e2) => {
                      console.error('Falló eliminación por ID de relación:', e2);
                      this.deletingObligationIds.delete(Number(obligationId));
                      alert('No se pudo eliminar la relación de la matriz legal. Verifique el backend.');
                    }
                  });
                } else {
                  this.empresa.obligation_matrices = relaciones;
                  alert('La obligación sigue presente tras eliminar. Es posible que el backend espere otro ID.');
                  this.deletingObligationIds.delete(Number(obligationId));
                }
              } else {
                // Todo bien: aplicar datos frescos directamente
                this.empresa.obligation_matrices = relaciones;
                alert('Matriz de obligación eliminada exitosamente');
                this.deletingObligationIds.delete(Number(obligationId));
              }
            },
            error: (e) => {
              console.warn('No se pudo verificar desde backend; se confía en la eliminación local.', e);
              alert('Matriz de obligación eliminada exitosamente');
              this.deletingObligationIds.delete(Number(obligationId));
            }
          });
        },
        error: (error) => {
          console.error('Error al eliminar matriz de obligación:', error);
          alert('Error al eliminar la matriz de obligación. Por favor, inténtelo de nuevo.');
          this.deletingObligationIds.delete(Number(obligationId));
        }
      });
    }
  }

  // Obtiene el ID del catálogo de matriz legal independientemente de la forma del objeto
  private getObligationCatalogId(obligation: any): number | null {
    if (obligation == null) return null;
    // Priorizar el ID del catálogo si viene anidado
    const candidates = [
      obligation?.obligationMatrix?.id,
      obligation?.obligation_matrix_id,
      obligation?.obligationMatrixId,
      obligation?.id
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') {
        const n = Number(c);
        return isNaN(n) ? null : n;
      }
    }
    return null;
  }

  // === IESS ===
  openAsignIessModal(): void {
    this.selectedIess = [];
    this.showAsignIessModal = true;
  }

  asignIess(): void {
    if (!this.selectedIess.length) {
      console.log('No hay IESS seleccionados');
      return;
    }
    
    console.log('✅ Asignando IESS (selección):', this.selectedIess);

    // Si estamos editando un IESS puntual y la selección cambió, eliminar el original primero
    if (this.editingContext?.section === 'iess' && this.editingContext.originalId != null) {
      const newFirstId = Number(typeof this.selectedIess[0] === 'object' ? (this.selectedIess[0] as any)?.id : this.selectedIess[0]);
      if (!isNaN(newFirstId) && newFirstId !== Number(this.editingContext.originalId)) {
        // Eliminar el original de la lista de la empresa
        this.empresa.ieses = (this.empresa.ieses || []).filter((i: any) => Number(i?.id) !== Number(this.editingContext!.originalId));
      }
    }

    // La selección puede venir como objetos completos (preferido) o IDs. Soportamos ambos.
    const toAssign = this.selectedIess.map(sel => {
      if (sel && typeof sel === 'object') return sel; // ya es el objeto IESS
      const idNum = Number(sel);
      return this.iessList.find((i: any) => Number(i.id) === idNum);
    }).filter(Boolean);

    // Agregar nuevos elementos evitando duplicados
    toAssign.forEach((iessSelected: any) => {
      const exists = (this.empresa.ieses || []).find((i: any) => Number(i.id) === Number(iessSelected.id));
      if (!exists) {
        console.log('✅ Agregando IESS a empresa:', iessSelected.description || iessSelected.name);
        this.empresa.ieses.push(iessSelected);
      }
    });
    
    console.log('✅ IESS finales en empresa:', this.empresa.ieses);
    
    this.selectedIess = [];
    this.showAsignIessModal = false;
    this.editingContext = null;
    
    // Guardar cambios en backend
    this.saveIessChanges();
    
    console.log('✅ Modal cerrado, empresa actualizada');
  }

  trackByIessId(index: number, iess: any): number {
    return iess.id;
  }

  removeIess(iessId: number): void {
    this.empresa.ieses = this.empresa.ieses.filter((i: any) => i.id !== iessId);
    
    // Guardar los cambios en el backend
    this.saveIessChanges();
  }
  
  // Función para obtener IESS disponibles (no asignados a la empresa)
  getAvailableIess(): any[] {
    if (!Array.isArray(this.iessList)) return [];
    const assignedIds = new Set<number>((this.empresa?.ieses || [])
      .map((i: any) => Number(i?.id))
      .filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedIess || [])
      .map((sel: any) => Number(typeof sel === 'object' ? sel?.id : sel))
      .filter((n: number) => !isNaN(n)));
    const result = this.iessList.filter((iess: any) => {
      const id = Number(iess?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando, incluir el original al inicio
    if (this.editingContext?.section === 'iess' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.iessList.find((i: any) => Number(i?.id) === originalId);
      if (orig && !result.some((i: any) => Number(i?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  // Función para verificar si es array (para usar en template)
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  // Función para obtener nombre de visualización de IESS
  getIessDisplayName(iess: any): string {
    if (!iess) return 'IESS desconocido';
    
    // Simplemente mostrar la descripción
    return iess.description || iess.name || `IESS #${iess.id}`;
  }

  // Función para obtener matrices de obligaciones disponibles (no asignadas a la empresa)
  getAvailableObligacionesMatriz(): any[] {
    // Catálogo global (configuración general)
    if (!Array.isArray(this.obligacionesMatriz)) return [];

    // Relaciones actuales de esta empresa únicamente
    const assigned = Array.isArray(this.empresa?.obligation_matrices) ? this.empresa.obligation_matrices : [];
    const assignedIds = new Set<number>(
      assigned
        .map((rel: any) => Number(this.getObligationCatalogId(rel)))
        .filter((v: number) => !isNaN(v) && v > 0)
    );

    // Selecciones en curso (para que "desaparezcan" al ir eligiendo)
    const selectedIds = new Set<number>(
      (this.selectedObligacionesMatriz || [])
        .map((v: any) => Number(v))
        .filter((n: number) => !isNaN(n) && n > 0)
    );

    // Filtrar por no asignados y deduplicar por id de catálogo (evitar colisiones visuales)
    const seen = new Set<number>();
    const result: any[] = [];
    for (const item of this.obligacionesMatriz) {
      const id = Number(item?.id);
      if (isNaN(id) || id <= 0) continue;
      if (assignedIds.has(id)) continue; // ya asignado a esta empresa
      if (selectedIds.has(id)) continue; // ya seleccionado en el modal
      if (seen.has(id)) continue; // evitar duplicados en catálogo
      seen.add(id);
      // asegurar una etiqueta mínima para visualización
      item.name = item.name || item.title || item.description || `Matriz #${id}`;
      result.push(item);
    }

    // Si estamos editando, incluir el original al inicio
    if (this.editingContext?.section === 'obligation' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.obligacionesMatriz.find((o: any) => Number(o?.id) === originalId);
      if (orig && !result.some((o: any) => Number(o?.id) === originalId)) {
        result.unshift(orig);
      }
    }

    return result;
  }
  
  // === DISPONIBLES (no asignados y no seleccionados) PARA TODOS LOS CATÁLOGOS ===
  getAvailableDepartamentos(): any[] {
    if (!Array.isArray(this.departamentos)) return [];
    const assignedIds = new Set<number>((this.empresa?.departments || [])
      .map((d: any) => Number(d?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedDepartamentos || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.departamentos.filter((d: any) => {
      const id = Number(d?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando un departamento, incluir el original en la lista
    if (this.editingContext?.section === 'department' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.departamentos.find((d: any) => Number(d?.id) === originalId);
      if (orig && !result.some((d: any) => Number(d?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  getAvailableCargos(): any[] {
    if (!Array.isArray(this.cargos)) return [];
    const assignedIds = new Set<number>((this.empresa?.positions || [])
      .map((p: any) => Number(p?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedCargos || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.cargos.filter((p: any) => {
      const id = Number(p?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando un cargo, incluir el original en la lista
    if (this.editingContext?.section === 'position' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.cargos.find((p: any) => Number(p?.id) === originalId);
      if (orig && !result.some((p: any) => Number(p?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  getAvailableTiposDocumentos(): any[] {
    if (!Array.isArray(this.tiposDocumentos)) return [];
    const assignedIds = new Set<number>((this.empresa?.type_documents || [])
      .map((t: any) => Number(t?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedTiposDocumentos || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.tiposDocumentos.filter((t: any) => {
      const id = Number(t?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando un tipo de documento, incluir el original en la lista
    if (this.editingContext?.section === 'type_document' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.tiposDocumentos.find((t: any) => Number(t?.id) === originalId);
      if (orig && !result.some((t: any) => Number(t?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  getAvailableTiposContratos(): any[] {
    if (!Array.isArray(this.tiposContratos)) return [];
    const assignedIds = new Set<number>((this.empresa?.type_contracts || [])
      .map((t: any) => Number(t?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedTiposContratos || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.tiposContratos.filter((t: any) => {
      const id = Number(t?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando un tipo de contrato, incluir el original en la lista
    if (this.editingContext?.section === 'type_contract' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.tiposContratos.find((t: any) => Number(t?.id) === originalId);
      if (orig && !result.some((t: any) => Number(t?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  // Disponibles para Cursos y Certificaciones (no asignados/seleccionados)
  getAvailableCourseCertifications(): any[] {
    if (!Array.isArray(this.cursosCertificaciones)) return [];
    const assignedIds = new Set<number>((this.empresa?.course_certifications || [])
      .map((c: any) => Number(c?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedCourseCertifications || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.cursosCertificaciones.filter((c: any) => {
      const id = Number(c?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando, incluir el original
    if (this.editingContext?.section === 'course_cert' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.cursosCertificaciones.find((c: any) => Number(c?.id) === originalId);
      if (orig && !result.some((c: any) => Number(c?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  // Disponibles para Tarjetas (no asignados/seleccionados)
  getAvailableCards(): any[] {
    if (!Array.isArray(this.tarjetas)) return [];
    const assignedIds = new Set<number>((this.empresa?.cards || [])
      .map((c: any) => Number(c?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedCards || [])
      .map((n: number) => Number(n)).filter((n: number) => !isNaN(n)));
    const result = this.tarjetas.filter((c: any) => {
      const id = Number(c?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando, incluir el original
    if (this.editingContext?.section === 'card' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.tarjetas.find((c: any) => Number(c?.id) === originalId);
      if (orig && !result.some((c: any) => Number(c?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }

  getAvailableContractorCompanies(): any[] {
    if (!Array.isArray(this.contractorCompanies)) return [];
    const assignedIds = new Set<number>((this.empresa?.contractor_companies || [])
      .map((c: any) => Number(c?.id)).filter((n: number) => !isNaN(n)));
    const selectedIds = new Set<number>((this.selectedContractorCompanies || [])
      .map((c: any) => Number(c?.id)).filter((n: number) => !isNaN(n)));
    const result = this.contractorCompanies.filter((c: any) => {
      const id = Number(c?.id);
      return !isNaN(id) && !assignedIds.has(id) && !selectedIds.has(id);
    });
    // Si estamos editando una empresa contratista, incluir la original
    if (this.editingContext?.section === 'contractor_company' && this.editingContext.originalId != null) {
      const originalId = Number(this.editingContext.originalId);
      const orig = this.contractorCompanies.find((c: any) => Number(c?.id) === originalId);
      if (orig && !result.some((c: any) => Number(c?.id) === originalId)) {
        result.unshift(orig);
      }
    }
    return result;
  }
  
  // Persist IESS changes to backend
  saveIessChanges(): void {
    console.log('Guardando cambios de IESS...');
    console.log('IESS actuales en empresa:', this.empresa.ieses);
    
    const configurations = {
      iessItems: this.empresa.ieses
    };
    
    console.log('Configuraciones a enviar:', configurations);
    
    this.businessService.updateBusinessConfigurations(this.empresaId, configurations).subscribe({
      next: (updatedBusiness: any) => {
        console.log('IESS guardados correctamente. Respuesta:', updatedBusiness);
        // Actualizar los datos locales con la respuesta del servidor (normalizando nombres)
        const updatedIess = updatedBusiness?.ieses || updatedBusiness?.iessItems || updatedBusiness?.iess;
        if (updatedIess) {
          this.empresa.ieses = updatedIess;
          console.log('IESS actualizados desde servidor:', this.empresa.ieses);
        }
        // Importante: recargar completamente los datos de la empresa porque
        // el endpoint de actualización devuelve un Business con @JsonIgnore en iessItems
        // y podría no incluir la lista; así garantizamos consistencia visual.
        this.loadData();
      },
      error: (error: any) => {
        console.error('Error al guardar IESS:', error);
        // Recargar los datos en caso de error para mantener consistencia
        this.loadData();
      }
    });
  }
  
  

  // === EMPRESAS CONTRATISTAS ===
  openAsignContractorModal(): void {
    this.selectedContractorCompanies = [];
    this.selectedBlocks = [];
    this.availableBlocks = [];
    this.showAsignContractorModal = true;
  }

  onContractorCompanyChange(): void {
    // Limpiar bloques seleccionados cuando cambian las empresas contratistas
    this.selectedBlocks = [];
    this.availableBlocks = [];
    
    // Cargar bloques de todas las empresas contratistas seleccionadas
    if (this.selectedContractorCompanies.length > 0) {
      this.selectedContractorCompanies.forEach(company => {
        this.loadContractorBlocks(company.id);
      });
    }
  }

  asignContractor(): void {
    if (!this.selectedContractorCompanies.length || !this.empresa?.id) return;
    
    console.log('Agregando empresas contratistas:', this.selectedContractorCompanies);
    console.log('Bloques seleccionados:', this.selectedBlocks);
    
    // Inicializar arrays si no existen
    if (!this.empresa.contractor_companies) {
      this.empresa.contractor_companies = [];
    }
    if (!this.empresa.contractor_blocks) {
      this.empresa.contractor_blocks = [];
    }
    
    // Si estamos editando una empresa contratista y cambió la selección, eliminar la original primero
    if (this.editingContext?.section === 'contractor_company' && this.editingContext.originalId != null) {
      const newFirst = this.selectedContractorCompanies[0];
      const newId = Number(newFirst?.id);
      if (!isNaN(newId) && newId !== Number(this.editingContext.originalId)) {
        // Remover la empresa contratista original
        this.empresa.contractor_companies = (this.empresa.contractor_companies || []).filter((c: any) => Number(c?.id) !== Number(this.editingContext!.originalId));
        // Remover bloques asociados a esa empresa (si los hay)
        this.empresa.contractor_blocks = (this.empresa.contractor_blocks || []).filter((block: any) => 
          Number(block?.contractorCompanyId) !== Number(this.editingContext!.originalId) &&
          Number(block?.contractor_company_id) !== Number(this.editingContext!.originalId)
        );
      }
    }

    // Agregar las nuevas empresas contratistas (evitar duplicados)
    this.selectedContractorCompanies.forEach(newCompany => {
      const exists = this.empresa.contractor_companies?.some((existingCompany: any) => 
        existingCompany.id === newCompany.id
      );
      if (!exists) {
        this.empresa.contractor_companies?.push(newCompany);
      }
    });
    
    // Agregar los nuevos bloques (evitar duplicados)
    this.selectedBlocks.forEach(newBlock => {
      const exists = this.empresa.contractor_blocks?.some((existingBlock: any) => 
        existingBlock.id === newBlock.id
      );
      if (!exists) {
        this.empresa.contractor_blocks?.push(newBlock);
      }
    });
    
    // Guardar en backend
    this.saveContractorChanges();
    
    // Cerrar modal y limpiar selecciones
    this.selectedContractorCompanies = [];
    this.selectedBlocks = [];
    this.availableBlocks = [];
    this.showAsignContractorModal = false;
    
    alert('Empresas contratistas agregadas exitosamente');
  }

  removeContractor(): void {
    if (confirm('¿Está seguro de eliminar todas las empresas contratistas asignadas y todos sus bloques?')) {
      this.empresa.contractor_companies = [];
      this.empresa.contractor_blocks = [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Empresas contratistas eliminadas exitosamente');
    }
  }

  removeSpecificContractor(companyId: number): void {
    const company = this.empresa.contractor_companies?.find((c: any) => c.id === companyId);
    if (company && confirm(`¿Está seguro de eliminar la empresa contratista "${company.name}"?`)) {
      // Remover la empresa contratista
      this.empresa.contractor_companies = this.empresa.contractor_companies?.filter((c: any) => c.id !== companyId) || [];
      
      // Remover todos los bloques de esa empresa contratista
      this.empresa.contractor_blocks = this.empresa.contractor_blocks?.filter((block: any) => 
        block.contractorCompanyId !== companyId && 
        block.contractor_company_id !== companyId
      ) || [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Empresa contratista eliminada exitosamente');
    }
  }

  removeContractorBlock(blockId: number): void {
    if (confirm('¿Está seguro de eliminar este bloque de la empresa?')) {
      this.empresa.contractor_blocks = this.empresa.contractor_blocks?.filter((block: any) => block.id !== blockId) || [];
      
      // Guardar cambios en backend
      this.saveContractorChanges();
      
      alert('Bloque eliminado exitosamente');
    }
  }

  saveContractorChanges(): void {
    console.log('Guardando cambios de empresas contratistas...');
    console.log('Empresas contratistas actuales:', this.empresa.contractor_companies);
    console.log('Bloques actuales:', this.empresa.contractor_blocks);
    
    const configurations = {
      contractorCompanies: this.empresa.contractor_companies,
      contractorBlocks: this.empresa.contractor_blocks
    };
    
    console.log('Configuraciones a enviar:', configurations);
    
    this.businessService.updateBusinessConfigurations(this.empresaId, configurations).subscribe({
      next: (updatedBusiness: any) => {
        console.log('Empresas contratistas guardadas correctamente. Respuesta:', updatedBusiness);
        // Actualizar los datos locales con la respuesta del servidor
        if (updatedBusiness?.contractor_companies) {
          this.empresa.contractor_companies = updatedBusiness.contractor_companies;
        }
        if (updatedBusiness?.contractor_blocks) {
          this.empresa.contractor_blocks = updatedBusiness.contractor_blocks;
        }
      },
      error: (error: any) => {
        console.error('Error al guardar empresas contratistas:', error);
        // Recargar los datos en caso de error para mantener consistencia
        this.loadData();
      }
    });
  }

  // Función para obtener todas las empresas contratistas como string
  getContractorCompaniesDisplayNames(): string {
    if (!this.empresa.contractor_companies || this.empresa.contractor_companies.length === 0) {
      return 'Sin empresas contratistas';
    }
    return this.empresa.contractor_companies
      .map((company: any) => this.getContractorCompanyDisplayName(company))
      .join(', ');
  }

  // Función para verificar si hay empresas contratistas configuradas
  hasContractorCompanies(): boolean {
    return this.empresa.contractor_companies && this.empresa.contractor_companies.length > 0;
  }


  // === GESTIÓN DE USUARIOS ===
  editUser(user: any): void {
    // Redirigir a la edición del módulo principal de usuarios
    if (!user?.id) { return; }
    this.router.navigate(['/dashboard', 'admin', 'usuarios', 'editar', user.id]);
  }

  // Método para actualizar usuario
  updateUser(): void {
    if (!this.editingUserId) {
      console.error('No hay ID de usuario para actualizar');
      return;
    }

    const userData: CreateUserRequest = {
      id: this.editingUserId || undefined, // Convertir null a undefined
      name: `${this.newUser.nombres} ${this.newUser.apellidos}`,
      email: this.newUser.email,
      username: this.newUser.username,
      password: this.newUser.password || '', // Incluir password aunque sea vacío
      phone: this.newUser.telefono,
      business_id: this.empresa.id,
      role_ids: this.newUser.selectedRoles.length > 0 ? this.newUser.selectedRoles : undefined
    };

    console.log('Actualizando usuario:', userData);

    this.userService.updateUser(userData).subscribe({
      next: (response) => {
        console.log('Usuario actualizado exitosamente:', response);
        alert('Usuario actualizado exitosamente');
        this.closeUserModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error al actualizar usuario:', error);
        let errorMessage = 'Error al actualizar el usuario. Por favor, verifique los datos.';
        
        if (error.status === 400) {
          errorMessage = 'Los datos del usuario no son válidos. Verifique email, username y teléfono.';
        } else if (error.status === 404) {
          errorMessage = 'El usuario no fue encontrado.';
        } else if (error.status === 409) {
          errorMessage = 'El email o username ya están en uso por otro usuario.';
        } else if (error.status === 403) {
          errorMessage = 'No tiene permisos para actualizar este usuario.';
        } else if (error.status === 500) {
          errorMessage = 'Error del servidor. Inténtelo más tarde.';
        }
        
        alert(errorMessage);
      }
    });
  }

  // Método para eliminar usuario
  deleteUser(user: any): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${user.name}?`)) {
      console.log('Intentando eliminar usuario con ID:', user.id);
      
      // Debug: Verificar información del usuario actual
      const currentUser = localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken');
      console.log('Usuario actual en localStorage:', currentUser);
      console.log('Token disponible:', !!authToken);
      
      this.userService.deleteUser(user.id).subscribe({
        next: (response) => {
          console.log('Usuario eliminado exitosamente:', response);
          alert('Usuario eliminado exitosamente');
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          console.error('Detalles completos del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          
          let errorMessage = 'Error al eliminar el usuario.';
          
          if (error.status === 400) {
            // Error 400 puede ser problema de restricciones de base de datos
            if (error.error && error.error.message && error.error.message.includes('foreign key constraint')) {
              errorMessage = 'No se puede eliminar el usuario porque tiene sesiones activas o datos relacionados. El usuario será eliminado ahora que se han limpiado sus dependencias.';
            } else {
              errorMessage = 'No se puede eliminar el usuario. Verifique que el usuario no tenga dependencias activas.';
            }
          } else if (error.status === 404) {
            errorMessage = 'El usuario no fue encontrado.';
          } else if (error.status === 403) {
            errorMessage = 'No tiene permisos para eliminar este usuario.';
          } else if (error.status === 500) {
            errorMessage = 'Error del servidor. Inténtelo más tarde.';
          }
          
          alert(errorMessage);
        }
      });
    }
  }

  // Método para cerrar el modal de usuario
  closeUserModal(): void {
    this.showCreateUserModal = false;
    this.isEditingUser = false;
    this.editingUserId = null;
    this.resetUserForm();
  }

  // Método para abrir modal de crear empleado
  openCreateEmployeeModal() {
    console.log('Abrir modal de crear empleado');
    // TODO: Esta funcionalidad se implementará en otra pantalla para gestión de empleados
    alert('La gestión de empleados se realizará en el módulo de Recursos Humanos');
  }

  // === APROBACIONES ===
  loadApprovals(): void {
    if (!this.empresaId) return;
    this.approvalsLoading = true;
    this.approvalsError = null;
    // No forzar estado desde el servicio para evitar discrepancias con el backend
    this.approvalService.listByBusiness(this.empresaId).subscribe({
      next: (data) => {
        // Aceptar array directo o respuestas paginadas/objeto
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray((data as any).content)) list = (data as any).content;
        else if (data && Array.isArray((data as any).items)) list = (data as any).items;
        else if (data && Array.isArray((data as any).data)) list = (data as any).data;
        else list = [];
        this.approvals = list;
        console.log('Aprobaciones recibidas (total):', this.approvals.length, this.approvals);
        // Calcular pendientes considerando múltiples nombres/campos de estado
        this.pendingApprovals = (this.approvals || []).filter((x: any) => this.pendingStatuses.has(this.getStatus(x)));
        console.log('Aprobaciones pendientes detectadas:', this.pendingApprovals.length, this.pendingApprovals.map(x => ({ id: x?.id, status: this.getStatus(x), type: x?.type })));
        this.approvalsLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar aprobaciones:', err);
        this.approvals = [];
        this.pendingApprovals = [];
        this.approvalsError = 'No se pudieron cargar las solicitudes de aprobación.';
        this.approvalsLoading = false;
      }
    });
  }

  approveRequest(req: any): void {
    if (!req?.id) return;
    this.approvalService.approve(Number(req.id)).subscribe({
      next: () => {
        this.loadApprovals();
        this.loadData();
        alert('Solicitud aprobada y aplicada.');
      },
      error: (err) => {
        console.error('Error al aprobar solicitud:', err);
        alert('No se pudo aprobar la solicitud.');
      }
    });
  }

  rejectRequest(req: any): void {
    if (!req?.id) return;
    this.approvalService.reject(Number(req.id)).subscribe({
      next: () => {
        this.loadApprovals();
        alert('Solicitud rechazada.');
      },
      error: (err) => {
        console.error('Error al rechazar solicitud:', err);
        alert('No se pudo rechazar la solicitud.');
      }
    });
  }

  // === Inventario por empresa (categorías y proveedores) ===
  private getBusinessRuc(): string | null {
    const ruc = this.empresa?.ruc;
    return (typeof ruc === 'string' && ruc.trim().length > 0) ? String(ruc).trim() : null;
  }

  loadInventoryCategories(): void {
    const ruc = this.getBusinessRuc();
    console.log('[INVENTORY] Cargando categorías para RUC:', ruc);
    if (!ruc) { this.inventoryCategories = []; return; }
    this.invCatLoading = true; this.invCatError = null; this.invCatOk = null;
    this.inventoryCategoryService.list(ruc).subscribe({
      next: (data) => {
        this.inventoryCategories = Array.isArray(data) ? data : [];
        console.log('[INVENTORY] Categorías cargadas:', this.inventoryCategories.length, this.inventoryCategories);
        console.log('[INVENTORY] Categorías disponibles (active !== true):', this.availableInventoryCategories());
        console.log('[INVENTORY] Categorías activas (active === true):', this.activeInventoryCategories());
        this.invCatLoading = false;
      },
      error: (err) => {
        console.error('[INVENTORY] Error cargando categorías:', err);
        this.inventoryCategories = [];
        this.invCatLoading = false;
        this.invCatError = err?.error?.message || 'No se pudieron cargar las categorías';
      }
    });
  }

  loadInventorySuppliers(): void {
    const ruc = this.getBusinessRuc();
    console.log('[INVENTORY] Cargando proveedores para RUC:', ruc);
    if (!ruc) { this.inventorySuppliers = []; return; }
    this.invSupLoading = true; this.invSupError = null; this.invSupOk = null;
    this.inventorySupplierService.list(ruc).subscribe({
      next: (data) => {
        this.inventorySuppliers = Array.isArray(data) ? data : [];
        console.log('[INVENTORY] Proveedores cargados:', this.inventorySuppliers.length, this.inventorySuppliers);
        console.log('[INVENTORY] Proveedores disponibles (active !== true):', this.availableInventorySuppliers());
        console.log('[INVENTORY] Proveedores activos (active === true):', this.activeInventorySuppliers());
        this.invSupLoading = false;
      },
      error: (err) => {
        console.error('[INVENTORY] Error cargando proveedores:', err);
        this.inventorySuppliers = [];
        this.invSupLoading = false;
        this.invSupError = err?.error?.message || 'No se pudieron cargar los proveedores';
      }
    });
  }

  createInventoryCategory(): void {
    const ruc = this.getBusinessRuc();
    const name = (this.newCategoryName || '').trim();
    if (!ruc || !name) return;
    this.invCatOk = null; this.invCatError = null; this.invCatLoading = true;
    this.inventoryCategoryService.create(ruc, { name, description: (this.newCategoryDescription || '').trim() }).subscribe({
      next: () => { this.newCategoryName = ''; this.newCategoryDescription = ''; this.invCatOk = 'Categoría creada'; this.loadInventoryCategories(); },
      error: (err) => { this.invCatLoading = false; this.invCatError = err?.error?.message || 'No se pudo crear la categoría'; }
    });
  }

  createInventorySupplier(): void {
    const ruc = this.getBusinessRuc();
    const name = (this.newSupplier?.name || '').trim();
    if (!ruc || !name) return;
    this.invSupOk = null; this.invSupError = null; this.invSupLoading = true;
    const payload: InventorySupplier = {
      name,
      ruc: (this.newSupplier.ruc || '').trim() || undefined,
      phone: (this.newSupplier.phone || '').trim() || undefined,
      email: (this.newSupplier.email || '').trim() || undefined,
      address: (this.newSupplier.address || '').trim() || undefined
    };
    this.inventorySupplierService.create(ruc, payload).subscribe({
      next: () => { this.newSupplier = { name: '', ruc: '', phone: '', email: '', address: '' }; this.invSupOk = 'Proveedor creado'; this.loadInventorySuppliers(); },
      error: (err) => { this.invSupLoading = false; this.invSupError = err?.error?.message || 'No se pudo crear el proveedor'; }
    });
  }


  updateInventoryCategoryActive(c: InventoryCategory, active: boolean): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !c?.id) return;
    this.invCatLoading = true; this.invCatError = null; this.invCatOk = null;
    const payload: InventoryCategory = { name: c.name, description: c.description, active } as InventoryCategory;
    this.inventoryCategoryService.update(ruc, Number(c.id), payload).subscribe({
      next: () => { this.invCatOk = active ? 'Categoría activada' : 'Categoría desactivada'; this.loadInventoryCategories(); },
      error: (err) => { this.invCatLoading = false; this.invCatError = err?.error?.message || 'No se pudo actualizar la categoría'; }
    });
  }

  deleteInventoryCategory(c: InventoryCategory): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !c?.id) return;
    if (!confirm('¿Eliminar esta categoría?')) return;
    this.invCatLoading = true; this.invCatError = null; this.invCatOk = null;
    this.inventoryCategoryService.delete(ruc, Number(c.id)).subscribe({
      next: () => { this.loadInventoryCategories(); },
      error: (err) => { this.invCatLoading = false; this.invCatError = err?.error?.message || 'No se pudo eliminar la categoría'; }
    });
  }

  updateInventorySupplierActive(s: InventorySupplier, active: boolean): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !s?.id) return;
    this.invSupLoading = true; this.invSupError = null; this.invSupOk = null;
    const payload: InventorySupplier = { name: s.name, ruc: s.ruc, phone: s.phone, email: s.email, address: s.address, active } as InventorySupplier;
    this.inventorySupplierService.update(ruc, Number(s.id), payload).subscribe({
      next: () => { this.invSupOk = active ? 'Proveedor activado' : 'Proveedor desactivado'; this.loadInventorySuppliers(); },
      error: (err) => { this.invSupLoading = false; this.invSupError = err?.error?.message || 'No se pudo actualizar el proveedor'; }
    });
  }

  deleteInventorySupplier(s: InventorySupplier): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !s?.id) return;
    if (!confirm('¿Eliminar este proveedor?')) return;
    this.invSupLoading = true; this.invSupError = null; this.invSupOk = null;
    this.inventorySupplierService.delete(ruc, Number(s.id)).subscribe({
      next: () => { this.loadInventorySuppliers(); },
      error: (err) => { this.invSupLoading = false; this.invSupError = err?.error?.message || 'No se pudo eliminar el proveedor'; }
    });
  }

  // Abrir configuración con la empresa actual como activa
  openInventoryCategoriesConfig(): void {
    const id = Number(this.empresa?.id);
    const ruc = String(this.empresa?.ruc || '');
    if (id && ruc) this.businessCtx.setActiveBusiness({ id, ruc, name: String(this.empresa?.name || '') });
    this.router.navigate(['/dashboard','admin','configuracion','inventario-categorias']);
  }

  openInventorySuppliersConfig(): void {
    const id = Number(this.empresa?.id);
    const ruc = String(this.empresa?.ruc || '');
    if (id && ruc) this.businessCtx.setActiveBusiness({ id, ruc, name: String(this.empresa?.name || '') });
    this.router.navigate(['/dashboard','admin','configuracion','inventario-proveedores']);
  }

  // Activar desde lista desplegable (similar a asignar en Cargos)
  activateSelectedCategory(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || this.selectedCategoryId == null) return;
    const c = (this.inventoryCategories || []).find(x => Number(x?.id) === Number(this.selectedCategoryId));
    if (!c) { this.invCatError = 'Categoría no encontrada en la empresa'; return; }
    if (c.active === true) { this.invCatOk = 'Categoría ya asignada'; return; }
    this.updateInventoryCategoryActive(c, true);
    this.selectedCategoryId = null;
  }

  activateSelectedSupplier(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || this.selectedSupplierId == null) return;
    const s = (this.inventorySuppliers || []).find(x => Number(x?.id) === Number(this.selectedSupplierId));
    if (!s) { this.invSupError = 'Proveedor no encontrado en la empresa'; return; }
    if (s.active === true) { this.invSupOk = 'Proveedor ya asignado'; return; }
    this.updateInventorySupplierActive(s, true);
    this.selectedSupplierId = null;
  }

  // Solo activos para mostrar en listas
  activeInventoryCategories(): InventoryCategory[] {
    try {
      return (this.inventoryCategories || []).filter(c => c && c.active === true);
    } catch { return []; }
  }

  activeInventorySuppliers(): InventorySupplier[] {
    try {
      return (this.inventorySuppliers || []).filter(s => s && s.active === true);
    } catch { return []; }
  }

  // Disponibles para asignar (no activos todavía)
  availableInventoryCategories(): InventoryCategory[] {
    try {
      return (this.inventoryCategories || []).filter(c => !c || c.active !== true);
    } catch { return []; }
  }

  availableInventorySuppliers(): InventorySupplier[] {
    try {
      return (this.inventorySuppliers || []).filter(s => !s || s.active !== true);
    } catch { return []; }
  }

  availableGlobalCategoryCatalog(): Array<{ name: string; description?: string }> {
    try {
      const active = new Set(
        (this.activeInventoryCategories() || [])
          .map(c => String(c?.name || '').trim().toLowerCase())
          .filter(v => v && v.length > 0)
      );
      return (this.globalCategoryCatalog || []).filter(g => {
        const nm = String(g?.name || '').trim().toLowerCase();
        return nm && !active.has(nm);
      });
    } catch { return []; }
  }

  availableGlobalSupplierCatalog(): Array<{ name: string; ruc?: string; phone?: string; email?: string; address?: string }> {
    try {
      const keyFn = (o: any) => {
        const r = String(o?.ruc || '').trim();
        if (r) return 'R:' + r;
        const n = String(o?.name || '').trim().toLowerCase();
        return 'N:' + n;
      };
      const activeKeys = new Set((this.activeInventorySuppliers() || []).map(s => keyFn(s)));
      return (this.globalSupplierCatalog || []).filter(g => !activeKeys.has(keyFn(g)));
    } catch { return []; }
  }

  // Editar categoría
  startEditCategory(c: InventoryCategory): void {
    if (!c || !c.id) return;
    this.editingCategoryId = Number(c.id);
    this.editCategoryForm = {
      name: c.name || '',
      description: c.description || ''
    };
    this.invCatError = null;
    this.invCatOk = null;
  }

  saveEditCategory(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || this.editingCategoryId == null) return;
    const name = (this.editCategoryForm.name || '').trim();
    if (!name) {
      this.invCatError = 'El nombre de la categoría es obligatorio';
      return;
    }
    this.invCatLoading = true;
    this.invCatError = null;
    this.invCatOk = null;
    const payload: InventoryCategory = {
      name,
      description: (this.editCategoryForm.description || '').trim()
    } as InventoryCategory;
    this.inventoryCategoryService.update(ruc, this.editingCategoryId, payload).subscribe({
      next: () => {
        this.invCatOk = 'Categoría actualizada';
        this.editingCategoryId = null;
        this.loadInventoryCategories();
      },
      error: (err) => {
        this.invCatLoading = false;
        this.invCatError = err?.error?.message || 'No se pudo actualizar la categoría';
      }
    });
  }

  cancelEditCategory(): void {
    this.editingCategoryId = null;
    this.editCategoryForm = { name: '', description: '' };
    this.invCatError = null;
  }

  removeFromActiveCategories(c: InventoryCategory): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !c?.id) return;
    if (!confirm('¿Desea eliminar esta categoría del listado de esta empresa?')) return;
    this.invCatLoading = true;
    this.invCatError = null;
    this.invCatOk = null;
    const payload: InventoryCategory = { name: c.name, description: c.description, active: false } as InventoryCategory;
    this.inventoryCategoryService.update(ruc, Number(c.id), payload).subscribe({
      next: () => {
        this.invCatOk = 'Categoría eliminada del listado';
        this.loadInventoryCategories();
      },
      error: (err) => {
        this.invCatLoading = false;
        this.invCatError = err?.error?.message || 'No se pudo eliminar la categoría del listado';
      }
    });
  }

  // Editar proveedor
  startEditSupplier(s: InventorySupplier): void {
    if (!s || !s.id) return;
    this.editingSupplierId = Number(s.id);
    this.editSupplierForm = {
      name: s.name || '',
      ruc: s.ruc || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || ''
    };
    this.invSupError = null;
    this.invSupOk = null;
  }

  saveEditSupplier(): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || this.editingSupplierId == null) return;
    const name = (this.editSupplierForm.name || '').trim();
    if (!name) {
      this.invSupError = 'El nombre del proveedor es obligatorio';
      return;
    }
    this.invSupLoading = true;
    this.invSupError = null;
    this.invSupOk = null;
    const payload: InventorySupplier = {
      name,
      ruc: (this.editSupplierForm.ruc || '').trim() || undefined,
      phone: (this.editSupplierForm.phone || '').trim() || undefined,
      email: (this.editSupplierForm.email || '').trim() || undefined,
      address: (this.editSupplierForm.address || '').trim() || undefined
    };
    this.inventorySupplierService.update(ruc, this.editingSupplierId, payload).subscribe({
      next: () => {
        this.invSupOk = 'Proveedor actualizado';
        this.editingSupplierId = null;
        this.loadInventorySuppliers();
      },
      error: (err) => {
        this.invSupLoading = false;
        this.invSupError = err?.error?.message || 'No se pudo actualizar el proveedor';
      }
    });
  }

  cancelEditSupplier(): void {
    this.editingSupplierId = null;
    this.editSupplierForm = { name: '', ruc: '', phone: '', email: '', address: '' };
    this.invSupError = null;
  }

  removeFromActiveSuppliers(s: InventorySupplier): void {
    const ruc = this.getBusinessRuc();
    if (!ruc || !s?.id) return;
    if (!confirm('¿Desea eliminar este proveedor del listado de esta empresa?')) return;
    this.invSupLoading = true;
    this.invSupError = null;
    this.invSupOk = null;
    const payload: InventorySupplier = { name: s.name, ruc: s.ruc, phone: s.phone, email: s.email, address: s.address, active: false } as InventorySupplier;
    this.inventorySupplierService.update(ruc, Number(s.id), payload).subscribe({
      next: () => {
        this.invSupOk = 'Proveedor eliminado del listado';
        this.loadInventorySuppliers();
      },
      error: (err) => {
        this.invSupLoading = false;
        this.invSupError = err?.error?.message || 'No se pudo eliminar el proveedor del listado';
      }
    });
  }

  trackByApprovalId(index: number, item: any) {
    const id = Number(item?.id);
    return isNaN(id) ? index : id;
  }

  // === MÉTODOS PARA MANTENIMIENTO: CATÁLOGOS GLOBALES ===
  loadMaintenanceCatalogs(): void {
    const endpoints: {url: string, prop: string}[] = [
      { url: '/api/public/tipo-vehiculos', prop: 'allTipoVehiculos' },
      { url: '/api/public/estado-unidades', prop: 'allEstadoUnidades' },
      { url: '/api/public/marca-vehiculos', prop: 'allMarcaVehiculos' },
      { url: '/api/public/clase-vehiculos', prop: 'allClaseVehiculos' },
      { url: '/api/public/entidades-remitente', prop: 'allEntidadRemitentes' },
      { url: '/api/public/tipo-combustibles', prop: 'allTipoCombustibles' },
      { url: '/api/public/color-vehiculos', prop: 'allColorVehiculos' },
      { url: '/api/public/transmisiones', prop: 'allTransmisiones' },
      { url: '/api/public/propietario-vehiculos', prop: 'allPropietarioVehiculos' },
      { url: '/api/public/tipo-documento-vehiculos', prop: 'allTipoDocumentoVehiculos' },
      { url: '/api/public/unidad-medidas', prop: 'allUnidadMedidas' },
      { url: '/api/public/ubicacion-rutas', prop: 'allUbicacionRutas' },
      { url: '/api/public/pais-origenes', prop: 'allPaisOrigenes' },
      { url: '/api/public/numero-ejes', prop: 'allNumeroEjes' },
      { url: '/api/public/configuracion-ejes', prop: 'allConfiguracionEjes' },
      // Gerencia de Viajes
      { url: '/api/public/distancia-recorrer', prop: 'allDistanciaRecorrers' },
      { url: '/api/public/tipo-vias', prop: 'allTipoVias' },
      { url: '/api/public/condicion-climaticas', prop: 'allCondicionClimaticas' },
      { url: '/api/public/horario-circulaciones', prop: 'allHorarioCirculaciones' },
      { url: '/api/public/estado-carreteras', prop: 'allEstadoCarreteras' },
      { url: '/api/public/tipo-cargas', prop: 'allTipoCargas' },
      { url: '/api/public/hora-conducciones', prop: 'allHoraConducciones' },
      { url: '/api/public/hora-descansos', prop: 'allHoraDescansos' },
      { url: '/api/public/medio-comunicaciones', prop: 'allMedioComunicaciones' },
      { url: '/api/public/transporta-pasajeros', prop: 'allTransportaPasajeros' },
      { url: '/api/public/posibles-riesgos-via', prop: 'allPosiblesRiesgosVia' },
      { url: '/api/public/metodologia-riesgo', prop: 'allMetodologiaRiesgos' },
    ];
    endpoints.forEach(ep => {
      this.http.get<any[]>(ep.url).subscribe({
        next: (data: any[]) => { (this as any)[ep.prop] = data || []; },
        error: (err: any) => console.error(`Error cargando ${ep.url}:`, err)
      });
    });
  }

  openAsignVehicleTypeModal(): void {
    this.showAsignVehicleTypeModal = true;
    this.selectedVehicleTypeId = null;
  }

  closeAsignVehicleTypeModal(): void {
    this.showAsignVehicleTypeModal = false;
    this.selectedVehicleTypeId = null;
  }

  assignVehicleType(): void {
    if (!this.selectedVehicleTypeId) return;
    this.savingVehicleType = true;
    this.http.post(`/api/businesses/${this.empresaId}/tipo-vehiculo/${this.selectedVehicleTypeId}`, {}).subscribe({
      next: () => {
        this.savingVehicleType = false;
        this.closeAsignVehicleTypeModal();
        this.loadData(); // Recargar datos de la empresa
      },
      error: (err) => {
        this.savingVehicleType = false;
        console.error('Error asignando tipo de vehículo:', err);
        alert('Error al asignar tipo de vehículo');
      }
    });
  }

  removeVehicleType(tipoVehiculoId: number): void {
    if (!confirm('¿Desea eliminar este tipo de vehículo de la empresa?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/tipo-vehiculo/${tipoVehiculoId}`).subscribe({
      next: () => {
        this.loadData(); // Recargar datos de la empresa
      },
      error: (err) => {
        console.error('Error eliminando tipo de vehículo:', err);
        alert('Error al eliminar tipo de vehículo');
      }
    });
  }

  availableVehicleTypes(): any[] {
    const assignedIds = this.tipoVehiculos.map(tv => tv.id);
    return this.allTipoVehiculos.filter(tv => !assignedIds.includes(tv.id));
  }

  // === MÉTODOS PARA MANTENIMIENTO: ESTADOS DE UNIDAD ===
  openAsignUnitStatusModal(): void {
    this.showAsignUnitStatusModal = true;
    this.selectedUnitStatusId = null;
  }

  closeAsignUnitStatusModal(): void {
    this.showAsignUnitStatusModal = false;
    this.selectedUnitStatusId = null;
  }

  assignUnitStatus(): void {
    if (!this.selectedUnitStatusId) return;
    this.savingUnitStatus = true;
    this.http.post(`/api/businesses/${this.empresaId}/estado-unidad/${this.selectedUnitStatusId}`, {}).subscribe({
      next: () => {
        this.savingUnitStatus = false;
        this.closeAsignUnitStatusModal();
        this.loadData(); // Recargar datos de la empresa
      },
      error: (err) => {
        this.savingUnitStatus = false;
        console.error('Error asignando estado de unidad:', err);
        alert('Error al asignar estado de unidad');
      }
    });
  }

  removeUnitStatus(estadoUnidadId: number): void {
    if (!confirm('¿Desea eliminar este estado de unidad de la empresa?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/estado-unidad/${estadoUnidadId}`).subscribe({
      next: () => { this.loadData(); },
      error: (err) => { console.error('Error eliminando estado de unidad:', err); alert('Error al eliminar estado de unidad'); }
    });
  }

  availableUnitStatuses(): any[] {
    const ids = this.estadoUnidades.map((e: any) => e.id);
    return this.allEstadoUnidades.filter((e: any) => !ids.includes(e.id));
  }

  // === MARCA VEHÍCULO ===
  openAsignMarcaModal(): void { this.showAsignMarcaModal = true; this.selectedMarcaId = null; }
  closeAsignMarcaModal(): void { this.showAsignMarcaModal = false; }
  availableMarcas(): any[] { const ids = this.marcaVehiculos.map((e:any)=>e.id); return this.allMarcaVehiculos.filter((e:any)=>!ids.includes(e.id)); }
  assignMarca(): void {
    if (!this.selectedMarcaId) return;
    this.savingMarca = true;
    this.http.post(`/api/businesses/${this.empresaId}/marca-vehiculo/${this.selectedMarcaId}`, {}).subscribe({
      next: () => { this.savingMarca = false; this.showAsignMarcaModal = false; this.loadData(); },
      error: (err: any) => { this.savingMarca = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeMarca(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/marca-vehiculo/${id}`).subscribe({
      next: () => this.loadData(),
      error: (err: any) => { console.error(err); alert('Error al eliminar'); }
    });
  }

  openAsignClaseModal(): void { this.showAsignClaseModal = true; this.selectedClaseId = null; }
  closeAsignClaseModal(): void { this.showAsignClaseModal = false; }
  availableClases(): any[] {
    const ids = this.claseVehiculos.map((e: any) => e.id);
    return this.allClaseVehiculos.filter((e: any) => !ids.includes(e.id));
  }
  assignClase(): void {
    if (!this.selectedClaseId) return;
    this.savingClase = true;
    this.http.post(`/api/businesses/${this.empresaId}/clase-vehiculo/${this.selectedClaseId}`, {}).subscribe({
      next: () => { this.savingClase = false; this.showAsignClaseModal = false; this.loadData(); },
      error: (err: any) => { this.savingClase = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeClase(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/clase-vehiculo/${id}`).subscribe({
      next: () => this.loadData(),
      error: (err: any) => { console.error(err); alert('Error al eliminar'); }
    });
  }

  openAsignEntidadRemModal(): void { this.showAsignEntidadRemModal = true; this.selectedEntidadRemId = null; }
  closeAsignEntidadRemModal(): void { this.showAsignEntidadRemModal = false; }
  availableEntidadRems(): any[] {
    const ids = this.entidadRemitentes.map((e: any) => e.id);
    return this.allEntidadRemitentes.filter((e: any) => !ids.includes(e.id));
  }
  assignEntidadRem(): void {
    if (!this.selectedEntidadRemId) return;
    this.savingEntidadRem = true;
    this.http.post(`/api/businesses/${this.empresaId}/entidad-remitente/${this.selectedEntidadRemId}`, {}).subscribe({
      next: () => { this.savingEntidadRem = false; this.showAsignEntidadRemModal = false; this.loadData(); },
      error: (err: any) => { this.savingEntidadRem = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeEntidadRem(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/entidad-remitente/${id}`).subscribe({
      next: () => this.loadData(),
      error: (err: any) => { console.error(err); alert('Error al eliminar'); }
    });
  }

  // === TIPO COMBUSTIBLE ===
  openAsignCombustibleModal(): void { this.showAsignCombustibleModal = true; this.selectedCombustibleId = null; }
  closeAsignCombustibleModal(): void { this.showAsignCombustibleModal = false; }
  availableCombustibles(): any[] { const ids = this.tipoCombustibles.map((e:any)=>e.id); return this.allTipoCombustibles.filter((e:any)=>!ids.includes(e.id)); }
  assignCombustible(): void {
    if (!this.selectedCombustibleId) return;
    this.savingCombustible = true;
    this.http.post(`/api/businesses/${this.empresaId}/tipo-combustible/${this.selectedCombustibleId}`, {}).subscribe({
      next: () => { this.savingCombustible = false; this.showAsignCombustibleModal = false; this.loadData(); },
      error: (err: any) => { this.savingCombustible = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeCombustible(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/tipo-combustible/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === COLOR VEHÍCULO ===
  openAsignColorModal(): void { this.showAsignColorModal = true; this.selectedColorId = null; }
  closeAsignColorModal(): void { this.showAsignColorModal = false; }
  availableColors(): any[] { const ids = this.colorVehiculos.map((e:any)=>e.id); return this.allColorVehiculos.filter((e:any)=>!ids.includes(e.id)); }
  assignColor(): void {
    if (!this.selectedColorId) return;
    this.savingColor = true;
    this.http.post(`/api/businesses/${this.empresaId}/color-vehiculo/${this.selectedColorId}`, {}).subscribe({
      next: () => { this.savingColor = false; this.showAsignColorModal = false; this.loadData(); },
      error: (err: any) => { this.savingColor = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeColor(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/color-vehiculo/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === TRANSMISIÓN ===
  openAsignTransmisionModal(): void { this.showAsignTransmisionModal = true; this.selectedTransmisionId = null; }
  closeAsignTransmisionModal(): void { this.showAsignTransmisionModal = false; }
  availableTransmisiones(): any[] { const ids = this.transmisiones.map((e:any)=>e.id); return this.allTransmisiones.filter((e:any)=>!ids.includes(e.id)); }
  assignTransmision(): void {
    if (!this.selectedTransmisionId) return;
    this.savingTransmision = true;
    this.http.post(`/api/businesses/${this.empresaId}/transmision/${this.selectedTransmisionId}`, {}).subscribe({
      next: () => { this.savingTransmision = false; this.showAsignTransmisionModal = false; this.loadData(); },
      error: (err: any) => { this.savingTransmision = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeTransmision(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/transmision/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === PROPIETARIO VEHÍCULO ===
  openAsignPropietarioModal(): void { this.showAsignPropietarioModal = true; this.selectedPropietarioId = null; }
  closeAsignPropietarioModal(): void { this.showAsignPropietarioModal = false; }
  availablePropietarios(): any[] { const ids = this.propietarioVehiculos.map((e:any)=>e.id); return this.allPropietarioVehiculos.filter((e:any)=>!ids.includes(e.id)); }
  assignPropietario(): void {
    if (!this.selectedPropietarioId) return;
    this.savingPropietario = true;
    this.http.post(`/api/businesses/${this.empresaId}/propietario-vehiculo/${this.selectedPropietarioId}`, {}).subscribe({
      next: () => { this.savingPropietario = false; this.showAsignPropietarioModal = false; this.loadData(); },
      error: (err: any) => { this.savingPropietario = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removePropietario(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/propietario-vehiculo/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === TIPO DOCUMENTO VEHÍCULO ===
  openAsignTipoDocVehModal(): void { this.showAsignTipoDocVehModal = true; this.selectedTipoDocVehId = null; }
  closeAsignTipoDocVehModal(): void { this.showAsignTipoDocVehModal = false; }
  availableTipoDocVeh(): any[] { const ids = this.tipoDocumentoVehiculos.map((e:any)=>e.id); return this.allTipoDocumentoVehiculos.filter((e:any)=>!ids.includes(e.id)); }
  assignTipoDocVeh(): void {
    if (!this.selectedTipoDocVehId) return;
    this.savingTipoDocVeh = true;
    this.http.post(`/api/businesses/${this.empresaId}/tipo-documento-vehiculo/${this.selectedTipoDocVehId}`, {}).subscribe({
      next: () => { this.savingTipoDocVeh = false; this.showAsignTipoDocVehModal = false; this.loadData(); },
      error: (err: any) => { this.savingTipoDocVeh = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeTipoDocVeh(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/tipo-documento-vehiculo/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === UNIDAD MEDIDA ===
  openAsignUnidadMedidaModal(): void { this.showAsignUnidadMedidaModal = true; this.selectedUnidadMedidaId = null; }
  closeAsignUnidadMedidaModal(): void { this.showAsignUnidadMedidaModal = false; }
  availableUnidadMedidas(): any[] { const ids = this.unidadMedidas.map((e:any)=>e.id); return this.allUnidadMedidas.filter((e:any)=>!ids.includes(e.id)); }
  assignUnidadMedida(): void {
    if (!this.selectedUnidadMedidaId) return;
    this.savingUnidadMedida = true;
    this.http.post(`/api/businesses/${this.empresaId}/unidad-medida/${this.selectedUnidadMedidaId}`, {}).subscribe({
      next: () => { this.savingUnidadMedida = false; this.showAsignUnidadMedidaModal = false; this.loadData(); },
      error: (err: any) => { this.savingUnidadMedida = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeUnidadMedida(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/unidad-medida/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === UBICACIÓN RUTA ===
  openAsignUbicacionModal(): void { this.showAsignUbicacionModal = true; this.selectedUbicacionId = null; }
  closeAsignUbicacionModal(): void { this.showAsignUbicacionModal = false; }
  availableUbicaciones(): any[] { const ids = this.ubicacionRutas.map((e:any)=>e.id); return this.allUbicacionRutas.filter((e:any)=>!ids.includes(e.id)); }
  assignUbicacion(): void {
    if (!this.selectedUbicacionId) return;
    this.savingUbicacion = true;
    this.http.post(`/api/businesses/${this.empresaId}/ubicacion-ruta/${this.selectedUbicacionId}`, {}).subscribe({
      next: () => { this.savingUbicacion = false; this.showAsignUbicacionModal = false; this.loadData(); },
      error: (err: any) => { this.savingUbicacion = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeUbicacion(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/ubicacion-ruta/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  // === PAÍS ORIGEN ===
  openAsignPaisModal(): void { this.showAsignPaisModal = true; this.selectedPaisId = null; }
  closeAsignPaisModal(): void { this.showAsignPaisModal = false; }
  availablePaises(): any[] { const ids = this.paisOrigenes.map((e:any)=>e.id); return this.allPaisOrigenes.filter((e:any)=>!ids.includes(e.id)); }
  assignPais(): void {
    if (!this.selectedPaisId) return;
    this.savingPais = true;
    this.http.post(`/api/businesses/${this.empresaId}/pais-origen/${this.selectedPaisId}`, {}).subscribe({
      next: () => { this.savingPais = false; this.showAsignPaisModal = false; this.loadData(); },
      error: (err: any) => { this.savingPais = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removePais(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/pais-origen/${id}`).subscribe({ next: () => this.loadData(), error: (err:any) => { console.error(err); alert('Error'); } });
  }

  openAsignNumeroEjeModal(): void { this.showAsignNumeroEjeModal = true; this.selectedNumeroEjeId = null; }
  closeAsignNumeroEjeModal(): void { this.showAsignNumeroEjeModal = false; }
  availableNumeroEjes(): any[] {
    const ids = this.numeroEjes.map((e: any) => e.id);
    return this.allNumeroEjes.filter((e: any) => !ids.includes(e.id));
  }
  assignNumeroEje(): void {
    if (!this.selectedNumeroEjeId) return;
    this.savingNumeroEje = true;
    this.http.post(`/api/businesses/${this.empresaId}/numero-eje/${this.selectedNumeroEjeId}`, {}).subscribe({
      next: () => { this.savingNumeroEje = false; this.showAsignNumeroEjeModal = false; this.loadData(); },
      error: (err: any) => { this.savingNumeroEje = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeNumeroEje(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/numero-eje/${id}`).subscribe({ next: () => this.loadData(), error: (err: any) => { console.error(err); alert('Error'); } });
  }

  openAsignConfiguracionEjeModal(): void { this.showAsignConfiguracionEjeModal = true; this.selectedConfiguracionEjeId = null; }
  closeAsignConfiguracionEjeModal(): void { this.showAsignConfiguracionEjeModal = false; }
  availableConfiguracionEjes(): any[] {
    const ids = this.configuracionEjes.map((e: any) => e.id);
    return this.allConfiguracionEjes.filter((e: any) => !ids.includes(e.id));
  }
  assignConfiguracionEje(): void {
    if (!this.selectedConfiguracionEjeId) return;
    this.savingConfiguracionEje = true;
    this.http.post(`/api/businesses/${this.empresaId}/configuracion-eje/${this.selectedConfiguracionEjeId}`, {}).subscribe({
      next: () => { this.savingConfiguracionEje = false; this.showAsignConfiguracionEjeModal = false; this.loadData(); },
      error: (err: any) => { this.savingConfiguracionEje = false; console.error(err); alert('Error al asignar'); }
    });
  }
  removeConfiguracionEje(id: number): void {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/configuracion-eje/${id}`).subscribe({ next: () => this.loadData(), error: (err: any) => { console.error(err); alert('Error'); } });
  }

  // === GERENCIA DE VIAJES ===
  private viajesAssign(endpoint: string, id: number | null, prop: string, savingProp: string, modalProp: string) {
    if (!id) return;
    (this as any)[savingProp] = true;
    this.http.post(`/api/businesses/${this.empresaId}/${endpoint}/${id}`, {}).subscribe({
      next: () => { (this as any)[savingProp] = false; (this as any)[modalProp] = false; this.loadData(); },
      error: (err: any) => { (this as any)[savingProp] = false; console.error(err); alert('Error al asignar'); }
    });
  }
  private viajesRemove(endpoint: string, id: number) {
    if (!confirm('¿Eliminar?')) return;
    this.http.delete(`/api/businesses/${this.empresaId}/${endpoint}/${id}`).subscribe({ next: () => this.loadData(), error: (err: any) => { console.error(err); alert('Error'); } });
  }
  availableViajes(allProp: string, assignedProp: string): any[] {
    const assigned = ((this as any)[assignedProp] as any[]).map((x: any) => x.id);
    return ((this as any)[allProp] as any[]).filter((x: any) => !assigned.includes(x.id));
  }

  openAsignDistanciaModal() { this.showAsignDistanciaModal = true; this.selectedDistanciaId = null; }
  closeAsignDistanciaModal() { this.showAsignDistanciaModal = false; }
  assignDistancia() { this.viajesAssign('distancia-recorrer', this.selectedDistanciaId, 'distanciaRecorrers', 'savingDistancia', 'showAsignDistanciaModal'); }
  removeDistancia(id: number) { this.viajesRemove('distancia-recorrer', id); }

  openAsignTipoViaModal() { this.showAsignTipoViaModal = true; this.selectedTipoViaId = null; }
  closeAsignTipoViaModal() { this.showAsignTipoViaModal = false; }
  assignTipoVia() { this.viajesAssign('tipo-via', this.selectedTipoViaId, 'tipoVias', 'savingTipoVia', 'showAsignTipoViaModal'); }
  removeTipoVia(id: number) { this.viajesRemove('tipo-via', id); }

  openAsignCondicionModal() { this.showAsignCondicionModal = true; this.selectedCondicionId = null; }
  closeAsignCondicionModal() { this.showAsignCondicionModal = false; }
  assignCondicion() { this.viajesAssign('condicion-climatica', this.selectedCondicionId, 'condicionClimaticas', 'savingCondicion', 'showAsignCondicionModal'); }
  removeCondicion(id: number) { this.viajesRemove('condicion-climatica', id); }

  openAsignHorarioCircModal() { this.showAsignHorarioCircModal = true; this.selectedHorarioCircId = null; }
  closeAsignHorarioCircModal() { this.showAsignHorarioCircModal = false; }
  assignHorarioCirc() { this.viajesAssign('horario-circulacion', this.selectedHorarioCircId, 'horarioCirculaciones', 'savingHorarioCirc', 'showAsignHorarioCircModal'); }
  removeHorarioCirc(id: number) { this.viajesRemove('horario-circulacion', id); }

  openAsignEstadoCarrModal() { this.showAsignEstadoCarrModal = true; this.selectedEstadoCarrId = null; }
  closeAsignEstadoCarrModal() { this.showAsignEstadoCarrModal = false; }
  assignEstadoCarr() { this.viajesAssign('estado-carretera', this.selectedEstadoCarrId, 'estadoCarreteras', 'savingEstadoCarr', 'showAsignEstadoCarrModal'); }
  removeEstadoCarr(id: number) { this.viajesRemove('estado-carretera', id); }

  openAsignTipoCargaModal() { this.showAsignTipoCargaModal = true; this.selectedTipoCargaId = null; }
  closeAsignTipoCargaModal() { this.showAsignTipoCargaModal = false; }
  assignTipoCarga() { this.viajesAssign('tipo-carga', this.selectedTipoCargaId, 'tipoCargas', 'savingTipoCarga', 'showAsignTipoCargaModal'); }
  removeTipoCarga(id: number) { this.viajesRemove('tipo-carga', id); }

  openAsignHoraCondModal() { this.showAsignHoraCondModal = true; this.selectedHoraCondId = null; }
  closeAsignHoraCondModal() { this.showAsignHoraCondModal = false; }
  assignHoraCond() { this.viajesAssign('hora-conduccion', this.selectedHoraCondId, 'horaConducciones', 'savingHoraCond', 'showAsignHoraCondModal'); }
  removeHoraCond(id: number) { this.viajesRemove('hora-conduccion', id); }

  openAsignHoraDescModal() { this.showAsignHoraDescModal = true; this.selectedHoraDescId = null; }
  closeAsignHoraDescModal() { this.showAsignHoraDescModal = false; }
  assignHoraDesc() { this.viajesAssign('hora-descanso', this.selectedHoraDescId, 'horaDescansos', 'savingHoraDesc', 'showAsignHoraDescModal'); }
  removeHoraDesc(id: number) { this.viajesRemove('hora-descanso', id); }

  openAsignMedioComModal() { this.showAsignMedioComModal = true; this.selectedMedioComId = null; }
  closeAsignMedioComModal() { this.showAsignMedioComModal = false; }
  assignMedioCom() { this.viajesAssign('medio-comunicacion', this.selectedMedioComId, 'medioComunicaciones', 'savingMedioCom', 'showAsignMedioComModal'); }
  removeMedioCom(id: number) { this.viajesRemove('medio-comunicacion', id); }

  openAsignTransportaModal() { this.showAsignTransportaModal = true; this.selectedTransportaId = null; }
  closeAsignTransportaModal() { this.showAsignTransportaModal = false; }
  assignTransporta() { this.viajesAssign('transporta-pasajero', this.selectedTransportaId, 'transportaPasajeros', 'savingTransporta', 'showAsignTransportaModal'); }
  removeTransporta(id: number) { this.viajesRemove('transporta-pasajero', id); }

  openAsignMetodologiaModal() { this.showAsignMetodologiaModal = true; this.selectedMetodologiaId = null; }
  closeAsignMetodologiaModal() { this.showAsignMetodologiaModal = false; }
  assignMetodologia() { this.viajesAssign('metodologia-riesgo', this.selectedMetodologiaId, 'metodologiaRiesgos', 'savingMetodologia', 'showAsignMetodologiaModal'); }
  removeMetodologia(id: number) { this.viajesRemove('metodologia-riesgo', id); }

  openAsignPosibleRiesgoViaModal() { this.showAsignPosibleRiesgoViaModal = true; this.selectedPosibleRiesgoViaId = null; }
  closeAsignPosibleRiesgoViaModal() { this.showAsignPosibleRiesgoViaModal = false; }
  assignPosibleRiesgoVia() {
    this.viajesAssign('posible-riesgo-via', this.selectedPosibleRiesgoViaId, 'posiblesRiesgosVia', 'savingPosibleRiesgoVia', 'showAsignPosibleRiesgoViaModal');
  }
  removePosibleRiesgoVia(id: number) { this.viajesRemove('posible-riesgo-via', id); }
}
