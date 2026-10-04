import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TrainingItem {
  id: number;
  name: string;
  audienceCode?: string;
  audienceLabel?: string;
  months?: number[];
  duration?: string;
  methodology?: string;
  plannedCount?: number;
  origin?: string;
  description?: string;
  activityType?: string;
  facilitatorType?: string;
  facilitator?: string;
  place?: string;
  evidencePdfUrl?: string;
  evidencePhotoUrls?: string[];
  materials?: string;
  obligated?: number;
  trained?: number;
  missing?: number;
  percent?: number;
  sessions?: number;
  overdue?: boolean;
}

export interface TrainingYear {
  year: number;
  current?: boolean;
  status?: string;
  canWrite?: boolean;
  program?: string;
  companyName?: string;
  obligatedTotal?: number;
  trainedTotal?: number;
  percent?: number;
  sessionCount?: number;
  overdueTopics?: number;
  availableYears?: number[];
  items?: TrainingItem[];
  info?: string;
  companyShort?: string;
  legalRepresentative?: string;
  logoUrl?: string;
  ruc?: string;
  docCode?: string;
  revisionDate?: string;
  version?: string;
  registerName?: string;
  registerCode?: string;
  registerProcess?: string;
  registerApprovedBy?: string;
  registerDate?: string;
  registerVersion?: string;
  approvalStatus?: string;
  approvedFile?: string;
  approvedAt?: string;
  approvedBy?: string;
  census?: TrainingCensus;
}

export interface TrainingCensus {
  headcount?: number;
  men?: number;
  women?: number;
  other?: number;
  priority?: number;
  direct?: number;
  contractor?: number;
  trainedPeople?: number;
  pendingPeople?: number;
  percentPeople?: number;
  syncAt?: string;
  roles?: TrainingRoleRow[];
  sites?: TrainingSiteRow[];
  operators?: TrainingOperatorRow[];
}

export interface TrainingRoleRow {
  name: string;
  count: number;
  percent: number;
  icon?: string;
}

export interface TrainingSiteRow {
  id: number;
  name: string;
  count: number;
  companyName?: string;
}

export interface TrainingOperatorRow {
  name: string;
  count: number;
}

export interface TrainingPerson {
  id: number;
  fullName: string;
  cedula?: string;
  phone?: string;
  email?: string;
  position?: string;
  trained?: boolean;
}

export interface TrainingMissing {
  itemId: number;
  topicName: string;
  audienceLabel?: string;
  obligated?: number;
  trained?: number;
  missing?: number;
  people?: TrainingPerson[];
}

export interface TrainingSessionRow {
  id: number;
  itemId: number;
  topicName: string;
  sessionDate?: string;
  place?: string;
  hours?: number;
  facilitator?: string;
  presentCount?: number;
  createdBy?: string;
  evidenceUrl?: string;
  evidencePhotoUrls?: string[];
  origin?: string;
  reinduction?: boolean;
  attendees?: TrainingPerson[];
}

export interface TrainingWorker {
  id: number;
  fullName: string;
  cedula?: string;
  position?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  department?: string;
  block?: string;
  contractorCompany?: string;
  contractType?: string;
  hireDate?: string;
  bloodType?: string;
  iess?: string;
  companyCode?: string;
  received?: number;
  pending?: number;
  hoursTotal?: number;
  records?: TrainingReceived[];
  pendingTopics?: TrainingPendingTopic[];
}

export interface TrainingReceived {
  sessionId: number;
  itemId: number;
  topicName: string;
  sessionDate?: string;
  place?: string;
  facilitator?: string;
  hours?: number;
  evidenceUrl?: string;
  origin?: string;
  activityType?: string;
  methodology?: string;
}

export interface TrainingPendingTopic {
  itemId: number;
  topicName: string;
  audienceLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class SsaTrainingService {
  constructor(private http: HttpClient) {}

  private url(ruc: string, path = ''): string {
    return `/api/ssa-training/${encodeURIComponent(ruc)}${path}`;
  }

  year(ruc: string, year?: number): Observable<TrainingYear> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.get<TrainingYear>(this.url(ruc), { params });
  }

  sessions(ruc: string, year?: number): Observable<TrainingSessionRow[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.get<TrainingSessionRow[]>(this.url(ruc, '/sessions'), { params });
  }

  missing(ruc: string, itemId: number): Observable<TrainingMissing> {
    return this.http.get<TrainingMissing>(this.url(ruc, `/items/${itemId}/missing`));
  }

  people(ruc: string, itemId: number): Observable<TrainingPerson[]> {
    return this.http.get<TrainingPerson[]>(this.url(ruc, `/items/${itemId}/people`));
  }

  peopleByAudience(ruc: string, audience?: string): Observable<TrainingPerson[]> {
    let params = new HttpParams();
    if (audience) params = params.set('audience', audience);
    return this.http.get<TrainingPerson[]>(this.url(ruc, '/people'), { params });
  }

  createSession(ruc: string, body: any, file?: File | null, photos?: File[]): Observable<TrainingSessionRow> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    if (file) form.append('file', file);
    (photos || []).forEach(p => form.append('photos', p));
    return this.http.post<TrainingSessionRow>(this.url(ruc, '/sessions'), form);
  }

  workers(ruc: string, year?: number | null, q?: string): Observable<TrainingWorker[]> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    if (q) params = params.set('q', q);
    return this.http.get<TrainingWorker[]>(this.url(ruc, '/workers'), { params });
  }

  worker(ruc: string, employeeId: number, year?: number | null): Observable<TrainingWorker> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.get<TrainingWorker>(this.url(ruc, `/workers/${employeeId}`), { params });
  }

  evidence(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  addEventual(ruc: string, body: Partial<TrainingItem>): Observable<TrainingItem> {
    return this.http.post<TrainingItem>(this.url(ruc, '/items/eventual'), body);
  }

  saveItem(
    ruc: string,
    body: Partial<TrainingItem>,
    itemId?: number | null,
    pdf?: File | null,
    photos?: File[]
  ): Observable<TrainingItem> {
    const hasFiles = !!pdf || !!(photos && photos.length);
    if (hasFiles) {
      const form = new FormData();
      form.append('data', new Blob([JSON.stringify(body)], { type: 'application/json' }));
      if (pdf) form.append('pdf', pdf);
      (photos || []).forEach(p => form.append('photos', p));
      return itemId
        ? this.http.put<TrainingItem>(this.url(ruc, `/items/${itemId}`), form)
        : this.http.post<TrainingItem>(this.url(ruc, '/items/eventual'), form);
    }
    return itemId ? this.updateItem(ruc, itemId, body) : this.addEventual(ruc, body);
  }

  updateItem(ruc: string, itemId: number, body: Partial<TrainingItem>): Observable<TrainingItem> {
    return this.http.put<TrainingItem>(this.url(ruc, `/items/${itemId}`), body);
  }

  deleteItem(ruc: string, itemId: number): Observable<void> {
    return this.http.delete<void>(this.url(ruc, `/items/${itemId}`));
  }

  approveDocument(ruc: string, year: number | null | undefined, file: File): Observable<TrainingYear> {
    const form = new FormData();
    form.append('file', file);
    let params = new HttpParams();
    if (year != null) params = params.set('year', String(year));
    return this.http.post<TrainingYear>(this.url(ruc, '/document'), form, { params });
  }
}
