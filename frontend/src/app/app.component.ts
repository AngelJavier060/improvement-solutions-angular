import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { FileService } from './services/file.service';

// Importar utilidades de diagnóstico
import { exploreRoutes, diagnoseRoutingIssues } from './fix-routing';
import { diagnoseEmpresasRouting, forceNavigateToEmpresasList } from './fix-empresas-routing';
import { diagnoseRouting, diagnoseImageLoading, forceRedirectToCompanies } from './diagnostic-tools';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
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
    
    // Exponer utilidades de diagnóstico a nivel global para debugging
    (window as any).exploreRoutes = exploreRoutes;
    (window as any).diagnoseRoutingIssues = diagnoseRoutingIssues;
    (window as any).diagnoseEmpresasRouting = diagnoseEmpresasRouting;
    (window as any).forceNavigateToEmpresasList = forceNavigateToEmpresasList;
    
    // Nuevas herramientas de diagnóstico mejoradas
    (window as any).diagnoseRouting = () => diagnoseRouting(this.router);
    (window as any).diagnoseImageLoading = () => diagnoseImageLoading(this.fileService);
    (window as any).forceRedirectToCompanies = () => forceRedirectToCompanies(this.router);
    
    console.log('AppComponent inicializado - Utilidades de diagnóstico disponibles en consola');
    console.log('Utiliza window.diagnoseRouting() para analizar problemas de enrutamiento');
    console.log('Utiliza window.diagnoseImageLoading() para diagnosticar problemas con logos');
  }
}