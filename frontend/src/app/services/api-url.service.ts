import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  getApiUrl(): string {
    return environment.apiUrl;
  }
}
