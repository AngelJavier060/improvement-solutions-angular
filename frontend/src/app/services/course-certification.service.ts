import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export interface CourseCertification {
  id?: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseCertificationService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/course-certifications');
  }

  getAll(): Observable<CourseCertification[]> {
    return this.http.get<CourseCertification[]>(this.apiUrl);
  }

  getById(id: number): Observable<CourseCertification> {
    return this.http.get<CourseCertification>(`${this.apiUrl}/${id}`);
  }

  create(item: CourseCertification): Observable<CourseCertification> {
    return this.http.post<CourseCertification>(this.apiUrl, item);
  }

  update(id: number, item: CourseCertification): Observable<CourseCertification> {
    return this.http.put<CourseCertification>(`${this.apiUrl}/${id}`, item);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
