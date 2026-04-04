import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { TipoVehiculoService } from '../../../../../../services/tipo-vehiculo.service';
import { Vehicle, MaintenanceCatalogItem } from '../../../../../../models/vehicle.model';
import { TipoVehiculo } from '../../../../../../models/tipo-vehiculo.model';
import {
  FLEET_DOC_TYPE_OPTIONS,
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
  dynamicDocTypes: { code: string; label: string }[] = [];
  entidadRemitentes: MaintenanceCatalogItem[] = [];
  docConfigMessage = '';
  editDocId: string | null = null;
  /** PDF nuevo a subir al guardar (API flota). */
  pendingPdfFile: File | null = null;
  saving = false;
  /** Respaldo ya guardado (edición). */
  existingPdfUrl: string | null = null;
  existingPdfName: string | null = null;
  private docSub?: Subscription;
  private routeSub?: Subscription;
  private lastLoadedVehicleId: number | null = null;

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

      if (this.routeVehicleId != null) {
        this.selectedVehicleId = this.routeVehicleId;
        if (this.lastLoadedVehicleId !== this.routeVehicleId) {
          this.lastLoadedVehicleId = this.routeVehicleId;
          this.loadVehicle(this.routeVehicleId);
        } else {
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
  docTypeOptionsForSelect(): { code: string; label: string }[] {
    let base: { code: string; label: string }[] =
      this.dynamicDocTypes.length > 0 ? [...this.dynamicDocTypes] : [...FLEET_DOC_TYPE_OPTIONS];
    const cur = this.form.get('typeCode')?.value;
    if (cur && !base.some(b => b.code === cur)) {
      const doc =
        this.selectedVehicleId != null && this.editDocId
          ? this.docService.getDocumentById(this.selectedVehicleId, this.editDocId)
          : undefined;
      base = [{ code: cur, label: doc?.typeLabel || cur }, ...base];
    }
    return base;
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

  private loadVehicleFormContext(v: Vehicle): void {
    const tipo$ =
      v.tipoVehiculoId != null
        ? this.tipoVehiculoService.getById(v.tipoVehiculoId).pipe(catchError(() => of(null)))
        : of(null);
    const cat$ = this.fleetService.getFichaCatalogs(this.businessRuc).pipe(catchError(() => of(null)));

    forkJoin({ tipo: tipo$, cats: cat$ }).subscribe({
      next: ({ tipo, cats }) => {
        this.applyTipoDocumentosConfig(tipo, v);
        this.entidadRemitentes = cats?.entidadRemitentes ?? [];
        this.loadingFleet = false;
        this.patchFormFromDoc();
        this.ensureDefaultTypeCode();
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.loadingFleet = false;
        this.error = 'No se pudo cargar la configuración del formulario.';
        this.cdr.markForCheck();
      }
    });
  }

  private applyTipoDocumentosConfig(tipo: TipoVehiculo | null, v: Vehicle): void {
    const list = tipo?.documentos ?? [];
    this.dynamicDocTypes = list
      .filter(d => d.id != null)
      .map(d => ({
        code: fleetDocTypeCodeFromTipoDocumentoVehiculoId(d.id!),
        label: d.name
      }));
    if (this.dynamicDocTypes.length === 0) {
      this.docConfigMessage =
        v.tipoVehiculoId != null
          ? 'No hay documentos asociados a este tipo de vehículo en la configuración (Tipo de vehículo). Se muestra el catálogo general hasta que los defina el administrador.'
          : 'La unidad no tiene tipo de vehículo en ficha. Asígnelo en Flota / editar ficha para cargar documentos automáticos, o use el catálogo general.';
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
    const docId = this.editDocId;
    if (docId && vid != null) {
      const doc = this.docService.getDocumentById(vid, docId);
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
      const next = opts[0]?.code ?? '';
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
          const ok = this.persistComplianceDoc(vid, payload);
          if (!ok) {
            this.error = 'No se pudo guardar el registro tras subir el archivo.';
            this.saving = false;
            this.cdr.markForCheck();
            return;
          }
          if (oldFleetDocId != null && oldFleetDocId !== dto.id) {
            this.fleetService
              .deleteVehicleDocument(this.businessRuc, vid, oldFleetDocId)
              .pipe(catchError(() => of(void 0)))
              .subscribe();
          }
          this.pendingPdfFile = null;
          this.saving = false;
          this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', vid]);
          this.cdr.markForCheck();
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

    const payload = buildPayload(null);
    if (!this.persistComplianceDoc(vid, payload)) {
      return;
    }
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', vid]);
  }

  private persistComplianceDoc(vid: number, payload: FleetDocRegistroPayload): boolean {
    if (this.editDocId) {
      const updated = this.docService.updateDocument(vid, this.editDocId, payload);
      if (!updated) {
        this.error = 'No se encontró el documento a actualizar.';
        return false;
      }
      return true;
    }
    this.docService.createDocument(vid, payload);
    return true;
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
