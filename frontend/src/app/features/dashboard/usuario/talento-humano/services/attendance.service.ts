import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

// ─────────────── Interfaces / Modelos ───────────────

export type DayType = 'T' | 'D' | 'EX' | 'V' | 'P' | 'E' | 'A';

export interface DayTypeInfo {
  label: string;
  cls: string;
  dotColor: string;
}

export const DAY_TYPES: Record<DayType, DayTypeInfo> = {
  T:  { label: 'Trabajo',     cls: 'day-T',  dotColor: '#22c55e' },
  D:  { label: 'Descanso',    cls: 'day-D',  dotColor: '#94a3b8' },
  EX: { label: 'Extra',       cls: 'day-EX', dotColor: '#f97316' },
  V:  { label: 'Vacaciones',  cls: 'day-V',  dotColor: '#3b82f6' },
  P:  { label: 'Permiso',     cls: 'day-P',  dotColor: '#eab308' },
  E:  { label: 'Enfermedad',  cls: 'day-E',  dotColor: '#ec4899' },
  A:  { label: 'Accidente',   cls: 'day-A',  dotColor: '#dc2626' },
};

export interface WorkDayEntry {
  day: number;
  date: string;
  dayType: DayType;
  notes?: string;
  holiday?: boolean;
  holidayName?: string;
}

export interface DayTotals {
  T: number; D: number; EX: number; V: number; P: number; E: number; A: number;
}

export interface EmployeeSheetRow {
  employeeId: number;
  fullName: string;
  position: string;
  cedula: string;
  codigoEmpresa?: string;
  departmentId?: number | null;
  departmentName?: string | null;
  workScheduleId?: number | null;
  workScheduleName?: string | null;
  workScheduleStartDate?: string | null;
  // Horario de trabajo (turno) tomado de la ficha del empleado
  workShiftId?: number | null;
  workShiftName?: string | null;
  days: WorkDayEntry[];
  totals: DayTotals;
  /** Días T guardados explícitamente en BD (excluye auto-generados del horario) */
  savedT?: number;
  /** Días EX guardados explícitamente en BD */
  savedEX?: number;
}

/** Respuesta de GET /api/attendance/{id}/consolidado-hhtt */
export interface ConsolidadoHhttSummary {
  year: number;
  standardHoursPerDay: number;
  ordinaryHoursYtd: number;
  extraHoursYtd: number;
  totalHoursYtd: number;
  previousYearTotalHours: number;
  previousYearOrdinaryHours: number;
  previousYearExtraHours: number;
  ytdVsPreviousYearPct: number;
  averageMonthlyHours: number;
  extraHoursSharePct: number;
  activeEmployees: number;
  monthsTrend: { month: number; label: string; ordinHours: number; extraHours: number }[];
  byDepartment: { nombre: string; hours: number; pct: number }[];
  detailRows: {
    mesSort: number;
    mesAnio: string;
    departamento: string;
    horasOrdinarias: number;
    horasExtras: number;
    totalHh: number;
    numColaboradores: number;
  }[];
  departmentOptions: { value: string; label: string }[];
  projectOptions: { value: string; label: string }[];
}

export interface MonthlyKpis {
  T: number; D: number; EX: number; V: number; P: number; E: number; A: number;
  overtimeRecords: number;
  vacationRecords: number;
  permissionRecords: number;
  incidentRecords: number;
  year: number;
  month: number;
}

export interface OvertimeRecord {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  cedula?: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  hoursTotal?: number;
  reason: string;
  notes?: string;
  createdAt?: string;
}

export interface OvertimeActivity {
  id?: number;
  activityDate: string;
  startTime: string;
  endTime: string;
  description: string;
  supportDoc?: string;
  hoursTotal?: number;
}

export interface OvertimeRequest {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  employeeCedula?: string;
  employeePosition?: string;
  reportPeriod: string;
  supervisorName?: string;
  department?: string;
  area?: string;
  recognitionType?: string;
  status?: string;
  signedPdfPath?: string;
  notes?: string;
  createdAt?: string;
  approvedAt?: string;
  activities: OvertimeActivity[];
  totalHours?: number;
  totalDays?: number;
}

