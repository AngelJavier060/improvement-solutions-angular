import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';

export interface GerenciaViajeDto {
  id?: number;
  businessId?: number;
  businessName?: string;
  businessRuc?: string;
  codigo?: string;
  fechaHora?: string;
  conductor: string;
  cedula: string;
  vehiculoInicio?: string;
  kmInicial?: number;
  telefono?: string;
  cargo?: string;
  area?: string;
  proyecto?: string;
  motivo?: string;
  origen?: string;
  destino?: string;
  fechaSalida?: string;
  horaSalida?: string;
  licenciaVigente?: string;
  manejoDefensivo?: string;
  inspeccionVehiculo?: string;
  mediosComunicacion?: string;
  testAlcohol?: string;
  llevaPasajeros?: string;
  pasajeros?: string;
  tipoVehiculo?: string;
  convoy?: string;
  unidadesConvoy?: string;
  tipoCarretera?: string;
  estadoVia?: string;
  clima?: string;
  distancia?: string;
  tipoCarga?: string;
  otrosPeligros?: string;
  catalogoOtrosPeligros?: string;
  horasConduccion?: string;
  horarioViaje?: string;
  descansoConduc?: string;
  riesgosVia?: string;
  medidasControl?: string;
  medidasControlTomadasViaje?: string;
  paradasPlanificadas?: string;
  kmFinal?: number;
  fechaCierre?: string;
  estado?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;

  /** Calculados en backend al obtener por id (metodología de la empresa). */
  scoreA?: number | null;
  scoreB?: number | null;
  scoreC?: number | null;
  scoreD?: number | null;
  scoreE?: number | null;
  scoreF?: number | null;
  scoreG?: number | null;
  scoreH?: number | null;
  scoreI?: number | null;
  scoreJ?: number | null;
  scoreTotal?: number | null;
  nivelRiesgo?: string | null;
  nivelRiesgoRomano?: string | null;
  aceptacionGerencia?: string | null;
}

export interface GerenciaViajeStats {
  total: number;
  activos: number;
  completados: number;
}

@Injectable({
  providedIn: 'root'
})
export class GerenciaViajeService {

  private readonly baseUrl = '/api/gerencias-viajes';

  constructor(private http: HttpClient) {}

  getByRuc(ruc: string): Observable<GerenciaViajeDto[]> {
    return this.http.get<GerenciaViajeDto[]>(`${this.baseUrl}/business/${ruc}`);
  }

  getById(id: number): Observable<GerenciaViajeDto> {
    return this.http.get<GerenciaViajeDto>(`${this.baseUrl}/${id}`);
  }

  create(ruc: string, dto: GerenciaViajeDto): Observable<GerenciaViajeDto> {
    return this.http.post<GerenciaViajeDto>(`${this.baseUrl}/business/${ruc}`, dto);
  }

  update(id: number, dto: GerenciaViajeDto): Observable<GerenciaViajeDto> {
    return this.http.put<GerenciaViajeDto>(`${this.baseUrl}/${id}`, dto);
  }

  updateEstado(id: number, estado: string): Observable<GerenciaViajeDto> {
    return this.http.patch<GerenciaViajeDto>(`${this.baseUrl}/${id}/estado`, { estado });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getStats(ruc: string): Observable<GerenciaViajeStats> {
    return this.http.get<GerenciaViajeStats>(`${this.baseUrl}/business/${ruc}/stats`);
  }

  getByConductor(ruc: string, cedula: string): Observable<GerenciaViajeDto[]> {
    return this.http.get<GerenciaViajeDto[]>(`${this.baseUrl}/business/${ruc}/conductor/${cedula}`);
  }

  getNextCodigo(ruc: string): Observable<{ codigo: string }> {
    return this.http.get<{ codigo: string }>(`${this.baseUrl}/business/${ruc}/next-codigo`);
  }

  /** Gerencia abierta del conductor, o null si no hay (API devuelve 200 + JSON null; 404 se trata como null por compatibilidad). */
  getAbiertaPorConductor(ruc: string, cedula: string): Observable<GerenciaViajeDto | null> {
    const url = `${this.baseUrl}/business/${encodeURIComponent(ruc)}/conductor/${encodeURIComponent(cedula)}/abierta`;
    return this.http.get<GerenciaViajeDto | null>(url).pipe(
      map((body) => (body == null ? null : body)),
      catchError((err) => {
        if (err.status === 404) return of(null);
        return throwError(() => err);
      })
    );
  }

  /** Gerencia abierta para la placa (misma empresa), o null. Alineado con la app móvil. */
  getAbiertaPorVehiculo(ruc: string, placa: string): Observable<GerenciaViajeDto | null> {
    const url = `${this.baseUrl}/business/${encodeURIComponent(ruc)}/vehiculo/${encodeURIComponent(placa.trim())}/abierta`;
    return this.http.get<GerenciaViajeDto | null>(url).pipe(
      map((body) => (body == null ? null : body)),
      catchError((err) => {
        if (err.status === 404) return of(null);
        return throwError(() => err);
      })
    );
  }

  /** Último km final de viajes cerrados para la placa (misma empresa). */
  getUltimoKmPorPlaca(ruc: string, placa: string): Observable<number | null> {
    const url = `${this.baseUrl}/business/${encodeURIComponent(ruc)}/vehiculo/${encodeURIComponent(placa.trim())}/ultimo-km`;
    return this.http.get<{ ultimoKm: number | null }>(url).pipe(
      map((r) => (r.ultimoKm != null ? Number(r.ultimoKm) : null))
    );
  }

  cerrarViaje(id: number, payload: { kmFinal: number; fechaCierre: string }): Observable<GerenciaViajeDto> {
    return this.http.patch<GerenciaViajeDto>(`${this.baseUrl}/${id}/cierre`, payload);
  }
}
