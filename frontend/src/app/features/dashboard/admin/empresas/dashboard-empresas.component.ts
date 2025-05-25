import { Component, OnInit } from '@angular/core';
import { BusinessService } from '../../../../services/business.service';
import { FileService } from '../../../../services/file.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-dashboard-empresas',
  templateUrl: './dashboard-empresas.component.html',
  styleUrls: ['./dashboard-empresas.component.scss']
})
export class DashboardEmpresasComponent implements OnInit {
  totalEmpresas: number = 0;
  empresasActivas: number = 0;
  empresasInactivas: number = 0;
  empresasPendientes: number = 0;
  empresasRecientes: Business[] = [];
  empresas: Business[] = [];
  loading: boolean = true;
  error: string = '';

  // Datos para gráfico de sectores
  sectorData: any = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#5a5c69', '#858796', '#6f42c1', '#e83e8c', '#fd7e14'
      ]
    }]
  };

  constructor(
    private businessService: BusinessService,
    private fileService: FileService
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticasEmpresas();
  }

  cargarEstadisticasEmpresas(): void {
    this.loading = true;
    this.businessService.getAll().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.totalEmpresas = empresas.length;
        this.empresasActivas = empresas.filter(e => e.status === 'active').length;
        this.empresasInactivas = empresas.filter(e => e.status === 'inactive').length;
        this.empresasPendientes = empresas.filter(e => e.status === 'pending').length;
        
        // Si no tienen estado, suponemos que son activas (para compatibilidad con datos existentes)
        if (this.empresasActivas === 0 && this.empresasInactivas === 0 && this.empresasPendientes === 0) {
          this.empresasActivas = this.totalEmpresas;
        }
        
        // Ordenar por fecha de creación (más recientes primero)
        this.empresasRecientes = empresas
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5); // Mostrar solo las 5 más recientes
          
        // Procesar datos de sectores para el gráfico
        this.procesarDatosSectores(empresas);
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas de empresas:', err);
        this.error = 'Error al cargar las estadísticas. Por favor, intente nuevamente.';
        this.loading = false;
      }
    });
  }
  
  private procesarDatosSectores(empresas: Business[]): void {
    // Agrupar empresas por sector
    const sectores = empresas.reduce((acc: {[key: string]: number}, empresa) => {
      const sector = empresa.sector || 'No especificado';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {});
    
    // Convertir a formato para el gráfico
    this.sectorData.labels = Object.keys(sectores);
    this.sectorData.datasets[0].data = Object.values(sectores);
  }  /**
   * Obtiene la URL correcta para el logotipo de la empresa
   * @param logoPath Ruta del logo almacenado en la BD
   * @returns URL completa para acceder al logo
   */
  getLogoUrl(logoPath: string): string {
    if (!logoPath) return '';
    
    // Si la ruta ya incluye el dominio completo, la devolvemos como está
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      // Asegurarnos de pasar un token de autenticación si existe
      const token = localStorage.getItem('auth_token');
      let url = logoPath;
      
      // Agregar token si existe
      if (token) {
        url += (url.includes('?') ? '&' : '?') + 'token=' + token;
      }
      
      // Agregar versión para evitar caché
      return url + (url.includes('?') ? '&' : '?') + 'v=' + new Date().getTime();
    }
    
    // Si la ruta es relativa al directorio logos, usamos el servicio para obtener la URL completa
    if (logoPath.includes('logos/')) {
      const filename = logoPath.split('/').pop() || '';
      const url = this.fileService.getFileUrlFromDirectory('logos', filename);
      return url + '&v=' + new Date().getTime();
    }
    
    // Si es solo un nombre de archivo sin ruta, asumimos que está en logos
    if (!logoPath.includes('/')) {
      const url = this.fileService.getFileUrlFromDirectory('logos', logoPath);
      return url + '&v=' + new Date().getTime();
    }
    
    // Para otros casos, simplemente usamos el servicio para obtener la URL
    const url = this.fileService.getFileUrl(logoPath);
    return url + '&v=' + new Date().getTime();
  }
}