export interface VacationRecord {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  cedula?: string;
  startDate: string;
  endDate: string;
  daysTaken?: number;
  daysAccumulated?: number;
  status?: string;
  notes?: string;
  signedPdfPath?: string | null;
  createdAt?: string;
}

export interface PermissionRecord {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  cedula?: string;
  permissionDate: string;
  permissionType: string;
  hoursRequested?: number;
  reason: string;
  status?: string;
  notes?: string;
  signedPdfPath?: string | null;
  createdAt?: string;
}

export interface IncidentRecord {
  id?: number;
  employeeId?: number;
  employeeName?: string;
  cedula?: string;
  incidentDate: string;
  incidentTime?: string;
  incidentType: string;
  description: string;
  location?: string;
  severity?: string;
  notes?: string;
  createdAt?: string;
}

export interface SafetyIndicesKpis {
  lesiones: number;
  diasPerdidos: number;
  horasHombre: number;
  if: number;
  trif: number;
  ig: number;
  tr: number;
}

export interface SafetyIndicesMonth {
  month: number;
  label: string;
  mesAnio: string;
  lesiones: number;
  diasPerdidos: number;
  horasHombre: number;
  if: number;
  trif: number;
  ig: number;
  tr: number;
}

export interface SafetyIndicesSummary {
  year: number;
  ytd: SafetyIndicesKpis;
  months: SafetyIndicesMonth[];
}

// ─────────────── Service ───────────────

@Injectable({ providedIn: 'root' })
export class AttendanceService {

  private apiUrl(businessId: number | string): string {
    return `${environment.apiUrl}/api/attendance/${businessId}`;
  }

  constructor(private http: HttpClient) {}

