import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
          <div *ngIf="!viewUrl && hasPublicItems(); else fallbackStatic" class="row g-2">
            <div class="col-12 col-md-6 col-lg-4" *ngFor="let it of docs.items">
              <button type="button" class="btn btn-outline-primary w-100 text-truncate" (click)="openItem(it)">
                <i class="fas fa-file-alt me-1"></i>{{ (it?.title || 'Documento') }}
              </button>
            </div>
          </div>
          <ng-template #fallbackStatic>
            <div class="row g-2" *ngIf="!viewUrl; else viewerBlock">
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
            <ng-template #viewerBlock>
              <div class="mb-2 d-flex justify-content-between align-items-center">
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="closeViewer()">
                  ← Volver a la lista
                </button>
              </div>
              <div class="ratio ratio-4x3" style="min-height: 70vh;">
                <iframe [src]="viewUrl" style="width:100%;height:100%;border:0;" allow="encrypted-media"></iframe>
              </div>
              <small class="text-muted d-block mt-2">Vista solo lectura. La descarga está deshabilitada desde la interfaz del visor.</small>
            </ng-template>
          </ng-template>

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
  viewUrl: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private qrService: QrLegalDocsService,
    private sanitizer: DomSanitizer
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

    const url = this.qrService.getPublicFileUrl(this.ruc, fileId, this.token) + '#toolbar=0&navpanes=0&scrollbar=0&view=fitH';
    this.viewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // Abrir elemento dinámico desde docs.items
  openItem(item: any): void {
    if (!this.ruc || !this.token) return;
    const fileId = Number(item?.fileId);
    const found = !!item?.found;
    const hasPdf = !!item?.hasPdf;
    if (!found) { alert('No se encontró este documento en la matriz legal.'); return; }
    if (!hasPdf || !fileId) { alert('No hay un PDF público cargado para este documento.'); return; }
    const url = this.qrService.getPublicFileUrl(this.ruc, fileId, this.token) + '#toolbar=0&navpanes=0&scrollbar=0&view=fitH';
    this.viewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  hasPublicItems(): boolean {
    try {
      const arr: any[] = this.docs?.items || [];
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  }

  closeViewer(): void {
    this.viewUrl = null;
  }
}
