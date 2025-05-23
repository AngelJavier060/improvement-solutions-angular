import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
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

  constructor(
    private businessService: BusinessService,
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
  }
}
