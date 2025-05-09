import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PruebaService {  // URL estandarizada usando environment.apiUrl
  private apiUrl = `${environment.apiUrl}/prueba`;

  constructor(private http: HttpClient) { }

  getPrueba(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}