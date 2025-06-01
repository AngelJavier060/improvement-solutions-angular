import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Iess } from '../models/iess.model';

@Injectable({
  providedIn: 'root'
})
export class IessService {
  private apiUrl = `${environment.apiUrl}/api/master-data/iess`;

  constructor(private http: HttpClient) { }

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
