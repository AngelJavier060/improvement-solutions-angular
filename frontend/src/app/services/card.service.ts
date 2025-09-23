import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../core/services/api-url.service';

export interface CardCatalog {
  id?: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CardService {
  private apiUrl: string;
  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/master-data/cards');
  }

  getAll(): Observable<CardCatalog[]> {
    return this.http.get<CardCatalog[]>(this.apiUrl);
  }

  getById(id: number): Observable<CardCatalog> {
    return this.http.get<CardCatalog>(`${this.apiUrl}/${id}`);
  }

  create(item: CardCatalog): Observable<CardCatalog> {
    return this.http.post<CardCatalog>(this.apiUrl, item);
  }

  update(id: number, item: CardCatalog): Observable<CardCatalog> {
    return this.http.put<CardCatalog>(`${this.apiUrl}/${id}`, item);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
