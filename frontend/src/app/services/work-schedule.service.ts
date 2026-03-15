import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';
import { WorkSchedule } from '../models/work-schedule.model';

@Injectable({
  providedIn: 'root'
})
export class WorkScheduleService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/work-schedules');
  }

  getAll(): Observable<WorkSchedule[]> {
    return this.http.get<WorkSchedule[]>(this.apiUrl);
  }

  getById(id: number): Observable<WorkSchedule> {
    return this.http.get<WorkSchedule>(`${this.apiUrl}/${id}`);
  }

  create(workSchedule: WorkSchedule): Observable<WorkSchedule> {
    return this.http.post<WorkSchedule>(this.apiUrl, workSchedule);
  }

  update(id: number, workSchedule: WorkSchedule): Observable<WorkSchedule> {
    return this.http.put<WorkSchedule>(`${this.apiUrl}/${id}`, workSchedule);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
