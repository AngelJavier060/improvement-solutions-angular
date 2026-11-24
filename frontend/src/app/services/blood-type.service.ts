import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export interface BloodType {
  id: number;
  name: string;
  description?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BloodTypeService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/blood-types');
  }

  getAll(): Observable<BloodType[]> {
    return this.http.get<BloodType[]>(this.apiUrl);
  }

  create(name: string, description?: string): Observable<BloodType> {
    return this.http.post<BloodType>(this.apiUrl, { name, description, active: true });
  }

  update(id: number, name: string, description?: string): Observable<BloodType> {
    return this.http.put<BloodType>(`${this.apiUrl}/${id}`, { name, description, active: true });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
