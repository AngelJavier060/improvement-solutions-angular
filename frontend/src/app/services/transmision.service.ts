import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transmision } from '../models/transmision.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class TransmisionService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/transmisiones');
  }

  getAll(): Observable<Transmision[]> {
    return this.http.get<Transmision[]>(this.apiUrl);
  }

  getById(id: number): Observable<Transmision> {
    return this.http.get<Transmision>(`${this.apiUrl}/${id}`);
  }

  create(entity: Transmision): Observable<Transmision> {
    return this.http.post<Transmision>(this.apiUrl, entity);
  }

  update(id: number, entity: Transmision): Observable<Transmision> {
    return this.http.put<Transmision>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
