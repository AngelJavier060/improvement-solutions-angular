import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { TipoVehiculoService } from '../../../../../../services/tipo-vehiculo.service';
import { Vehicle, MaintenanceCatalogItem } from '../../../../../../models/vehicle.model';
import { TipoVehiculo } from '../../../../../../models/tipo-vehiculo.model';
import {
  FLEET_DOC_TYPE_OPTIONS,
  FleetComplianceDoc,
  FleetDocRegistroPayload,
  fleetDocTypeCodeFromTipoDocumentoVehiculoId
} from '../../../../../../models/fleet-documentation.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

@Component({
  selector: 'app-documentacion-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './documentacion-registro.component.html',
  styleUrls: ['./documentacion-registro.component.scss']
})
export class DocumentacionRegistroComponent implements OnInit, OnDestroy {
  businessRuc = '';
  routeVehicleId: number | null = null;
  selectedVehicleId: number | null = null;
  vehicles: Vehicle[] = [];
  vehicleSearch = '';
  vehicle: Vehicle | null = null;
  loadingFleet = false;
  error = '';
  /** Documentos exigidos para el tipo de vehículo (config. admin tipo-vehículo). */
  dynamicDocTypes: { code: string; label: string; category?: string }[] = [];
  entidadRemitentes: MaintenanceCatalogItem[] = [];
  docConfigMessage = '';
  editDocId: string | null = null;
  /** Preferencia de grupo al abrir registro desde una sección. */
  preferredCategory: string | null = null;
  /** Renovar desde un documento existente (alta nueva con mismo tipo). */
  renewFromId: string | null = null;
  /** PDF nuevo a subir al guardar (API flota). */
  pendingPdfFile: File | null = null;
  saving = false;
  /** Respaldo ya guardado (edición). */
  existingPdfUrl: string | null = null;
  existingPdfName: string | null = null;
  private docSub?: Subscription;
  private routeSub?: Subscription;
  private lastLoadedVehicleId: number | null = null;
  /** Snapshot del doc a editar/renovar (por si el sync limpia caché). */
  private pendingEditSnapshot: FleetComplianceDoc | null = null;

  form = this.fb.group({
    typeCode: ['', Validators.required],
    entidadRemitenteId: [null as number | null],
    issueDate: ['', Validators.required],
    expiryDate: [''],
    noCaduca: [false],
    active: [true],
    historicMode: [false]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private fleetService: FleetService,
    private tipoVehiculoService: TipoVehiculoService,
    private docService: FleetDocumentationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.businessRuc = activeBusinessRuc(this.route);
    if (!this.businessRuc) {
      this.error = 'RUC no encontrado.';
      return;
    }
    this.docService.initForRuc(this.businessRuc);

    this.docSub = this.docService.changes$.subscribe(() => this.cdr.markForCheck());

    this.routeSub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      this.error = '';
      const vidStr = pm.get('vehicleId');
      const vid = vidStr != null && vidStr !== '' ? Number(vidStr) : NaN;
      this.routeVehicleId = Number.isFinite(vid) && vid > 0 ? vid : null;
      this.editDocId = qm.get('docId');
      this.renewFromId = qm.get('renewFrom');
      this.preferredCategory = qm.get('category');
      this.pendingEditSnapshot = null;

      if (this.routeVehicleId != null) {
        const snapId = this.editDocId || this.renewFromId;
        if (snapId) {
          const existing = this.docService.getDocumentById(this.routeVehicleId, snapId);
          if (existing) this.pendingEditSnapshot = { ...existing };
        }
        this.selectedVehicleId = this.routeVehicleId;
        if (this.lastLoadedVehicleId !== this.routeVehicleId) {
          this.lastLoadedVehicleId = this.routeVehicleId;
          this.loadVehicle(this.routeVehicleId);
        } else {
          this.restorePendingSnapshot();
          this.patchFormFromDoc();
          this.ensureDefaultTypeCode();
          this.cdr.markForCheck();
        }
      } else {
        this.lastLoadedVehicleId = null;
        this.selectedVehicleId = null;
        this.vehicle = null;
        this.dynamicDocTypes = [];
        this.entidadRemitentes = [];
        this.docConfigMessage = '';
        this.loadVehiclesForPickerOnce();
        this.patchFormFromDoc();
        this.cdr.markForCheck();
      }
    });

