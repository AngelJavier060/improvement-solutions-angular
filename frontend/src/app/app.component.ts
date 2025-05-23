import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Improvement Solutions';
  
  constructor(private router: Router, private authService: AuthService) {}
  
  ngOnInit() {
    // Exponer instancias importantes para debugging
    (window as any).router = this.router;
    (window as any).authService = this.authService;
    
    console.log('AppComponent inicializado - Router y AuthService expuestos para debugging');
  }
}