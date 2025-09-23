import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { FileService } from '../../../../services/file.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-detalle-empresa',
  templateUrl: './detalle-empresa.component.html',
  styleUrls: ['./detalle-empresa.component.scss']
})
export class DetalleEmpresaComponent implements OnInit {
  empresa: Business | null = null;
  loading = false;
  error = '';
  empresaId: number;
  // URL estable del logo para evitar cambios durante el ciclo de detección
  logoUrl: string = '';

  constructor(
    private businessService: BusinessService,
    private fileService: FileService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.loading = true;
    this.businessService.getById(this.empresaId).subscribe({
      next: (empresa: Business) => {
        this.empresa = empresa;
        this.loading = false;
        // Calcular una sola vez la URL del logo para evitar ExpressionChangedAfterItHasBeenChecked
        try {
          const path = this.empresa?.logo || '';
          this.logoUrl = path ? this.getLogoUrl(path) : '';
        } catch (e) {
          this.logoUrl = '';
        }
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la empresa';
        console.error(err);
        this.loading = false;
      }
    });
  }

  editar(): void {
    this.router.navigate(['/dashboard/admin/empresas/editar', this.empresaId]);
  }

  volver(): void {
    this.router.navigate(['/dashboard/admin/empresas']);
  }  /**
   * Obtiene la URL correcta para el logotipo de la empresa
   * @param logoPath Ruta del logo almacenado en la BD
   * @returns URL completa para acceder al logo
   */
  getLogoUrl(logoPath: string): string {
    if (!logoPath) {
      console.log('getLogoUrl: logoPath está vacío');
      return '';
    }
    
    console.log('Generando URL para logo:', logoPath);

    // Caso 1: Si es una URL completa (http:// o https://)
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      console.log('getLogoUrl: URL absoluta detectada');
      const token = localStorage.getItem('auth_token');
      let url = logoPath;
      
      if (token) {
        url += (url.includes('?') ? '&' : '?') + 'token=' + token;
      }
      
      url += (url.includes('?') ? '&' : '?') + 'v=' + new Date().getTime();
      console.log('URL final para logo externo:', url);
      return url;
    }

    // Caso 2: Si contiene el directorio "logos/" en la ruta
    if (logoPath.includes('logos/')) {
      console.log('getLogoUrl: Ruta relativa a logos/ detectada');
      const filename = logoPath.split('/').pop() || '';
      const url = this.fileService.getFileUrlFromDirectory('logos', filename, true);
      console.log('URL final para logo relativo:', url);
      return url;
    }

    // Caso 3: Si es solo un nombre de archivo sin ruta, asumimos que está en logos
    if (!logoPath.includes('/')) {
      console.log('getLogoUrl: Solo nombre de archivo detectado, asumiendo directorio logos/');
      const url = this.fileService.getFileUrlFromDirectory('logos', logoPath, true);
      console.log('URL final para logo simple:', url);
      return url;
    }

    // Caso 4: Cualquier otro formato de ruta
    console.log('getLogoUrl: Formato de ruta no estándar');
    const url = this.fileService.getFileUrl(logoPath);
    console.log('URL final para caso general:', url);
    return url;
  }
}
