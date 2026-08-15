import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, combineLatest, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle, MaintenanceCatalogItem } from '../../../../../../models/vehicle.model';
import {
  FleetComplianceDoc,
  FleetDocRegistroPayload
} from '../../../../../../models/fleet-documentation.model';
import { normalizeFleetDocCategory } from '../../../../../../models/tipo-documento-vehiculo.model';
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
  get hasExistingPdf(): boolean {
    return !!(this.existingPdfUrl || this.existingPdfName);
  }
  private docSub?: Subscription;
  private routeSub?: Subscription;
  private lastLoadedVehicleId: number | null = null;
  /** Snapshot del doc a editar/renovar (por si el sync limpia caché). */
  private pendingEditSnapshot: FleetComplianceDoc | null = null;
  private navStateDoc: FleetComplianceDoc | null = null;

  form = this.fb.group({
    typeCode: [''],
    entidadRemitenteId: [null as number | null, Validators.required],
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
    private docService: FleetDocumentationService,
    private cdr: ChangeDetectorRef
  ) {
    const nav = this.router.getCurrentNavigation();
    const fromNav = nav?.extras?.state?.['doc'] as FleetComplianceDoc | undefined;
    const fromHist = typeof history !== 'undefined' ? (history.state?.doc as FleetComplianceDoc | undefined) : undefined;
    this.navStateDoc = fromNav || fromHist || null;
  }

  ngOnInit(): void {
    this.businessRuc = activeBusinessRuc(this.route);
    if (!this.businessRuc) {
      this.error = 'RUC no encontrado.';
      return;
    }
    this.docService.initForRuc(this.businessRuc);

    this.docSub = this.docService.changes$.subscribe(() => {
      // Tras crear/eliminar/renovar, refrescar opciones del selector (sin duplicados)
      if (this.selectedVehicleId != null && this.entidadRemitentes.length && !this.editDocId && !this.renewFromId) {
        if (this.availableEntidades().length === 0 && this.entidadRemitentes.length > 0) {
          this.docConfigMessage =
            'Todos los documentos aplicables ya están registrados en esta unidad. Elimine uno o use Renovar para actualizar un existente.';
        } else if (
          this.docConfigMessage?.includes('Todos los documentos aplicables') &&
          this.availableEntidades().length > 0
        ) {
          this.docConfigMessage = '';
        }
      }
      this.cdr.markForCheck();
    });

    this.routeSub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qm]) => {
      this.error = '';
      const vidStr = pm.get('vehicleId');
      const vid = vidStr != null && vidStr !== '' ? Number(vidStr) : NaN;
      this.routeVehicleId = Number.isFinite(vid) && vid > 0 ? vid : null;
      this.editDocId = qm.get('docId');
      this.renewFromId = qm.get('renewFrom');
      this.preferredCategory = qm.get('category');
      this.pendingEditSnapshot = null;
      const snapId = this.editDocId || this.renewFromId;
      if (snapId) {
        const fromCache =
          this.routeVehicleId != null ? this.docService.getDocumentById(this.routeVehicleId, snapId) : undefined;
        const fromState =
          this.navStateDoc && String(this.navStateDoc.id) === String(snapId) ? this.navStateDoc : null;
        const existing = fromCache || fromState;
        if (existing) this.pendingEditSnapshot = { ...existing };
      }

      if (this.routeVehicleId != null) {
        this.selectedVehicleId = this.routeVehicleId;
        if (this.lastLoadedVehicleId !== this.routeVehicleId) {
          this.lastLoadedVehicleId = this.routeVehicleId;
          this.loadVehicle(this.routeVehicleId);
        } else {
          this.restorePendingSnapshot();
          this.patchFormFromDoc();
          this.ensureDefaultTypeCode();
          this.cdr.detectChanges();
        }
      } else {
        this.lastLoadedVehicleId = null;
        this.selectedVehicleId = null;
        this.vehicle = null;
        this.entidadRemitentes = [];
        this.docConfigMessage = '';
        this.loadVehiclesForPickerOnce();
        this.patchFormFromDoc();
        this.cdr.detectChanges();
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
   * Códigos internos derivados de las entidades disponibles (no duplicadas).
   */
  docTypeOptionsForSelect(): { code: string; label: string; category?: string }[] {
    let base: { code: string; label: string; category?: string }[] = this.availableEntidades()
      .filter(e => e?.id != null)
      .map(e => ({
        code: `er_${e.id}`,
        label: e.name,
        category: normalizeFleetDocCategory(e.category)
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

  /**
   * Entidades aplicables al tipo, menos las ya registradas en la unidad
   * (excepto el documento en edición/renovación).
   */
  availableEntidades(): MaintenanceCatalogItem[] {
    const used = this.usedEntidadIdsOnVehicle();
    const allowed = this.exceptionEntidadIds();
    return (this.entidadRemitentes || []).filter(e => {
      const id = Number(e?.id);
      if (!Number.isFinite(id) || id <= 0) return false;
      if (allowed.has(id)) return true;
      return !used.has(id);
    });
  }

  /** IDs ya usados por un registro activo (no histórico) en la unidad. */
  private usedEntidadIdsOnVehicle(): Set<number> {
    const used = new Set<number>();
    if (this.selectedVehicleId == null) return used;
    for (const d of this.docService.getDocuments(this.selectedVehicleId)) {
      if (this.editDocId && String(d.id) === String(this.editDocId)) {
        // El que se edita no cuenta como “otro” duplicado
        continue;
      }
      if (d.active === false || d.historicMode) continue;
      const erId = this.extractEntidadIdFromDoc(d);
      if (erId != null) used.add(erId);
    }
    return used;
  }

  /** En editar/renovar, el tipo del documento actual debe seguir visible. */
  private exceptionEntidadIds(): Set<number> {
    const allow = new Set<number>();
    const snapId = this.editDocId || this.renewFromId;
    const doc = snapId ? this.resolveDocForForm(snapId) : this.pendingEditSnapshot;
    if (!doc) return allow;
    const erId = this.extractEntidadIdFromDoc(doc);
    if (erId != null) allow.add(erId);
    return allow;
  }

  private extractEntidadIdFromDoc(doc: FleetComplianceDoc): number | null {
    if (doc.entidadRemitenteId != null) {
      const n = Number(doc.entidadRemitenteId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (typeof doc.typeCode === 'string' && doc.typeCode.startsWith('er_')) {
      const n = Number(doc.typeCode.substring(3));
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  /** Entidades disponibles agrupadas por las 3 categorías de documentación. */
  entidadGroups(): { code: string; label: string; items: MaintenanceCatalogItem[] }[] {
    const available = this.availableEntidades();
    const order = [
      { code: 'DOCUMENTOS_PRINCIPALES', label: 'Documentos Legales y Permisos' },
      { code: 'CERTIFICACIONES', label: 'Certificaciones Técnicas' },
      { code: 'LIBERACIONES', label: 'Liberaciones' }
    ];
    return order
      .map(g => ({
        ...g,
        items: available.filter(e => normalizeFleetDocCategory(e.category) === g.code)
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
    this.entidadRemitentes = [];
    this.docConfigMessage = '';

    const vehicle$ = this.fleetService.getVehicleById(this.businessRuc, id);
    const docs$ = this.docService.syncVehicleFromServer(this.businessRuc, id).pipe(catchError(() => of([] as FleetComplianceDoc[])));
    const applicable$ = this.fleetService.getApplicableDocs(this.businessRuc, id).pipe(
      catchError(err => {
        console.error(err);
        return of({
          vehicleId: id,
          businessId: 0,
          tipoVehiculoId: null,
          tipoVehiculoName: null,
          configured: false,
          message: 'No se pudieron cargar los documentos aplicables al tipo.',
          documentos: [] as Array<{ id: number; name: string; description?: string; category?: string }>
        });
      })
    );

    forkJoin({ vehicle: vehicle$, docs: docs$, applicable: applicable$ }).subscribe({
      next: ({ vehicle, applicable }) => {
        this.vehicle = vehicle;
        this.restorePendingSnapshot();

        const list = Array.isArray(applicable?.documentos) ? [...applicable.documentos] : [];
        this.entidadRemitentes = list
          .filter(e => e && e.id != null && !!(e.name || '').trim())
          .map(e => ({
            id: e.id,
            name: e.name,
            description: e.description,
            category: e.category
          }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));

        // Edición/renovación: conservar el documento actual aunque ya no esté en el set del tipo
        this.ensureCurrentDocInOptions();

        if (applicable?.message) {
          this.docConfigMessage = applicable.message;
        } else if (!applicable?.configured) {
          this.docConfigMessage =
            'Asigne un tipo de vehículo en la ficha de la unidad para filtrar los documentos aplicables.';
        } else if (this.entidadRemitentes.length === 0) {
          this.docConfigMessage =
            'No hay documentos configurados para este tipo. Configure “Documentos por tipo” en administración de la empresa.';
        } else if (
          !this.editDocId &&
          !this.renewFromId &&
          this.availableEntidades().length === 0
        ) {
          this.docConfigMessage =
            'Todos los documentos aplicables ya están registrados en esta unidad. Elimine uno o use Renovar para actualizar un existente.';
        } else {
          this.docConfigMessage = '';
        }

        this.loadingFleet = false;
        this.patchFormFromDoc();
        this.ensureDefaultTypeCode();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la unidad.';
        this.vehicle = null;
        this.loadingFleet = false;
        this.cdr.detectChanges();
      }
    });
  }

  /** Si editamos un doc fuera del set actual, lo incluimos para no romper el formulario. */
  private ensureCurrentDocInOptions(): void {
    const snap =
      this.pendingEditSnapshot ||
      (this.editDocId && this.selectedVehicleId != null
        ? this.docService.getDocumentById(this.selectedVehicleId, this.editDocId)
        : undefined);
    if (!snap) return;

    let erId: number | null = null;
    if (snap.entidadRemitenteId != null) {
      const n = Number(snap.entidadRemitenteId);
      if (Number.isFinite(n) && n > 0) erId = n;
    }
    if (erId == null && typeof snap.typeCode === 'string' && snap.typeCode.startsWith('er_')) {
      const n = Number(snap.typeCode.substring(3));
      if (Number.isFinite(n) && n > 0) erId = n;
    }
    if (erId == null) return;
    if (this.entidadRemitentes.some(e => Number(e.id) === Number(erId))) return;

    this.entidadRemitentes = [
      {
        id: erId,
        name: snap.entidadRemitenteName || snap.typeLabel || `Documento #${erId}`,
        category: snap.docCategory || 'DOCUMENTOS_PRINCIPALES',
        description: '(ya no aplica al tipo; solo edición)'
      },
      ...this.entidadRemitentes
    ];
  }

  private restorePendingSnapshot(): void {
    if (!this.pendingEditSnapshot || this.routeVehicleId == null) return;
    const id = this.pendingEditSnapshot.id;
    if (!this.docService.getDocumentById(this.routeVehicleId, id)) {
      this.docService.ensureLocalDoc(this.pendingEditSnapshot);
    }
  }

  compareEntidadId = (a: number | string | null, b: number | string | null): boolean => {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Number(a) === Number(b);
  };

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    const s = String(value).trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  }

  private resolveEntidadId(doc: FleetComplianceDoc): number | null {
    const raw = doc.entidadRemitenteId;
    if (raw != null && raw !== ('' as unknown)) {
      const n = Number(raw);
      if (Number.isFinite(n) && this.entidadRemitentes.some(e => Number(e.id) === n)) return n;
    }
    const name = (doc.entidadRemitenteName || '').trim().toLowerCase();
    if (name) {
      const byName = this.entidadRemitentes.find(e => (e.name || '').trim().toLowerCase() === name);
      if (byName?.id != null) return byName.id;
    }
    return raw != null ? Number(raw) || null : null;
  }

  private resolveDocForForm(id: string | null): FleetComplianceDoc | undefined {
    if (!id || this.selectedVehicleId == null) return this.pendingEditSnapshot || undefined;
    return (
      this.docService.getDocumentById(this.selectedVehicleId, id) ||
      this.docService.getDocuments(this.selectedVehicleId).find(d => String(d.id) === String(id)) ||
      this.pendingEditSnapshot ||
      undefined
    );
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
      const doc = this.resolveDocForForm(this.editDocId);
      if (doc) {
        this.pendingPdfFile = null;
        this.existingPdfUrl = doc.attachedDocumentUrl ?? null;
        this.existingPdfName = doc.fileName ?? (doc.attachedFleetDocumentId != null ? 'PDF adjunto' : null);
        this.form.patchValue({
          typeCode: doc.typeCode || '',
          entidadRemitenteId: this.resolveEntidadId(doc),
          issueDate: this.toDateInput(doc.issueDate),
          expiryDate: this.toDateInput(doc.expiryDate),
          noCaduca: !doc.expiryDate,
          active: doc.active !== false,
          historicMode: !!doc.historicMode
        });
        this.syncExpiryControl();
        this.cdr.detectChanges();
        return;
      }
      this.error = 'No se encontró el documento a editar. Vuelva al listado e intente de nuevo.';
      return;
    }

    // Renovación: mismo tipo, fechas vacías, sin PDF previo (alta nueva)
    if (this.renewFromId && vid != null) {
      const src = this.resolveDocForForm(this.renewFromId);
      if (src) {
        this.pendingPdfFile = null;
        this.existingPdfUrl = null;
        this.existingPdfName = null;
        this.form.patchValue({
          typeCode: src.typeCode || '',
          entidadRemitenteId: this.resolveEntidadId(src),
          issueDate: '',
          expiryDate: '',
          noCaduca: false,
          active: true,
          historicMode: false
        });
        this.syncExpiryControl();
        this.cdr.detectChanges();
        return;
      }
      this.error = 'No se encontró el documento a renovar. Vuelva al listado e intente de nuevo.';
      return;
    }

    this.pendingPdfFile = null;
    this.existingPdfUrl = null;
    this.existingPdfName = null;
    const firstCode = this.docTypeOptionsForSelect()[0]?.code ?? '';
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
    // En edición/renovación no pisar el tipo ya cargado
    if (this.editDocId || this.renewFromId) return;
    const opts = this.docTypeOptionsForSelect();
    const cur = this.form.get('typeCode')?.value;
    if (!cur || !opts.some(o => o.code === cur)) {
      const preferred =
        this.preferredCategory
          ? opts.find(o => normalizeFleetDocCategory(o.category) === normalizeFleetDocCategory(this.preferredCategory))
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
    if (d <= 0) return 'VENCIDO';
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
    const entId = v.entidadRemitenteId;
    const ent =
      entId != null
        ? this.entidadRemitentes.find(e => Number(e.id) === Number(entId))
        : undefined;
    if (!ent) {
      this.error = 'Seleccione la entidad remitente configurada para esta empresa.';
      this.form.markAllAsTouched();
      return;
    }

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
        typeCode: `er_${ent.id}`,
        typeLabel: ent.name,
        docCategory: normalizeFleetDocCategory(ent.category || prevDoc?.docCategory || 'DOCUMENTOS_PRINCIPALES'),
        entidadRemitenteId: ent.id,
        entidadRemitenteName: ent.name ?? null,
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

    const desc = `Documentación: ${ent.name}`;

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
