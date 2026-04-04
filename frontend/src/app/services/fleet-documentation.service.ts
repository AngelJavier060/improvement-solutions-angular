import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  FleetComplianceDoc,
  FleetDocHistoryAction,
  FleetDocHistoryEntry,
  FleetDocRegistroPayload,
  FLEET_DOC_TYPE_OPTIONS,
  FLEET_DOC_CODE_TDV_PREFIX,
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

@Injectable({ providedIn: 'root' })
export class FleetDocumentationService {
  private readonly STORAGE_PREFIX = 'improvement_fleet_doc_v1_';

  private store$ = new BehaviorSubject<PersistedShape | null>(null);
  private currentRuc = '';

  /** Emite cuando cambia el almacén del RUC activo */
  readonly changes$ = this.store$.asObservable();

  initForRuc(ruc: string): void {
    const key = this.key(ruc);
    this.currentRuc = ruc;
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

  labelForTypeCode(code: string): string {
    const staticLabel = FLEET_DOC_TYPE_OPTIONS.find(t => t.code === code)?.label;
    if (staticLabel) return staticLabel;
    if (code.startsWith(FLEET_DOC_CODE_TDV_PREFIX)) return code;
    return code;
  }

  /** Pestañas de filtro: catálogo estático + tipos presentes en documentos guardados. */
  distinctDocTypesAcrossFleet(vehicleIds: number[]): { code: string; label: string }[] {
    const map = new Map<string, string>();
    for (const o of FLEET_DOC_TYPE_OPTIONS) {
      map.set(o.code, o.label);
    }
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

  getDocumentById(vehicleId: number, docId: string): FleetComplianceDoc | undefined {
    return this.bucket(vehicleId).docs.find(d => d.id === docId);
  }

  /** Días hasta vencimiento; null si no aplica */
  daysToExpiry(expiryDate: string | null): number | null {
    if (expiryDate == null || expiryDate === '') return null;
    const end = new Date(expiryDate + 'T12:00:00');
    if (isNaN(end.getTime())) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    return diff;
  }

  complianceStatusForDoc(doc: FleetComplianceDoc): FleetDocComplianceStatus {
    if (doc.expiryDate == null || doc.expiryDate === '') return 'NO_CADUCA';
    const d = this.daysToExpiry(doc.expiryDate);
    if (d === null) return 'SIN_VIGENCIA';
    if (d < 0) return 'VENCIDO';
    if (d <= 30) return 'PROXIMO';
    return 'VIGENTE';
  }

  /** Peor escenario entre documentos activos de la unidad (menor cantidad de días a vencimiento). */
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

  createDocument(vehicleId: number, payload: FleetDocRegistroPayload): FleetComplianceDoc {
    const b = this.bucket(vehicleId);
    const now = new Date().toISOString();
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const doc: FleetComplianceDoc = {
      id: this.newId(),
      vehicleId,
      typeCode: payload.typeCode,
      typeLabel,
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
    const b = this.bucket(vehicleId);
    const idx = b.docs.findIndex(d => d.id === docId);
    if (idx < 0) return null;
    const prev = this.cloneDoc(b.docs[idx]);
    this.pushHistory(vehicleId, docId, 'UPDATED', prev, 'Versión anterior archivada en historial');
    const typeLabel =
      (payload.typeLabel && payload.typeLabel.trim()) || this.labelForTypeCode(payload.typeCode);
    const updated: FleetComplianceDoc = {
      ...prev,
      typeCode: payload.typeCode,
      typeLabel,
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

  deleteDocument(vehicleId: number, docId: string): boolean {
    const b = this.bucket(vehicleId);
    const idx = b.docs.findIndex(d => d.id === docId);
    if (idx < 0) return false;
    const removed = this.cloneDoc(b.docs[idx]);
    b.docs.splice(idx, 1);
    this.pushHistory(vehicleId, docId, 'DELETED', removed, 'Documento eliminado del listado activo');
    this.persist(this.read());
    return true;
  }

  /** Vehículos con documentación registrada (para KPI vigente más claro) */
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
}
