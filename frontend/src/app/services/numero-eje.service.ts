import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NumeroEje } from '../models/numero-eje.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({ providedIn: 'root' })
export class NumeroEjeService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/numero-ejes');
  }

  getAll(): Observable<NumeroEje[]> {
    return this.http.get<NumeroEje[]>(this.apiUrl);
  }

  getById(id: number): Observable<NumeroEje> {
    return this.http.get<NumeroEje>(`${this.apiUrl}/${id}`);
  }

  create(entity: NumeroEje): Observable<NumeroEje> {
    return this.http.post<NumeroEje>(this.apiUrl, entity);
  }

  update(id: number, entity: NumeroEje): Observable<NumeroEje> {
    return this.http.put<NumeroEje>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
