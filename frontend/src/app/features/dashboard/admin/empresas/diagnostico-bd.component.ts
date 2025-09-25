import { Component, OnInit } from '@angular/core';
import { AdminDiagnosticsService, DbDiagnostics } from '../../../../services/admin-diagnostics.service';

@Component({
  selector: 'app-diagnostico-bd',
  templateUrl: './diagnostico-bd.component.html'
})
export class DiagnosticoBdComponent implements OnInit {
  loading = false;
  error: string | null = null;
  data: DbDiagnostics | null = null;

  constructor(private diag: AdminDiagnosticsService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    this.diag.getDiagnostics().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err?.message || 'No se pudo obtener el diagnóstico';
        this.loading = false;
      }
    });
  }
}