    this.form.valueChanges.subscribe(() => this.cdr.markForCheck());
    this.form.get('noCaduca')?.valueChanges.subscribe(no => {
      const exp = this.form.get('expiryDate');
      if (no) {
        exp?.setValue('', { emitEvent: false });
        exp?.disable({ emitEvent: false });
      } else {
        exp?.enable({ emitEvent: false });
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  /**
   * Opciones del desplegable: prioridad a documentos configurados para el tipo de vehículo;
   * si no hay, catálogo general; siempre se incluye el código actual al editar registros antiguos.
   */
  docTypeOptionsForSelect(): { code: string; label: string; category?: string }[] {
    let base: { code: string; label: string; category?: string }[] =
      this.dynamicDocTypes.length > 0
        ? [...this.dynamicDocTypes]
        : FLEET_DOC_TYPE_OPTIONS.map(o => ({
            ...o,
            category: o.code === 'CERT_OP' ? 'CERTIFICACIONES' : 'DOCUMENTOS_PRINCIPALES'
          }));
    const cur = this.form.get('typeCode')?.value;
    if (cur && !base.some(b => b.code === cur)) {
      const doc =
        this.selectedVehicleId != null && this.editDocId
          ? this.docService.getDocumentById(this.selectedVehicleId, this.editDocId)
          : undefined;
      base = [
        {
          code: cur,
          label: doc?.typeLabel || cur,
          category: doc?.docCategory || 'DOCUMENTOS_PRINCIPALES'
        },
        ...base
      ];
    }
    return base;
  }

  /** Opciones de tipo agrupadas para el select del registro. */
  docTypeGroups(): { code: string; label: string; items: { code: string; label: string; category?: string }[] }[] {
    const order = [
      { code: 'DOCUMENTOS_PRINCIPALES', label: 'Documentos Legales y Permisos' },
      { code: 'CERTIFICACIONES', label: 'Certificaciones Técnicas' },
      { code: 'LIBERACIONES', label: 'Liberaciones' }
    ];
    const opts = this.docTypeOptionsForSelect();
    return order
      .map(g => ({
        ...g,
        items: opts.filter(o => (o.category || 'DOCUMENTOS_PRINCIPALES') === g.code)
      }))
      .filter(g => g.items.length > 0);
  }

  private loadVehiclesForPickerOnce(): void {
    if (this.vehicles.length > 0 || this.loadingFleet) return;
    this.loadingFleet = true;
    this.fleetService.getVehicles(this.businessRuc, 1, 500).subscribe({
      next: res => {
        this.vehicles = res.vehicles || [];
        this.loadingFleet = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la flota.';
        this.loadingFleet = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadVehicle(id: number): void {
    this.pendingPdfFile = null;
    this.existingPdfUrl = null;
    this.existingPdfName = null;
    this.loadingFleet = true;
    this.dynamicDocTypes = [];
    this.entidadRemitentes = [];
    this.docConfigMessage = '';
    // Sincronizar compliance desde API antes de parchear edición
    this.docService
      .syncVehicleFromServer(this.businessRuc, id)
      .pipe(catchError(() => of([] as any[])))
      .subscribe({
        next: () => {
          this.restorePendingSnapshot();
          this.fleetService.getVehicleById(this.businessRuc, id).subscribe({
            next: v => {
              this.vehicle = v;
              this.loadVehicleFormContext(v);
            },
            error: err => {
              console.error(err);
              this.error = 'No se pudo cargar la unidad.';
              this.vehicle = null;
              this.loadingFleet = false;
              this.cdr.markForCheck();
            }
          });
        }
      });
  }

  private restorePendingSnapshot(): void {
    if (!this.pendingEditSnapshot || this.routeVehicleId == null) return;
    const id = this.pendingEditSnapshot.id;
    if (!this.docService.getDocumentById(this.routeVehicleId, id)) {
      this.docService.ensureLocalDoc(this.pendingEditSnapshot);
    }
  }

  private loadVehicleFormContext(v: Vehicle): void {
    const tipo$ =
      v.tipoVehiculoId != null
        ? this.tipoVehiculoService.getById(v.tipoVehiculoId).pipe(catchError(() => of(null)))
        : of(null);
    // No tragar errores del catálogo: sin entidades no se puede seleccionar
    const cat$ = this.fleetService.getFichaCatalogs(this.businessRuc);

    forkJoin({ tipo: tipo$, cats: cat$ }).subscribe({
      next: ({ tipo, cats }) => {
        this.applyTipoDocumentosConfig(tipo, v, cats?.tipoDocumentoVehiculos ?? []);
        const list = Array.isArray(cats?.entidadRemitentes) ? [...cats.entidadRemitentes] : [];
        this.entidadRemitentes = list
          .filter(e => e && e.id != null && !!(e.name || '').trim())
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));
        this.loadingFleet = false;
        this.patchFormFromDoc();
        this.ensureDefaultTypeCode();
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.loadingFleet = false;
        this.error =
          'No se pudo cargar el catálogo de entidades remitentes de la empresa. Verifique la configuración en administración.';
        this.cdr.markForCheck();
      }
    });
  }

  private applyTipoDocumentosConfig(
    tipo: TipoVehiculo | null,
    v: Vehicle,
    empresaTipos: { id: number; name: string; category?: string }[] = []
  ): void {
    // Prioridad: documentos del tipo de vehículo; si no hay, tipos asignados a la empresa
    const fromTipo = (tipo?.documentos ?? [])
      .filter(d => d.id != null)
      .map(d => ({
        code: fleetDocTypeCodeFromTipoDocumentoVehiculoId(d.id!),
        label: d.name,
        category: d.category || 'DOCUMENTOS_PRINCIPALES'
      }));

    const fromEmpresa = (empresaTipos || [])
      .filter(d => d?.id != null)
      .map(d => ({
        code: fleetDocTypeCodeFromTipoDocumentoVehiculoId(d.id),
        label: d.name,
        category: d.category || 'DOCUMENTOS_PRINCIPALES'
      }));

    this.dynamicDocTypes = fromTipo.length > 0 ? fromTipo : fromEmpresa;

    if (this.dynamicDocTypes.length === 0) {
      this.docConfigMessage =
        v.tipoVehiculoId != null
          ? 'No hay documentos asociados a este tipo de vehículo ni tipos asignados a la empresa. Configure Tipo de documento (con grupo) en administración.'
          : 'Asigne tipos de documento a la empresa (con grupo) o un tipo de vehículo a la ficha para cargar el listado.';
    } else {
      this.docConfigMessage = '';
    }
  }

  private syncExpiryControl(): void {
    const no = !!this.form.get('noCaduca')?.value;
    const exp = this.form.get('expiryDate');
    if (no) exp?.disable({ emitEvent: false });
    else exp?.enable({ emitEvent: false });
  }

  private patchFormFromDoc(): void {
    const vid = this.selectedVehicleId;
    this.restorePendingSnapshot();

    // Edición
    if (this.editDocId && vid != null) {
      const doc = this.docService.getDocumentById(vid, this.editDocId) || this.pendingEditSnapshot;
      if (doc) {
        this.pendingPdfFile = null;
        this.existingPdfUrl = doc.attachedDocumentUrl ?? null;
        this.existingPdfName = doc.fileName ?? null;
        this.form.patchValue({
          typeCode: doc.typeCode,
          entidadRemitenteId: doc.entidadRemitenteId ?? null,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate || '',
          noCaduca: doc.expiryDate == null || doc.expiryDate === '',
          active: doc.active,
          historicMode: doc.historicMode
        });
        this.syncExpiryControl();
        return;
      }
    }

    // Renovación: mismo tipo, fechas vacías, sin PDF previo (alta nueva)
    if (this.renewFromId && vid != null) {
      const src = this.docService.getDocumentById(vid, this.renewFromId) || this.pendingEditSnapshot;
      if (src) {
        this.pendingPdfFile = null;
        this.existingPdfUrl = null;
        this.existingPdfName = null;
        this.form.patchValue({
          typeCode: src.typeCode,
          entidadRemitenteId: src.entidadRemitenteId ?? null,
          issueDate: '',
          expiryDate: '',
          noCaduca: false,
          active: true,
          historicMode: false
        });
        this.syncExpiryControl();
        return;
      }
    }

    this.pendingPdfFile = null;
    this.existingPdfUrl = null;
    this.existingPdfName = null;
    const firstCode = this.docTypeOptionsForSelect()[0]?.code ?? FLEET_DOC_TYPE_OPTIONS[0]?.code ?? '';
    this.form.reset({
      typeCode: firstCode,
      entidadRemitenteId: null,
      issueDate: '',
      expiryDate: '',
      noCaduca: false,
      active: true,
      historicMode: false
    });
    this.syncExpiryControl();
  }

  private ensureDefaultTypeCode(): void {
    const opts = this.docTypeOptionsForSelect();
    const cur = this.form.get('typeCode')?.value;
    if (!cur || !opts.some(o => o.code === cur)) {
      const preferred =
        this.preferredCategory
          ? opts.find(o => (o.category || 'DOCUMENTOS_PRINCIPALES') === this.preferredCategory)
          : undefined;
      const next = preferred?.code ?? opts[0]?.code ?? '';
      if (next) {
        this.form.patchValue({ typeCode: next }, { emitEvent: false });
      }
    }
  }

  filteredPickerVehicles(): Vehicle[] {
    const q = this.vehicleSearch.trim().toLowerCase();
    if (!q) return this.vehicles;
    return this.vehicles.filter(
      v =>
        (v.placa || '').toLowerCase().includes(q) ||
        (v.codigoEquipo || '').toLowerCase().includes(q) ||
        (v.serieMotor || '').toLowerCase().includes(q)
    );
  }

  onSelectVehicle(id: number): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', id, 'registro'], {
      replaceUrl: true
    });
  }

  daysRemaining(): number | null {
    if (this.form.get('noCaduca')?.value) return null;
    const exp = this.form.get('expiryDate')?.value;
    if (!exp) return null;
    return this.docService.daysToExpiry(exp);
  }

  statusChip(): 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'NA' {
    const d = this.daysRemaining();
    if (d === null) return 'NA';
    if (d < 0) return 'VENCIDO';
    if (d <= 30) return 'PROXIMO';
    return 'VIGENTE';
  }

  onPdfSelected(event: Event, input: HTMLInputElement): void {
    const f = (event.target as HTMLInputElement).files?.[0];
    if (!f) {
      this.pendingPdfFile = null;
      return;
    }
    if (!this.isPdfFile(f)) {
      this.error = 'Solo se permiten archivos PDF.';
      input.value = '';
      this.pendingPdfFile = null;
      return;
    }
    this.error = '';
    this.pendingPdfFile = f;
  }

  clearPendingPdf(input: HTMLInputElement): void {
    input.value = '';
    this.pendingPdfFile = null;
  }

  private isPdfFile(f: File): boolean {
    const n = f.name.toLowerCase();
    return f.type === 'application/pdf' || n.endsWith('.pdf');
  }

  private formatBytes(bytes?: number): string | undefined {
    if (bytes == null || isNaN(bytes)) return undefined;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  submit(): void {
    const vid = this.selectedVehicleId ?? this.vehicle?.id;
    if (vid == null) {
      this.error = 'Seleccione una unidad de la flota.';
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving) return;

    const v = this.form.getRawValue();
    const opts = this.docTypeOptionsForSelect();
    const typeOpt = opts.find(o => o.code === v.typeCode);
    const entId = v.entidadRemitenteId;
    const ent = entId != null ? this.entidadRemitentes.find(e => e.id === entId) : undefined;

    const prevDoc =
      this.editDocId && this.selectedVehicleId != null
        ? this.docService.getDocumentById(this.selectedVehicleId, this.editDocId)
        : undefined;

    const buildPayload = (
      attach: { id: number; url: string; name: string; sizeLabel?: string } | null
    ): FleetDocRegistroPayload => {
      let attId: number | null = attach?.id ?? null;
      let attUrl: string | null = attach?.url ?? null;
      let fn: string | undefined = attach?.name;
      let sz: string | undefined = attach?.sizeLabel;
      if (!attach && prevDoc) {
        attId = prevDoc.attachedFleetDocumentId ?? null;
        attUrl = prevDoc.attachedDocumentUrl ?? null;
        fn = prevDoc.fileName;
        sz = prevDoc.fileSizeLabel;
      }
      return {
        typeCode: v.typeCode!,
        typeLabel: typeOpt?.label,
        docCategory: typeOpt?.category || prevDoc?.docCategory || 'DOCUMENTOS_PRINCIPALES',
        entidadRemitenteId: ent != null ? ent.id : null,
        entidadRemitenteName: ent?.name ?? null,
        referenceId: '',
        issueDate: v.issueDate!,
        expiryDate: v.noCaduca ? null : v.expiryDate || null,
        active: !!v.active,
        historicMode: !!v.historicMode,
        fileName: fn,
        fileSizeLabel: sz,
        attachedFleetDocumentId: attId,
        attachedDocumentUrl: attUrl
      };
    };

    const desc = `Documentación: ${typeOpt?.label || v.typeCode}`;

    const afterPersistOk = (savedVid: number) => {
      this.pendingPdfFile = null;
      this.saving = false;
      this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', savedVid]);
      this.cdr.markForCheck();
    };

    const afterPersistFail = (msg: string) => {
      this.error = msg;
      this.saving = false;
      this.cdr.markForCheck();
    };

    if (this.pendingPdfFile) {
      this.saving = true;
      this.error = '';
      const oldFleetDocId = prevDoc?.attachedFleetDocumentId ?? null;
      this.fleetService.uploadVehicleDocument(this.businessRuc, vid, this.pendingPdfFile, desc).subscribe({
        next: dto => {
          const payload = buildPayload({
            id: dto.id,
            url: dto.url,
            name: dto.originalFilename,
            sizeLabel: this.formatBytes(dto.fileSize)
          });
          this.persistComplianceDoc(vid, payload).subscribe({
            next: ok => {
              if (!ok) {
                afterPersistFail('No se pudo guardar el registro tras subir el archivo.');
                return;
              }
              if (oldFleetDocId != null && oldFleetDocId !== dto.id) {
                this.fleetService
                  .deleteVehicleDocument(this.businessRuc, vid, oldFleetDocId)
                  .pipe(catchError(() => of(void 0)))
                  .subscribe();
              }
              afterPersistOk(vid);
            },
            error: err => {
              console.error(err);
              afterPersistFail('No se pudo guardar el registro de documentación en el servidor.');
            }
          });
        },
        error: err => {
          console.error(err);
          this.error =
            'No se pudo subir el PDF. Compruebe que el archivo no supere el límite del servidor y que su sesión esté activa.';
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    this.saving = true;
    this.error = '';
    const payload = buildPayload(null);
    this.persistComplianceDoc(vid, payload).subscribe({
      next: ok => {
        if (!ok) {
          afterPersistFail('No se pudo guardar el registro de documentación.');
          return;
        }
        afterPersistOk(vid);
      },
      error: err => {
        console.error(err);
        afterPersistFail('No se pudo guardar el registro de documentación en el servidor.');
      }
    });
  }

  private persistComplianceDoc(vid: number, payload: FleetDocRegistroPayload) {
    if (this.editDocId) {
      return this.docService.updateDocument$(this.businessRuc, vid, this.editDocId, payload).pipe(
        map(updated => {
          if (!updated) {
            this.error = 'No se encontró el documento a actualizar.';
            return false;
          }
          return true;
        })
      );
    }
    return this.docService.createDocument$(this.businessRuc, vid, payload).pipe(map(() => true));
  }

  cancel(): void {
    const vid = this.selectedVehicleId ?? this.vehicle?.id;
    if (vid != null) {
      this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', vid]);
    } else {
      this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion']);
    }
  }

  vehicleSubtitle(v: Vehicle): string {
    const m = v.marca || '—';
    const mo = v.modelo || '';
    return mo ? `${m} · ${mo}` : m;
  }
}
