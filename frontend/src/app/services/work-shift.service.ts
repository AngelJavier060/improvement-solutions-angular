import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';
import { WorkShift } from '../models/work-shift.model';

@Injectable({
  providedIn: 'root'
})
export class WorkShiftService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/work-shifts');
  }

  getAll(): Observable<WorkShift[]> {
    return this.http.get<WorkShift[]>(this.apiUrl);
  }

  getById(id: number): Observable<WorkShift> {
    return this.http.get<WorkShift>(`${this.apiUrl}/${id}`);
  }

  create(workShift: WorkShift): Observable<WorkShift> {
    return this.http.post<WorkShift>(this.apiUrl, workShift);
  }

  update(id: number, workShift: WorkShift): Observable<WorkShift> {
    return this.http.put<WorkShift>(`${this.apiUrl}/${id}`, workShift);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
