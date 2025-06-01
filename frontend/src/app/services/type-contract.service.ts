import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TypeContract } from '../models/type-contract.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TypeContractService {
  private apiUrl = `${environment.apiUrl}/api/master-data/type-contract`;
  
  constructor(private http: HttpClient) { }
  
  getAllTypeContracts(): Observable<TypeContract[]> {
    return this.http.get<TypeContract[]>(this.apiUrl);
  }
  
  getTypeContract(id: number): Observable<TypeContract> {
    return this.http.get<TypeContract>(`${this.apiUrl}/${id}`);
  }
  
  createTypeContract(typeContract: TypeContract): Observable<TypeContract> {
    return this.http.post<TypeContract>(this.apiUrl, typeContract);
  }
  
  updateTypeContract(id: number, typeContract: TypeContract): Observable<TypeContract> {
    return this.http.put<TypeContract>(`${this.apiUrl}/${id}`, typeContract);
  }
  
  deleteTypeContract(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
