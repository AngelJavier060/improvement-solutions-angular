import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { FileService } from './services/file.service';

@Component({  selector: 'app-root',
  template: `
    <app-notification></app-notification>
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Improvement Solutions';
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private fileService: FileService
  ) {}
  
  ngOnInit() {
    // Exponer instancias importantes para debugging
    (window as any).router = this.router;
    (window as any).authService = this.authService;
    (window as any).fileService = this.fileService;
    
    console.log('AppComponent inicializado');
  }
}