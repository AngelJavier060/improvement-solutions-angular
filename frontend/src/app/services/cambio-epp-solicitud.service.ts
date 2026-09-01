import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { FileService } from './file.service';

export interface CambioEppFormSnapshot {
  empresa: string;
  tipoAcontecimiento: string;
  sectionCode: string;
  sectionLabel: string;
  nReporte: string;
  nombreTrabajador: string;
  cedula: string;
  cargo: string;
  area: string;
  estadoEpi: string;
  fechaElaboracion: string;
  fechaNotificacion: string;
  fechaDotacion: string;
  talla: string;
  accionSuspension: boolean;
  accionMulta: boolean;
  accionNotificacion: boolean;
  accionCambio: boolean;
  severidad: string;
  observaciones: string;
  nombreEmisor: string;
  cargoEmisor: string;
}

/**
 * Flujo persistido en BD (API /api/inventory/{ruc}/cambio-epp):
 * 1) PENDIENTE_APROBACION — PDF generado; falta subir firmado
 * 2) EN_ESPERA_INVENTARIO — firmado subido; Inventario revisa en Nueva Salida
 * 3) VALIDADO_ENTREGADO — Inventario validó y doto el EPP
 * 4) RECHAZADO — Inventario canceló/rechazó con motivo
 */
export type CambioEppSolicitudStatus =
  | 'PENDIENTE_APROBACION'
  | 'EN_ESPERA_INVENTARIO'
  | 'VALIDADO_FIRMADO'
  | 'VALIDADO_ENTREGADO'
  | 'ENTREGADO'
  | 'RECHAZADO';

export interface CambioEppSolicitud {
  id: string;
  nReporte: string;
  trabajador: string;
  cedula: string;
  cargo: string;
  area: string;
  tipoAcontecimiento: string;
  sectionCode?: string;
  sectionLabel?: string;
  estadoEpi: string;
  severidad: string;
  fechaElaboracion: string;
  status: CambioEppSolicitudStatus;
  createdAt: string;
  formSnapshot: CambioEppFormSnapshot;
  signedFileName?: string;
  signedFilePath?: string;
  signedUploadedAt?: string;
  outputId?: number;
  outputNumber?: string;
  deliveredAt?: string;
  rejectedReason?: string;
  rejectedAt?: string;
}

export interface CambioEppSignedFile {
  name: string;
  type: string;
  dataUrl?: string;
  blob?: Blob;
  path?: string;
}

@Injectable({ providedIn: 'root' })
export class CambioEppSolicitudService {
  constructor(
    private http: HttpClient,
    private fileService: FileService
  ) {}

  private base(ruc: string): string {
    return `/api/inventory/${ruc}/cambio-epp`;
  }

  list(ruc: string): Observable<CambioEppSolicitud[]> {
    return this.http.get<any[]>(this.base(ruc)).pipe(
      map(rows => (rows || []).map(x => this.normalize(x))),
      catchError(() => of([]))
    );
  }

  listPendientesEntrega(ruc: string): Observable<CambioEppSolicitud[]> {
    return this.http.get<any[]>(`${this.base(ruc)}/pendientes-entrega`).pipe(
      map(rows => (rows || []).map(x => this.normalize(x))),
      catchError(() => of([]))
    );
  }

  /** Tipos de acontecimiento asignados a la empresa (Inventario-Bodega). */
  listTiposAcontecimiento(ruc: string): Observable<Array<{ id?: number; name: string; description?: string }>> {
    return this.http.get<Array<{ id?: number; name: string; description?: string }>>(
      `${this.base(ruc)}/tipos-acontecimiento`
    ).pipe(catchError(() => of([])));
  }

  /** Estados del EPI asignados a la empresa (Inventario-Bodega). */
  listEstadosEpi(ruc: string): Observable<Array<{ id?: number; name: string; description?: string }>> {
    return this.http.get<Array<{ id?: number; name: string; description?: string }>>(
      `${this.base(ruc)}/estados-epi`
    ).pipe(catchError(() => of([])));
  }

  nextReportNumber(ruc: string): Observable<string> {
    return this.http.get<{ nReporte?: string }>(`${this.base(ruc)}/next-report-number`).pipe(
      map(r => r?.nReporte || `REP-${new Date().getFullYear()}-00001`),
      catchError(() => of(`REP-${new Date().getFullYear()}-00001`))
    );
  }

  create(ruc: string, item: Partial<CambioEppSolicitud>): Observable<CambioEppSolicitud> {
    return this.http.post<any>(this.base(ruc), {
      nReporte: item.nReporte,
      trabajador: item.trabajador,
      cedula: item.cedula,
      cargo: item.cargo,
      area: item.area,
      tipoAcontecimiento: item.tipoAcontecimiento,
      sectionCode: item.sectionCode,
      sectionLabel: item.sectionLabel,
      estadoEpi: item.estadoEpi,
      severidad: item.severidad,
      fechaElaboracion: item.fechaElaboracion,
      status: item.status || 'PENDIENTE_APROBACION',
      formSnapshot: item.formSnapshot || this.emptySnapshot()
    }).pipe(map(x => this.normalize(x)));
  }

