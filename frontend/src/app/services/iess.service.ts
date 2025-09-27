import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Iess } from '../models/iess.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class IessService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    // Construir URL relativa o absoluta según entorno
    this.apiUrl = this.apiUrlService.getUrl('api/master-data/iess');
  }

  getIessItems(): Observable<Iess[]> {
    return this.http.get<Iess[]>(this.apiUrl);
  }

  getIess(id: number): Observable<Iess> {
    return this.http.get<Iess>(`${this.apiUrl}/${id}`);
  }

  createIess(iess: Iess): Observable<Iess> {
    return this.http.post<Iess>(this.apiUrl, iess);
  }

  updateIess(id: number, iess: Iess): Observable<Iess> {
    return this.http.put<Iess>(`${this.apiUrl}/${id}`, iess);
  }

  deleteIess(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