  // KPIs
  getKpis(businessId: number, year: number, month: number): Observable<MonthlyKpis> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<MonthlyKpis>(`${this.apiUrl(businessId)}/kpis`, { params });
  }

  // Planilla mensual
  getMonthlySheet(businessId: number, year: number, month: number): Observable<EmployeeSheetRow[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<EmployeeSheetRow[]>(`${this.apiUrl(businessId)}/sheet`, { params });
  }

  /** Consolidado anual HH (misma lógica que planilla mensual + horas extra registradas) */
  getConsolidadoHhtt(
    businessId: number,
    year: number,
    standardHoursPerDay = 8
  ): Observable<ConsolidadoHhttSummary> {
    let params = new HttpParams().set('year', String(year));
    if (standardHoursPerDay != null && standardHoursPerDay > 0) {
      params = params.set('standardHoursPerDay', String(standardHoursPerDay));
    }
    return this.http.get<ConsolidadoHhttSummary>(`${this.apiUrl(businessId)}/consolidado-hhtt`, { params });
  }

  saveWorkDay(businessId: number, employeeId: number, date: string, dayType: DayType, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl(businessId)}/sheet/${employeeId}/day`, { date, dayType, notes });
  }

  deleteWorkDay(businessId: number, employeeId: number, date: string): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.delete(`${this.apiUrl(businessId)}/sheet/${employeeId}/day`, { params });
  }

  saveWorkDaysBatch(businessId: number, employeeId: number, days: { date: string; dayType: string; notes?: string }[]): Observable<any> {
    return this.http.post(`${this.apiUrl(businessId)}/sheet/${employeeId}/batch`, days);
  }

  setWorkScheduleStartDate(businessId: number, employeeId: number, startDate: string | null): Observable<any> {
    return this.http.put(`${this.apiUrl(businessId)}/employees/${employeeId}/work-schedule-start`, { startDate });
  }

  // Day type computation for a given employee and date
  getEmployeeDayType(businessId: number, employeeId: number, date: string): Observable<{ employeeId: number; date: string; dayType: string | null }>{
    const params = new HttpParams().set('date', date);
    return this.http.get<{ employeeId: number; date: string; dayType: string | null }>(`${this.apiUrl(businessId)}/employees/${employeeId}/day-type`, { params });
  }

  // Check if a date already has a permission, vacation or overtime for the given employee
  checkDateConflict(businessId: number, employeeId: number, date: string): Observable<{ conflict: boolean; type: string; detail: string }> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{ conflict: boolean; type: string; detail: string }>(`${this.apiUrl(businessId)}/employees/${employeeId}/date-conflict`, { params });
  }

  // ── Overtime Requests (nueva solicitud con múltiples actividades) ──────────
  getOvertimeRequests(businessId: number, period?: string): Observable<OvertimeRequest[]> {
    let params = new HttpParams();
    if (period) params = params.set('period', period);
    return this.http.get<OvertimeRequest[]>(`${this.apiUrl(businessId)}/overtime-requests`, { params });
  }

  createOvertimeRequest(businessId: number, employeeId: number, dto: OvertimeRequest): Observable<OvertimeRequest> {
    return this.http.post<OvertimeRequest>(`${this.apiUrl(businessId)}/overtime-requests/employee/${employeeId}`, dto);
  }

  uploadOvertimeSignedPdf(businessId: number, requestId: number, file: File): Observable<OvertimeRequest> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<OvertimeRequest>(`${this.apiUrl(businessId)}/overtime-requests/${requestId}/upload-signed`, formData);
  }

  updateOvertimeStatus(businessId: number, requestId: number, status: string): Observable<OvertimeRequest> {
    return this.http.patch<OvertimeRequest>(`${this.apiUrl(businessId)}/overtime-requests/${requestId}/status`, { status });
  }

  deleteOvertimeRequest(businessId: number, requestId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/overtime-requests/${requestId}`);
  }

  getOvertimePdfUrl(businessId: number, requestId: number): string {
    return `${this.apiUrl(businessId)}/overtime-requests/${requestId}/pdf`;
  }

  getOvertimeSignedPdf(businessId: number, requestId: number): Observable<Blob> {
    const url = `${this.apiUrl(businessId)}/overtime-requests/${requestId}/pdf`;
    return this.http.get(url, { responseType: 'blob' as 'json' }) as Observable<Blob>;
  }

  // Horas extra
  getOvertime(businessId: number, year?: number, month?: number): Observable<OvertimeRecord[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', year);
    if (month != null) params = params.set('month', month);
    return this.http.get<OvertimeRecord[]>(`${this.apiUrl(businessId)}/overtime`, { params });
  }

  saveOvertime(businessId: number, employeeId: number, dto: OvertimeRecord): Observable<OvertimeRecord> {
    return this.http.post<OvertimeRecord>(`${this.apiUrl(businessId)}/overtime/${employeeId}`, dto);
  }

  deleteOvertime(businessId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/overtime/${id}`);
  }

  // Vacaciones
  getVacations(businessId: number, year?: number, month?: number): Observable<VacationRecord[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', year);
    if (month != null) params = params.set('month', month);
    return this.http.get<VacationRecord[]>(`${this.apiUrl(businessId)}/vacations`, { params });
  }

  saveVacation(businessId: number, employeeId: number, dto: VacationRecord): Observable<VacationRecord> {
    return this.http.post<VacationRecord>(`${this.apiUrl(businessId)}/vacations/${employeeId}`, dto);
  }

  // Subir PDF firmado de vacaciones y actualizar estado
  uploadVacationSignedPdf(businessId: number, vacationId: number, file: File): Observable<VacationRecord> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<VacationRecord>(`${this.apiUrl(businessId)}/vacations/${vacationId}/upload-signed`, formData);
  }

  updateVacationStatus(businessId: number, vacationId: number, status: string): Observable<VacationRecord> {
    return this.http.patch<VacationRecord>(`${this.apiUrl(businessId)}/vacations/${vacationId}/status`, { status });
  }

  getVacationPdfUrl(businessId: number, vacationId: number): string {
    return `${this.apiUrl(businessId)}/vacations/${vacationId}/pdf`;
  }

  getVacationPdfBlob(businessId: number, vacationId: number) {
    const url = `${this.apiUrl(businessId)}/vacations/${vacationId}/pdf`;
    return this.http.get(url, { responseType: 'blob' });
  }

  deleteVacation(businessId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/vacations/${id}`);
  }

  // Permisos
  getPermissions(businessId: number, year?: number, month?: number): Observable<PermissionRecord[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', year);
    if (month != null) params = params.set('month', month);
    return this.http.get<PermissionRecord[]>(`${this.apiUrl(businessId)}/permissions`, { params });
  }

  getPermissionById(businessId: number, permissionId: number): Observable<PermissionRecord> {
    return this.http.get<PermissionRecord>(`${this.apiUrl(businessId)}/permissions/${permissionId}`);
  }

  savePermission(businessId: number, employeeId: number, dto: PermissionRecord): Observable<PermissionRecord> {
    return this.http.post<PermissionRecord>(`${this.apiUrl(businessId)}/permissions/${employeeId}`, dto);
  }

  updatePermission(businessId: number, permissionId: number, dto: PermissionRecord): Observable<PermissionRecord> {
    return this.http.put<PermissionRecord>(`${this.apiUrl(businessId)}/permissions/${permissionId}`, dto);
  }

  updatePermissionStatus(businessId: number, permissionId: number, status: string): Observable<PermissionRecord> {
    return this.http.patch<PermissionRecord>(`${this.apiUrl(businessId)}/permissions/${permissionId}/status`, { status });
  }

  uploadPermissionSignedPdf(businessId: number, permissionId: number, file: File): Observable<PermissionRecord> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<PermissionRecord>(`${this.apiUrl(businessId)}/permissions/${permissionId}/upload-signed`, formData);
  }

  deletePermission(businessId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/permissions/${id}`);
  }

  getPermissionPdfUrl(businessId: number, permissionId: number): string {
    return `${this.apiUrl(businessId)}/permissions/${permissionId}/pdf`;
  }

  getPermissionPdfBlob(businessId: number, permissionId: number) {
    const url = `${this.apiUrl(businessId)}/permissions/${permissionId}/pdf`;
    return this.http.get(url, { responseType: 'blob' });
  }

  // Incidentes
  getIncidents(businessId: number, year?: number, month?: number): Observable<IncidentRecord[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', year);
    if (month != null) params = params.set('month', month);
    return this.http.get<IncidentRecord[]>(`${this.apiUrl(businessId)}/incidents`, { params });
  }

  saveIncident(businessId: number, employeeId: number, dto: IncidentRecord): Observable<IncidentRecord> {
    return this.http.post<IncidentRecord>(`${this.apiUrl(businessId)}/incidents/${employeeId}`, dto);
  }

  deleteIncident(businessId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/incidents/${id}`);
  }

  // Histórico de jornadas
  getScheduleHistory(businessId: number, employeeId: number): Observable<WorkScheduleHistoryEntry[]> {
    return this.http.get<WorkScheduleHistoryEntry[]>(`${this.apiUrl(businessId)}/employees/${employeeId}/schedule-history`);
  }

  addScheduleHistory(businessId: number, employeeId: number, dto: {
    workScheduleId: number;
    startDate: string;
    endDate?: string | null;
    cycleStartDate?: string | null;
    dailyHours?: number | null;
    notes?: string | null;
  }): Observable<WorkScheduleHistoryEntry> {
    return this.http.post<WorkScheduleHistoryEntry>(`${this.apiUrl(businessId)}/employees/${employeeId}/schedule-history`, {
      workScheduleId: String(dto.workScheduleId),
      startDate: dto.startDate,
      endDate: dto.endDate || '',
      cycleStartDate: dto.cycleStartDate || '',
      dailyHours: dto.dailyHours != null ? String(dto.dailyHours) : '',
      notes: dto.notes || ''
    });
  }

  updateScheduleHistory(businessId: number, historyId: number, dto: {
    endDate?: string | null;
    cycleStartDate?: string | null;
    dailyHours?: number | null;
    notes?: string | null;
  }): Observable<WorkScheduleHistoryEntry> {
    return this.http.put<WorkScheduleHistoryEntry>(`${this.apiUrl(businessId)}/schedule-history/${historyId}`, {
      endDate: dto.endDate || '',
      cycleStartDate: dto.cycleStartDate || '',
      dailyHours: dto.dailyHours != null ? String(dto.dailyHours) : '',
      notes: dto.notes || ''
    });
  }

  deleteScheduleHistory(businessId: number, historyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/schedule-history/${historyId}`);
  }

  /** Índices de seguridad (IF, TRIF, IG, TR) combinando HHTT + incidentes del año */
  getSafetyIndices(businessId: number, year: number): Observable<SafetyIndicesSummary> {
    const params = new HttpParams().set('year', String(year));
    return this.http.get<SafetyIndicesSummary>(`${this.apiUrl(businessId)}/safety-indices`, { params });
  }

  // Cierre mensual
  getClosures(businessId: number): Observable<MonthlyClosureEntry[]> {
    return this.http.get<MonthlyClosureEntry[]>(`${this.apiUrl(businessId)}/closures`);
  }

  getClosure(businessId: number, year: number, month: number): Observable<MonthlyClosureEntry> {
    return this.http.get<MonthlyClosureEntry>(`${this.apiUrl(businessId)}/closures/${year}/${month}`);
  }

  closeMonth(businessId: number, year: number, month: number, closedBy?: string, notes?: string): Observable<MonthlyClosureEntry> {
    return this.http.post<MonthlyClosureEntry>(`${this.apiUrl(businessId)}/closures/${year}/${month}/close`, { closedBy, notes });
  }

  approveMonth(businessId: number, year: number, month: number, approvedBy?: string, signedPdfPath?: string): Observable<MonthlyClosureEntry> {
    return this.http.post<MonthlyClosureEntry>(`${this.apiUrl(businessId)}/closures/${year}/${month}/approve`, { approvedBy, signedPdfPath });
  }

  reopenMonth(businessId: number, year: number, month: number): Observable<MonthlyClosureEntry> {
    return this.http.post<MonthlyClosureEntry>(`${this.apiUrl(businessId)}/closures/${year}/${month}/reopen`, {});
  }

  uploadSignedPdf(businessId: number, year: number, month: number, file: File): Observable<MonthlyClosureEntry> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<MonthlyClosureEntry>(`${this.apiUrl(businessId)}/closures/${year}/${month}/upload-signed`, formData);
  }

  getClosureSignedPdf(businessId: number, year: number, month: number): Observable<Blob> {
    const url = `${this.apiUrl(businessId)}/closures/${year}/${month}/signed-pdf`;
    return this.http.get(url, { responseType: 'blob' as 'json' }) as Observable<Blob>;
  }

  // ─────────────── Holidays ───────────────
}

export interface HolidayDto {
  id: number;
  date: string;
  name: string;
  active: boolean;
  scope: 'NATIONAL' | 'BUSINESS';
  businessId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AttendanceHolidayService {
  constructor(private http: HttpClient) {}

  private apiUrl(businessId: number | string): string {
    return `${environment.apiUrl}/api/attendance/${businessId}`;
  }

  getHolidays(businessId: number, year: number, month: number): Observable<HolidayDto[]> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<HolidayDto[]>(`${this.apiUrl(businessId)}/holidays`, { params });
  }

  addHoliday(businessId: number, payload: { date: string; name: string }): Observable<HolidayDto> {
    return this.http.post<HolidayDto>(`${this.apiUrl(businessId)}/holidays`, payload);
  }

  deleteHoliday(businessId: number, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl(businessId)}/holidays/${id}`);
  }
}

export interface WorkScheduleHistoryEntry {
  id: number;
  employeeId: number;
  employeeName: string;
  workScheduleId: number | null;
  workScheduleName: string | null;
  startDate: string;
  endDate: string | null;
  cycleStartDate: string | null;
  dailyHours: number | null;
  notes: string | null;
  createdAt: string;
}

export interface MonthlyClosureEntry {
  id?: number;
  businessId?: number;
  year: number;
  month: number;
  status: 'OPEN' | 'CLOSED' | 'APPROVED';
  closedAt?: string | null;
  closedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  pdfPath?: string | null;
  signedPdfPath?: string | null;
  peopleCount?: number | null;
  hhttTotalHours?: number | null;
  notes?: string | null;
  createdAt?: string;
}