  /** Sube PDF firmado a disco y marca EN_ESPERA_INVENTARIO en BD. */
  uploadSignedAndMarkEnEspera(ruc: string, id: string, file: File): Observable<CambioEppSolicitud> {
    return this.fileService.uploadFileToDirectory('cambio_epp', file).pipe(
      switchMap(resp => {
        const path = resp?.url || '';
        if (!path) {
          return throwError(() => new Error('No se pudo subir el documento firmado.'));
        }
        return this.http.patch<any>(`${this.base(ruc)}/${id}/en-espera-inventario`, {
          signedFilePath: path,
          signedFileName: file.name || resp.filename || 'firmado.pdf'
        });
      }),
      map(x => this.normalize(x))
    );
  }

  markEntregado(ruc: string, id: string, outputId?: number, outputNumber?: string): Observable<CambioEppSolicitud> {
    return this.http.patch<any>(`${this.base(ruc)}/${id}/entregado`, {
      outputId: outputId ?? null,
      outputNumber: outputNumber || null
    }).pipe(map(x => this.normalize(x)));
  }

  markRechazado(ruc: string, id: string, reason: string): Observable<CambioEppSolicitud> {
    return this.http.patch<any>(`${this.base(ruc)}/${id}/rechazar`, {
      rejectedReason: reason
    }).pipe(map(x => this.normalize(x)));
  }

  /** Obtiene el PDF firmado desde el servidor (para ver / reenviar a salida). */
  getSignedFile(ruc: string, solicitud: CambioEppSolicitud): Observable<CambioEppSignedFile | null> {
    const path = String(solicitud?.signedFilePath || '').trim();
    if (!path) return of(null);
    const url = this.fileService.getFileUrl(path);
    return this.fileService.downloadFile(url).pipe(
      map(blob => ({
        name: solicitud.signedFileName || 'documento-firmado.pdf',
        type: blob.type || 'application/pdf',
        blob,
        path
      })),
      catchError(() => of(null))
    );
  }

  signedFileToFile(signed: CambioEppSignedFile, fallbackName: string): File | null {
    if (!signed?.blob) return null;
    return new File(
      [signed.blob],
      signed.name || fallbackName || 'firmado.pdf',
      { type: signed.type || 'application/pdf' }
    );
  }

  /** Convierte blob a object URL para visor (revocar después). */
  blobToObjectUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  isEnEsperaInventario(status: string | undefined): boolean {
    return status === 'EN_ESPERA_INVENTARIO' || status === 'VALIDADO_FIRMADO';
  }

  isValidadoEntregado(status: string | undefined): boolean {
    return status === 'VALIDADO_ENTREGADO' || status === 'ENTREGADO';
  }

  emptySnapshot(): CambioEppFormSnapshot {
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

  private normalize(x: any): CambioEppSolicitud {
    const snap = x?.formSnapshot && typeof x.formSnapshot === 'object'
      ? { ...this.emptySnapshot(), ...x.formSnapshot }
      : this.emptySnapshot();
    let status = String(x?.status || 'PENDIENTE_APROBACION');
    if (status === 'VALIDADO_FIRMADO') status = 'EN_ESPERA_INVENTARIO';
    if (status === 'ENTREGADO') status = 'VALIDADO_ENTREGADO';
    return {
      id: String(x?.id ?? ''),
      nReporte: x?.nReporte || '',
      trabajador: x?.trabajador || '',
      cedula: x?.cedula || '',
      cargo: x?.cargo || '',
      area: x?.area || '',
      tipoAcontecimiento: x?.tipoAcontecimiento || '',
      sectionCode: x?.sectionCode || '',
      sectionLabel: x?.sectionLabel || '',
      estadoEpi: x?.estadoEpi || '',
      severidad: x?.severidad || '',
      fechaElaboracion: x?.fechaElaboracion || '',
      status: status as CambioEppSolicitudStatus,
      createdAt: x?.createdAt || '',
      formSnapshot: snap,
      signedFileName: x?.signedFileName || undefined,
      signedFilePath: x?.signedFilePath || undefined,
      signedUploadedAt: x?.signedUploadedAt || undefined,
      outputId: x?.outputId ?? undefined,
      outputNumber: x?.outputNumber || undefined,
      deliveredAt: x?.deliveredAt || undefined,
      rejectedReason: x?.rejectedReason || undefined,
      rejectedAt: x?.rejectedAt || undefined
    };
  }
}
