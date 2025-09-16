import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContractorBlock } from '../models/contractor-company.model';
import { ApiUrlService } from '../core/services/api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ContractorBlockService {
  private apiUrl: string;

  constructor(private http: HttpClient, private apiUrlService: ApiUrlService) {
    this.apiUrl = this.apiUrlService.getUrl('/api/contractor-blocks');
    console.log('ContractorBlockService API URL:', this.apiUrl);
  }

  getAllBlocks(): Observable<ContractorBlock[]> {
    return this.http.get<ContractorBlock[]>(this.apiUrl);
  }

  getAllActiveBlocks(): Observable<ContractorBlock[]> {
    return this.http.get<ContractorBlock[]>(`${this.apiUrl}/active`);
  }

  getBlocksByCompanyId(companyId: number): Observable<ContractorBlock[]> {
    return this.http.get<ContractorBlock[]>(`${this.apiUrl}/by-company/${companyId}`);
  }

  getActiveBlocksByCompanyId(companyId: number): Observable<ContractorBlock[]> {
    return this.http.get<ContractorBlock[]>(`${this.apiUrl}/by-company/${companyId}/active`);
  }

  getBlockById(id: number): Observable<ContractorBlock> {
    return this.http.get<ContractorBlock>(`${this.apiUrl}/${id}`);
  }

  getBlockByCode(code: string): Observable<ContractorBlock> {
    return this.http.get<ContractorBlock>(`${this.apiUrl}/by-code/${code}`);
  }

  searchBlocksByName(name: string): Observable<ContractorBlock[]> {
    return this.http.get<ContractorBlock[]>(`${this.apiUrl}/search?name=${name}`);
  }

  createBlock(block: ContractorBlock): Observable<ContractorBlock> {
    return this.http.post<ContractorBlock>(this.apiUrl, block);
  }

  updateBlock(id: number, block: ContractorBlock): Observable<ContractorBlock> {
    return this.http.put<ContractorBlock>(`${this.apiUrl}/${id}`, block);
  }

  deleteBlock(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleBlockStatus(id: number): Observable<string> {
    return this.http.patch<string>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}