import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_AUTH_REDIRECT } from '../core/interceptors/auth.interceptor';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  FleetComplianceDoc,
  FleetDocHistoryAction,
  FleetDocHistoryEntry,
  FleetDocRegistroPayload,
  FLEET_DOC_TYPE_OPTIONS,
  FLEET_DOC_CODE_ER_PREFIX,
  FleetDocComplianceStatus
} from '../models/fleet-documentation.model';

interface VehicleDocStore {
  docs: FleetComplianceDoc[];
  history: FleetDocHistoryEntry[];
}

interface PersistedShape {
  v: 1;
  byVehicle: Record<string, VehicleDocStore>;
}

/** Respuesta del API de compliance-docs */
export interface FleetComplianceApiDto {
  id: number;
  vehicleId: number;
  typeCode: string;
  typeLabel: string;
  docCategory?: string | null;
  entidadRemitenteId?: number | null;
  entidadRemitenteName?: string | null;
  referenceId?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  active?: boolean;
  historicMode?: boolean;
  fileName?: string | null;
  fileSizeLabel?: string | null;
  attachedFleetDocumentId?: number | null;
  attachedDocumentUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FleetDocumentationService {
  private readonly STORAGE_PREFIX = 'improvement_fleet_doc_v1_';
  private readonly baseUrl = '/api/fleet';

  private store$ = new BehaviorSubject<PersistedShape | null>(null);
  private currentRuc = '';
  private serverSynced = false;

  /** Emite cuando cambia el almacén del RUC activo */
  readonly changes$ = this.store$.asObservable();

  constructor(private http: HttpClient) {}

  initForRuc(ruc: string): void {
    const key = this.key(ruc);
    this.currentRuc = ruc;
    this.serverSynced = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedShape;
        if (parsed?.v === 1 && parsed.byVehicle) {
          this.store$.next(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const empty: PersistedShape = { v: 1, byVehicle: {} };
    this.store$.next(empty);
    this.persist(empty);
  }

  /**
   * Carga documentación desde el servidor (fuente de verdad) y actualiza caché local.
   * Si el servidor está vacío y hay datos locales, intenta migrarlos una vez.
   */
  syncFromServer(ruc: string): Observable<FleetComplianceDoc[]> {
    if (!ruc) return of([]);
    this.currentRuc = ruc;
    // Conservar locales antes de reemplazar con la respuesta del servidor
    const localSnapshot = this.allDocsFlat().map(d => this.cloneDoc(d));
    return this.http
      .get<FleetComplianceApiDto[]>(
        `${this.baseUrl}/${encodeURIComponent(ruc)}/compliance-docs`,
        this.optionalAuthOptions()
      )
      .pipe(
      tap(list => {
        this.serverSynced = true;
        if ((list || []).length === 0 && localSnapshot.length > 0) {
          // Restaura locales y migra al servidor
          this.restoreLocalSnapshot(localSnapshot);
          this.migrateLocalToServer(ruc, localSnapshot);
        } else {
          this.applyServerList(list || []);
        }
      }),
      map(list => {
        if ((list || []).length === 0 && localSnapshot.length > 0) {
          return localSnapshot;
        }
        return (list || []).map(d => this.fromApi(d));
      }),
      catchError(err => {
        console.warn('[FleetDocs] syncFromServer falló, se usa caché local', err);
        return of(this.allDocsFlat());
      })
    );
  }

  private restoreLocalSnapshot(docs: FleetComplianceDoc[]): void {
    const prev = this.read();
    const byVehicle: Record<string, VehicleDocStore> = {};
    for (const doc of docs) {
      const k = String(doc.vehicleId);
      if (!byVehicle[k]) {
        byVehicle[k] = { docs: [], history: prev.byVehicle[k]?.history || [] };
      }
      byVehicle[k].docs.push(doc);
    }
    for (const [k, prevBucket] of Object.entries(prev.byVehicle || {})) {
      if (!byVehicle[k] && (prevBucket.history || []).length) {
        byVehicle[k] = { docs: [], history: prevBucket.history };
      }
    }
    this.persist({ v: 1, byVehicle });
  }

  /**
   * Opciones para lecturas opcionales: si falla auth, se usa caché local sin cerrar sesión.
   * Usa HttpContext (metadato solo de cliente) — NO un header HTTP, para no disparar
   * preflight CORS que el backend rechazaría (rompía la carga de documentos).
   */
  private optionalAuthOptions(): { context: HttpContext } {
    return { context: new HttpContext().set(SKIP_AUTH_REDIRECT, true) };
  }

  /** Carga docs de una unidad. No borra caché local si el servidor viene vacío. */
  syncVehicleFromServer(ruc: string, vehicleId: number): Observable<FleetComplianceDoc[]> {
    if (!ruc || !vehicleId) return of([]);
    this.currentRuc = ruc;
    const localBefore = this.getDocuments(vehicleId).map(d => this.cloneDoc(d));
    return this.http
      .get<FleetComplianceApiDto[]>(
        `${this.baseUrl}/${encodeURIComponent(ruc)}/vehicles/${vehicleId}/compliance-docs`,
        this.optionalAuthOptions()
      )
      .pipe(
        tap(list => {
          const incoming = (list || []).map(d => this.fromApi(d));
          this.serverSynced = true;
          const localOnly = localBefore.filter(d => this.isLocalOnlyId(d.id));
          if (incoming.length === 0 && localOnly.length > 0) {
            this.replaceVehicleDocs(vehicleId, localOnly);
            this.migrateLocalDocsForVehicle(ruc, vehicleId, localOnly);
            return;
          }
          this.replaceVehicleDocs(vehicleId, incoming);
        }),
        map(() => this.getDocuments(vehicleId)),
        catchError(err => {
          console.warn('[FleetDocs] syncVehicleFromServer falló', err);
          return of(this.getDocuments(vehicleId));
        })
      );
  }

  /** Reinyecta un documento en caché (p. ej. al editar uno solo-local). */
  ensureLocalDoc(doc: FleetComplianceDoc): void {
    const b = this.bucket(doc.vehicleId);
    const idx = b.docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) b.docs[idx] = this.cloneDoc(doc);
    else b.docs.push(this.cloneDoc(doc));
    this.persist(this.read());
  }

  private migrateLocalDocsForVehicle(ruc: string, vehicleId: number, locals: FleetComplianceDoc[]): void {
    for (const doc of locals.filter(d => this.isLocalOnlyId(d.id))) {
      this.createDocument$(ruc, vehicleId, {
        typeCode: doc.typeCode,
        typeLabel: doc.typeLabel,
        docCategory: doc.docCategory,
        entidadRemitenteId: doc.entidadRemitenteId,
        entidadRemitenteName: doc.entidadRemitenteName,
        referenceId: doc.referenceId,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        active: doc.active,
        historicMode: doc.historicMode,
        fileName: doc.fileName,
        fileSizeLabel: doc.fileSizeLabel,
        attachedFleetDocumentId: doc.attachedFleetDocumentId,
        attachedDocumentUrl: doc.attachedDocumentUrl
      }).subscribe({
        next: created => {
          const b = this.bucket(vehicleId);
          const idx = b.docs.findIndex(x => x.id === doc.id);
          if (idx >= 0) b.docs.splice(idx, 1);
          if (!b.docs.some(x => x.id === created.id)) b.docs.push(created);
          this.persist(this.read());
        },
        error: err => console.warn('[FleetDocs] migrate local vehículo falló', err)
      });
    }
  }

  private key(ruc: string): string {
    return this.STORAGE_PREFIX + ruc.replace(/\W/g, '_');
  }

  private read(): PersistedShape {
    let s = this.store$.value;
    if (!s) {
      s = { v: 1, byVehicle: {} };
      this.store$.next(s);
    }
    return s;
  }

  private persist(shape: PersistedShape): void {
    if (!this.currentRuc) return;
    try {
      localStorage.setItem(this.key(this.currentRuc), JSON.stringify(shape));
    } catch {
      /* quota */
    }
    this.store$.next({ ...shape, byVehicle: { ...shape.byVehicle } });
  }

  private bucket(vehicleId: number): VehicleDocStore {
    const shape = this.read();
    const k = String(vehicleId);
    if (!shape.byVehicle[k]) {
      shape.byVehicle[k] = { docs: [], history: [] };
    }
    return shape.byVehicle[k];
  }

  private allDocsFlat(): FleetComplianceDoc[] {
    const shape = this.read();
    const out: FleetComplianceDoc[] = [];
    for (const b of Object.values(shape.byVehicle || {})) {
      out.push(...(b.docs || []));
    }
    return out;
  }

  private applyServerList(list: FleetComplianceApiDto[]): PersistedShape {
    const prev = this.read();
    const byVehicle: Record<string, VehicleDocStore> = {};
    for (const dto of list) {
      const vid = dto.vehicleId;
      if (vid == null) continue;
      const k = String(vid);
      if (!byVehicle[k]) {
        byVehicle[k] = {
          docs: [],
          history: prev.byVehicle[k]?.history || []
        };
      }
      byVehicle[k].docs.push(this.fromApi(dto));
    }
    // Conservar historial local de vehículos sin docs en servidor
    for (const [k, prevBucket] of Object.entries(prev.byVehicle || {})) {
      if (!byVehicle[k] && (prevBucket.history || []).length) {
        byVehicle[k] = { docs: [], history: prevBucket.history };
      }
    }
    const shape: PersistedShape = { v: 1, byVehicle };
    this.persist(shape);
    return shape;
  }

  private replaceVehicleDocs(vehicleId: number, docs: FleetComplianceDoc[]): void {
    const shape = this.read();
    const k = String(vehicleId);
    const prev = shape.byVehicle[k];
    shape.byVehicle[k] = {
      docs: [...docs],
      history: prev?.history || []
    };
    this.persist(shape);
  }

  private fromApi(d: FleetComplianceApiDto): FleetComplianceDoc {
    const created = d.createdAt || new Date().toISOString();
    const updated = d.updatedAt || created;
    return {
      id: String(d.id),
      vehicleId: d.vehicleId,
      typeCode: d.typeCode,
      typeLabel: d.typeLabel,
      docCategory: d.docCategory ?? 'DOCUMENTOS_PRINCIPALES',
      entidadRemitenteId: d.entidadRemitenteId ?? null,
      entidadRemitenteName: d.entidadRemitenteName ?? null,
      referenceId: d.referenceId || '',
      issueDate: d.issueDate || '',
      expiryDate: d.expiryDate ?? null,
      active: d.active !== false,
      historicMode: !!d.historicMode,
      fileName: d.fileName || undefined,
      fileSizeLabel: d.fileSizeLabel || undefined,
      attachedFleetDocumentId: d.attachedFleetDocumentId ?? null,
      attachedDocumentUrl: d.attachedDocumentUrl ?? null,
      createdAt: created,
      updatedAt: updated
    };
  }

  private toApiBody(payload: FleetDocRegistroPayload): Record<string, unknown> {
    return {
      typeCode: payload.typeCode,
      typeLabel: payload.typeLabel,
      docCategory: payload.docCategory ?? 'DOCUMENTOS_PRINCIPALES',
      entidadRemitenteId: payload.entidadRemitenteId ?? null,
      entidadRemitenteName: payload.entidadRemitenteName ?? null,
      referenceId: payload.referenceId,
      issueDate: payload.issueDate || null,
      expiryDate: payload.expiryDate,
      active: payload.active,
      historicMode: payload.historicMode,
      fileName: payload.fileName ?? null,
      fileSizeLabel: payload.fileSizeLabel ?? null,
      attachedFleetDocumentId: payload.attachedFleetDocumentId ?? null
    };
  }

  /** Si el servidor está vacío, sube los registros que solo existían en localStorage. */
  private migrateLocalToServer(ruc: string, locals: FleetComplianceDoc[]): void {
    const toMigrate = locals.filter(d => !/^\d+$/.test(d.id));
    if (!toMigrate.length) return;
    for (const doc of toMigrate) {
      this.http
        .post<FleetComplianceApiDto>(
          `${this.baseUrl}/${encodeURIComponent(ruc)}/vehicles/${doc.vehicleId}/compliance-docs`,
          this.toApiBody({
            typeCode: doc.typeCode,
            typeLabel: doc.typeLabel,
            docCategory: doc.docCategory,
            entidadRemitenteId: doc.entidadRemitenteId,
            entidadRemitenteName: doc.entidadRemitenteName,
            referenceId: doc.referenceId,
            issueDate: doc.issueDate,
            expiryDate: doc.expiryDate,
            active: doc.active,
            historicMode: doc.historicMode,
            fileName: doc.fileName,
            fileSizeLabel: doc.fileSizeLabel,
            attachedFleetDocumentId: doc.attachedFleetDocumentId,
            attachedDocumentUrl: doc.attachedDocumentUrl
          })
        )
        .subscribe({
          next: created => {
            const b = this.bucket(doc.vehicleId);
            const idx = b.docs.findIndex(x => x.id === doc.id);
            if (idx >= 0) {
              b.docs[idx] = this.fromApi(created);
              this.persist(this.read());
            }
          },
          error: err => console.warn('[FleetDocs] migrate local falló', err)
        });
    }
  }

  labelForTypeCode(code: string): string {
    const staticLabel = FLEET_DOC_TYPE_OPTIONS.find(t => t.code === code)?.label;
    if (staticLabel) return staticLabel;
    if (code.startsWith(FLEET_DOC_CODE_ER_PREFIX)) return code;
    return code;
  }

  /** @deprecated Los filtros de tipo se retiraron de la UI de listado. */
  distinctDocTypesAcrossFleet(vehicleIds: number[]): { code: string; label: string }[] {
    const map = new Map<string, string>();
    for (const vid of vehicleIds) {
      for (const d of this.getDocuments(vid)) {
        if (d.typeCode) {
          map.set(d.typeCode, d.typeLabel || this.labelForTypeCode(d.typeCode));
        }
      }
    }
    return [...map.entries()]
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  getDocuments(vehicleId: number): FleetComplianceDoc[] {
    return [...(this.bucket(vehicleId).docs || [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getHistory(vehicleId: number): FleetDocHistoryEntry[] {
    return [...(this.bucket(vehicleId).history || [])].sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }

  getDocumentById(vehicleId: number, docId: string | number | null | undefined): FleetComplianceDoc | undefined {
    if (docId == null || docId === '') return undefined;
    const wanted = String(docId);
    return this.bucket(vehicleId).docs.find(d => String(d.id) === wanted);
  }

  private isLocalOnlyId(id: string | number | null | undefined): boolean {
    return !/^\d+$/.test(String(id ?? ''));
  }

  daysToExpiry(expiryDate: string | null): number | null {
    if (expiryDate == null || expiryDate === '') return null;
    const end = new Date(expiryDate + 'T12:00:00');
    if (isNaN(end.getTime())) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000);
  }

  complianceStatusForDoc(doc: FleetComplianceDoc): FleetDocComplianceStatus {
    if (doc.expiryDate == null || doc.expiryDate === '') return 'NO_CADUCA';
    const d = this.daysToExpiry(doc.expiryDate);
    if (d === null) return 'SIN_VIGENCIA';
    if (d < 0) return 'VENCIDO';
    if (d <= 20) return 'PROXIMO';
    return 'VIGENTE';
  }

  worstDaysAmongActive(vehicleId: number): number | null {
    const docs = this.getDocuments(vehicleId).filter(d => d.active && !d.historicMode);
    let min: number | null = null;
    for (const d of docs) {
      if (d.expiryDate == null || d.expiryDate === '') continue;
      const days = this.daysToExpiry(d.expiryDate);
      if (days === null) continue;
      if (min === null || days < min) min = days;
    }
    return min;
  }

  worstStatusForVehicle(vehicleId: number): FleetDocComplianceStatus {
    const docs = this.getDocuments(vehicleId).filter(d => d.active && !d.historicMode);
    if (docs.length === 0) return 'SIN_VIGENCIA';
    let hasNoCaduca = false;
    let worst: FleetDocComplianceStatus = 'VIGENTE';
    const rank: Record<FleetDocComplianceStatus, number> = {
      VENCIDO: 0,
      PROXIMO: 1,
      VIGENTE: 2,
      NO_CADUCA: 3,
      SIN_VIGENCIA: 4
    };
    for (const d of docs) {
      const st = this.complianceStatusForDoc(d);
      if (st === 'NO_CADUCA') hasNoCaduca = true;
      if (rank[st] < rank[worst]) worst = st;
    }
    if (worst === 'VIGENTE' && hasNoCaduca && docs.every(x => this.complianceStatusForDoc(x) === 'NO_CADUCA')) {
      return 'NO_CADUCA';
    }
    return worst;
  }

  private newId(): string {
    return `fd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private cloneDoc(d: FleetComplianceDoc): FleetComplianceDoc {
    return JSON.parse(JSON.stringify(d));
  }

  private pushHistory(
    vehicleId: number,
    replacedId: string,
    action: FleetDocHistoryAction,
    snapshot: FleetComplianceDoc,
    note?: string
  ): void {
    const b = this.bucket(vehicleId);
    const entry: FleetDocHistoryEntry = {
      id: this.newId(),
      vehicleId,
      replacedDocumentId: replacedId,
      action,
      snapshot: this.cloneDoc(snapshot),
      changedAt: new Date().toISOString(),
      note
    };
    b.history.unshift(entry);
    this.persist(this.read());
  }

  /** Crea en servidor (y actualiza caché). Si falla la API, guarda en local. */
  createDocument$(ruc: string, vehicleId: number, payload: FleetDocRegistroPayload): Observable<FleetComplianceDoc> {
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const body = this.toApiBody({ ...payload, typeLabel });
    return this.http
      .post<FleetComplianceApiDto>(
        `${this.baseUrl}/${encodeURIComponent(ruc)}/vehicles/${vehicleId}/compliance-docs`,
        body
      )
      .pipe(
        map(dto => this.fromApi(dto)),
        tap(doc => {
          const b = this.bucket(vehicleId);
          if (!b.docs.some(d => d.id === doc.id)) {
            b.docs.push(doc);
            this.persist(this.read());
          }
        }),
        catchError(err => {
          console.error('[FleetDocs] create remoto falló', err);
          return throwError(() => err);
        })
      );
  }

  updateDocument$(
    ruc: string,
    vehicleId: number,
    docId: string,
    payload: FleetDocRegistroPayload
  ): Observable<FleetComplianceDoc | null> {
    const numericId = Number(docId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return this.createDocument$(ruc, vehicleId, payload).pipe(
        tap(created => {
          const b = this.bucket(vehicleId);
          const idx = b.docs.findIndex(d => String(d.id) === String(docId));
          if (idx >= 0) {
            this.pushHistory(vehicleId, String(docId), 'UPDATED', b.docs[idx], 'Actualizado');
            b.docs.splice(idx, 1);
          }
          if (!b.docs.some(d => d.id === created.id)) b.docs.push(created);
          this.persist(this.read());
        })
      );
    }

    const prev = this.getDocumentById(vehicleId, docId);
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const body = this.toApiBody({ ...payload, typeLabel });
    return this.http
      .put<FleetComplianceApiDto>(
        `${this.baseUrl}/${encodeURIComponent(ruc)}/vehicles/${vehicleId}/compliance-docs/${numericId}`,
        body
      )
      .pipe(
        map(dto => this.fromApi(dto)),
        tap(updated => {
          if (prev) this.pushHistory(vehicleId, String(docId), 'UPDATED', prev, 'Versión anterior archivada en historial');
          const b = this.bucket(vehicleId);
          const idx = b.docs.findIndex(d => String(d.id) === String(docId));
          if (idx >= 0) b.docs[idx] = updated;
          else b.docs.push(updated);
          this.persist(this.read());
        }),
        catchError(err => {
          console.error('[FleetDocs] update remoto falló', err);
          return throwError(() => err);
        })
      );
  }

  private updateDocumentLocal(
    vehicleId: number,
    docId: string,
    payload: FleetDocRegistroPayload
  ): FleetComplianceDoc | null {
    const b = this.bucket(vehicleId);
    const idx = b.docs.findIndex(d => d.id === docId);
    if (idx < 0) return null;
    const prev = this.cloneDoc(b.docs[idx]);
    this.pushHistory(vehicleId, docId, 'UPDATED', prev);
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const updated: FleetComplianceDoc = {
      ...prev,
      typeCode: payload.typeCode,
      typeLabel,
      docCategory: payload.docCategory ?? null,
      entidadRemitenteId: payload.entidadRemitenteId ?? null,
      entidadRemitenteName: payload.entidadRemitenteName ?? null,
      referenceId: payload.referenceId?.trim() || prev.referenceId,
      issueDate: payload.issueDate,
      expiryDate: payload.expiryDate,
      active: payload.active,
      historicMode: payload.historicMode,
      fileName: payload.fileName ?? prev.fileName,
      fileSizeLabel: payload.fileSizeLabel ?? prev.fileSizeLabel,
      attachedFleetDocumentId:
        payload.attachedFleetDocumentId !== undefined
          ? payload.attachedFleetDocumentId
          : prev.attachedFleetDocumentId ?? null,
      attachedDocumentUrl:
        payload.attachedDocumentUrl !== undefined
          ? payload.attachedDocumentUrl
          : prev.attachedDocumentUrl ?? null,
      updatedAt: new Date().toISOString()
    };
    b.docs[idx] = updated;
    this.persist(this.read());
    return updated;
  }

  deleteDocument$(ruc: string, vehicleId: number, docId: string): Observable<boolean> {
    const b = this.bucket(vehicleId);
    const idx = b.docs.findIndex(d => String(d.id) === String(docId));
    if (idx < 0) return of(false);
    const removed = this.cloneDoc(b.docs[idx]);
    const numericId = Number(docId);

    const finishLocal = () => {
      const i = b.docs.findIndex(d => String(d.id) === String(docId));
      if (i >= 0) b.docs.splice(i, 1);
      this.pushHistory(vehicleId, String(docId), 'DELETED', removed, 'Documento eliminado del listado activo');
      this.persist(this.read());
    };

    if (!Number.isFinite(numericId) || numericId <= 0) {
      finishLocal();
      return of(true);
    }

    return this.http
      .delete<void>(
        `${this.baseUrl}/${encodeURIComponent(ruc)}/vehicles/${vehicleId}/compliance-docs/${numericId}`
      )
      .pipe(
        tap(() => finishLocal()),
        map(() => true),
        catchError(err => {
          console.error('[FleetDocs] delete remoto falló', err);
          if (err?.status === 404) {
            finishLocal();
            return of(true);
          }
          return of(false);
        })
      );
  }

  /** Compatibilidad síncrona (solo caché). Preferir createDocument$. */
  createDocument(vehicleId: number, payload: FleetDocRegistroPayload): FleetComplianceDoc {
    const doc = this.createDocumentLocalOnly(vehicleId, payload);
    if (this.currentRuc) {
      this.createDocument$(this.currentRuc, vehicleId, payload).subscribe({
        next: created => {
          const b = this.bucket(vehicleId);
          const i = b.docs.findIndex(d => d.id === doc.id);
          if (i >= 0) b.docs.splice(i, 1);
          if (!b.docs.some(d => d.id === created.id)) b.docs.push(created);
          this.persist(this.read());
        },
        error: err => console.error('[FleetDocs] create remoto falló', err)
      });
    }
    return doc;
  }

  private createDocumentLocalOnly(vehicleId: number, payload: FleetDocRegistroPayload): FleetComplianceDoc {
    const b = this.bucket(vehicleId);
    const now = new Date().toISOString();
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const doc: FleetComplianceDoc = {
      id: this.newId(),
      vehicleId,
      typeCode: payload.typeCode,
      typeLabel,
      docCategory: payload.docCategory ?? null,
      entidadRemitenteId: payload.entidadRemitenteId ?? null,
      entidadRemitenteName: payload.entidadRemitenteName ?? null,
      referenceId: payload.referenceId?.trim() || `REF-${String(vehicleId)}-${b.docs.length + 1}`,
      issueDate: payload.issueDate,
      expiryDate: payload.expiryDate,
      active: payload.active,
      historicMode: payload.historicMode,
      fileName: payload.fileName,
      fileSizeLabel: payload.fileSizeLabel,
      attachedFleetDocumentId: payload.attachedFleetDocumentId ?? null,
      attachedDocumentUrl: payload.attachedDocumentUrl ?? null,
      createdAt: now,
      updatedAt: now
    };
    b.docs.push(doc);
    this.persist(this.read());
    return doc;
  }

  updateDocument(vehicleId: number, docId: string, payload: FleetDocRegistroPayload): FleetComplianceDoc | null {
    if (!this.currentRuc) {
      return this.updateDocumentLocal(vehicleId, docId, payload);
    }
    // Dispara remoto; el UI de registro usa createDocument$/updateDocument$
    this.updateDocument$(this.currentRuc, vehicleId, docId, payload).subscribe();
    return this.getDocumentById(vehicleId, docId) || null;
  }

  deleteDocument(vehicleId: number, docId: string): boolean {
    if (this.currentRuc) {
      this.deleteDocument$(this.currentRuc, vehicleId, docId).subscribe();
      return true;
    }
    const b = this.bucket(vehicleId);
    const idx = b.docs.findIndex(d => d.id === docId);
    if (idx < 0) return false;
    const removed = this.cloneDoc(b.docs[idx]);
    b.docs.splice(idx, 1);
    this.pushHistory(vehicleId, docId, 'DELETED', removed, 'Documento eliminado del listado activo');
    this.persist(this.read());
    return true;
  }

  /**
   * Si hay PDFs en el servidor sin fila de compliance, crea filas mínimas en caché
   * (y las persiste en servidor) para que se vean en la unidad.
   */
  importOrphanFiles(
    ruc: string,
    vehicleId: number,
    files: { id: number; originalFilename: string; url: string; fileSize?: number; description?: string; createdAt?: string }[]
  ): void {
    if (!files?.length) return;
    const existing = this.getDocuments(vehicleId);
    const linked = new Set(
      existing.map(d => d.attachedFleetDocumentId).filter((x): x is number => x != null)
    );
    for (const f of files) {
      if (linked.has(f.id)) continue;
      const label =
        (f.description && f.description.replace(/^Documentación:\s*/i, '').trim()) ||
        f.originalFilename ||
        `Documento #${f.id}`;
      const payload: FleetDocRegistroPayload = {
        typeCode: 'OTRO',
        typeLabel: label,
        docCategory: 'DOCUMENTOS_PRINCIPALES',
        entidadRemitenteId: null,
        entidadRemitenteName: null,
        referenceId: `PDF-${f.id}`,
        issueDate: (f.createdAt || new Date().toISOString()).substring(0, 10),
        expiryDate: null,
        active: true,
        historicMode: false,
        fileName: f.originalFilename,
        fileSizeLabel: f.fileSize != null ? this.formatBytes(f.fileSize) : undefined,
        attachedFleetDocumentId: f.id,
        attachedDocumentUrl: f.url
      };
      this.createDocument$(ruc, vehicleId, payload).subscribe({
        error: err => console.warn('[FleetDocs] import orphan falló', err)
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  countByWorstStatus(vehicleIds: number[]): { vigente: number; proximo: number; vencido: number; sinDocs: number } {
    let vigente = 0;
    let proximo = 0;
    let vencido = 0;
    let sinDocs = 0;
    for (const vid of vehicleIds) {
      const st = this.worstStatusForVehicle(vid);
      if (st === 'SIN_VIGENCIA') sinDocs++;
      else if (st === 'VENCIDO') vencido++;
      else if (st === 'PROXIMO') proximo++;
      else vigente++;
    }
    return { vigente, proximo, vencido, sinDocs };
  }

  isServerSynced(): boolean {
    return this.serverSynced;
  }
}
