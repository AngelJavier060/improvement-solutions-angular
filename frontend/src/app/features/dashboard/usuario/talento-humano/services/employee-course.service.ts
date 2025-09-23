import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeeCourseFile {
  id: number;
  file: string; // public URL
  file_name?: string;
  file_type?: string;
}

export interface EmployeeCourseResponse {
  id: number;
  business_employee_id: number;
  course: { id: number; name: string };
  issue_date?: string; // yyyy-MM-dd
  expiry_date?: string; // yyyy-MM-dd
  hours?: number;
  score?: string;
  observations?: string;
  active?: boolean;
  files: EmployeeCourseFile[];
}

export interface CreateEmployeeCourseRequest {
  business_employee_id: number;
  course_certification_id: number;
  issue_date?: string; // yyyy-MM-dd
  expiry_date?: string; // yyyy-MM-dd
  hours?: number;
  score?: string;
  observations?: string;
  files?: File[];
}

@Injectable({ providedIn: 'root' })
export class EmployeeCourseService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getByBusinessEmployeeId(businessEmployeeId: number, includeHistory: boolean = false): Observable<EmployeeCourseResponse[]> {
    const url = `${this.apiUrl}/employee_course/by-business-employee/${businessEmployeeId}?includeHistory=${includeHistory}`;
    return this.http.get<EmployeeCourseResponse[]>(url);
  }

  create(req: CreateEmployeeCourseRequest): Observable<EmployeeCourseResponse> {
    const url = `${this.apiUrl}/employee_course`;
    const form = new FormData();
    form.append('business_employee_id', String(req.business_employee_id));
    form.append('course_certification_id', String(req.course_certification_id));
    if (req.issue_date) form.append('issue_date', req.issue_date);
    if (req.expiry_date) form.append('expiry_date', req.expiry_date);
    if (req.hours !== undefined && req.hours !== null) form.append('hours', String(req.hours));
    if (req.score) form.append('score', req.score);
    if (req.observations) form.append('observations', req.observations);
    if (req.files && req.files.length) {
      req.files.forEach(f => form.append('files[]', f));
    }
    return this.http.post<EmployeeCourseResponse>(url, form);
  }

  delete(id: number): Observable<void> {
    const url = `${this.apiUrl}/employee_course/${id}`;
    return this.http.delete<void>(url);
  }
}
