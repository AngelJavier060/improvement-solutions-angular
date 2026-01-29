import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QrLegalDocsService } from '../../../core/services/qr-legal-docs.service';

@Component({
  standalone: true,
  selector: 'app-qr-legal-docs',
  imports: [CommonModule],
  template: `
    <div class="container py-4" style="max-width: 900px;">
      <h3 class="mb-3">Documentos legales vigentes</h3>

      <div class="alert alert-danger" *ngIf="error">{{ error }}</div>
      <div class="text-center py-4" *ngIf="loading">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted">Cargando documentos...</div>
      </div>

      <div class="alert alert-warning" *ngIf="!loading && !error && !token">
        Enlace inválido o expirado.
      </div>

      <div class="card shadow-sm" *ngIf="!loading && !error && token">
        <div class="card-body">
          <div class="row g-2">
            <div class="col-12 col-md-4">
              <button type="button" class="btn btn-outline-primary w-100" (click)="open('reglamento')">
                Reglamento Interno
              </button>
            </div>
            <div class="col-12 col-md-4">
              <button type="button" class="btn btn-outline-primary w-100" (click)="open('riesgos')">
                Matriz de Riesgos
              </button>
            </div>
            <div class="col-12 col-md-4">
              <button type="button" class="btn btn-outline-primary w-100" (click)="open('politicaSst')">
                Política de SST
              </button>
            </div>
          </div>

          <small class="text-muted d-block mt-3">
            Si un documento no se abre, es porque no hay un PDF público cargado para ese requisito.
          </small>
        </div>
      </div>
    </div>
  `
})
export class QrLegalDocsComponent implements OnInit {
  ruc: string | null = null;
  token: string | null = null;
  loading = false;
  error: string | null = null;

  docs: any = null;

  constructor(
    private route: ActivatedRoute,
    private qrService: QrLegalDocsService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.snapshot.paramMap.get('ruc');
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.ruc || !this.token) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.qrService.getPublicDocs(this.ruc, this.token).subscribe({
      next: (data) => {
        this.docs = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la información del QR. El enlace puede haber expirado.';
        this.loading = false;
      }
    });
  }

  open(key: 'reglamento' | 'riesgos' | 'politicaSst'): void {
    if (!this.ruc || !this.token) return;

    const doc = this.docs?.[key];
    const fileId = Number(doc?.fileId);

    if (!doc?.found) {
      alert('No se encontró este documento en la matriz legal.');
      return;
    }

    if (!doc?.hasPdf || !fileId) {
      alert('No hay un PDF público cargado para este documento.');
      return;
    }

    const url = this.qrService.getPublicFileUrl(this.ruc, fileId, this.token);
    window.open(url, '_blank');
  }
}
