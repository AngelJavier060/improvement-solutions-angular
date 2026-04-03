import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NivelParametro } from '../models/nivel-parametro.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class NivelParametroService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/public/nivel-parametro');
  }

  getAll(): Observable<NivelParametro[]> {
    return this.http.get<NivelParametro[]>(this.apiUrl);
  }

  getById(id: number): Observable<NivelParametro> {
    return this.http.get<NivelParametro>(`${this.apiUrl}/${id}`);
  }

  getByParametro(parametroId: number): Observable<NivelParametro[]> {
    return this.http.get<NivelParametro[]>(`${this.apiUrl}/by-parametro/${parametroId}`);
  }

  create(entity: NivelParametro): Observable<NivelParametro> {
    return this.http.post<NivelParametro>(this.apiUrl, entity);
  }

  update(id: number, entity: NivelParametro): Observable<NivelParametro> {
    return this.http.put<NivelParametro>(`${this.apiUrl}/${id}`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
