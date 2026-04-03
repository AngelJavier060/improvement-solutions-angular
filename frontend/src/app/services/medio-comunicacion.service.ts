import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedioComunicacion } from '../models/medio-comunicacion.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class MedioComunicacionService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/medio-comunicaciones');
  }

  getAll(): Observable<MedioComunicacion[]> {
    return this.http.get<MedioComunicacion[]>(this.apiUrl);
  }

  getById(id: number): Observable<MedioComunicacion> {
    return this.http.get<MedioComunicacion>(`${this.apiUrl}/${id}`);
  }

  create(entity: MedioComunicacion): Observable<MedioComunicacion> {
    return this.http.post<MedioComunicacion>(this.apiUrl, entity);
  }

  update(id: number, entity: MedioComunicacion): Observable<MedioComunicacion> {
    return this.http.put<MedioComunicacion>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
