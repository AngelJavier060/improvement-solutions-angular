import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContractorCompany } from '../models/contractor-company.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ContractorCompanyService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/contractor-companies');
    console.log('ContractorCompanyService API URL:', this.apiUrl);
  }

  getAllCompanies(): Observable<ContractorCompany[]> {
    return this.http.get<ContractorCompany[]>(this.apiUrl);
  }

  getAllActiveCompanies(): Observable<ContractorCompany[]> {
    return this.http.get<ContractorCompany[]>(`${this.apiUrl}/active`);
  }

  getCompanyById(id: number): Observable<ContractorCompany> {
    return this.http.get<ContractorCompany>(`${this.apiUrl}/${id}`);
  }

  getCompanyByName(name: string): Observable<ContractorCompany> {
    return this.http.get<ContractorCompany>(`${this.apiUrl}/by-name/${name}`);
  }

  getCompanyByCode(code: string): Observable<ContractorCompany> {
    return this.http.get<ContractorCompany>(`${this.apiUrl}/by-code/${code}`);
  }

  searchCompaniesByName(name: string): Observable<ContractorCompany[]> {
    return this.http.get<ContractorCompany[]>(`${this.apiUrl}/search?name=${name}`);
  }

  createCompany(company: ContractorCompany): Observable<ContractorCompany> {
    return this.http.post<ContractorCompany>(this.apiUrl, company);
  }

  updateCompany(id: number, company: ContractorCompany): Observable<ContractorCompany> {
    return this.http.put<ContractorCompany>(`${this.apiUrl}/${id}`, company);
  }

  deleteCompany(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleCompanyStatus(id: number): Observable<string> {
    return this.http.patch<string>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}