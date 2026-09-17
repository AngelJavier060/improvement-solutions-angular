import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';

/**
 * Vista previa a pantalla completa (PDF/imagen) con botón Cerrar.
 * No dispara descarga.
 */
@Injectable({ providedIn: 'root' })
export class ThFilePreviewService {
  private overlayEl: HTMLElement | null = null;
  private blobUrl: string | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private bodyOverflowBackup: string | null = null;

  constructor(private http: HttpClient) {}

  open(file: { file?: string; file_name?: string; file_type?: string }): void {
    const rawUrl = file?.file || '';
    const url = this.normalizeViewUrl(rawUrl);
    const fileName = file.file_name || this.fileNameFromUrl(url);
    this.close();

    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        if (!blob) {
          alert('No se pudo abrir el archivo');
          return;
        }
        const headerType = (resp.headers.get('Content-Type') || '').toLowerCase();
        const name = (fileName || '').toLowerCase();
        const typeHint = (file.file_type || '').toLowerCase();
        const isPdf = typeHint.includes('pdf') || headerType.includes('pdf') || name.endsWith('.pdf') || url.toLowerCase().includes('.pdf');
        const isImage = typeHint.startsWith('image/') || headerType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
        const mime = isPdf ? 'application/pdf' : (isImage ? (headerType.startsWith('image/') ? headerType : 'image/jpeg') : 'application/pdf');
        const typed = new Blob([blob], { type: mime });
        this.blobUrl = window.URL.createObjectURL(typed);
        this.mount(fileName || 'Archivo', this.blobUrl, isImage && !isPdf);
      },
      error: (err) => {
        console.error('Error abriendo archivo', err);
        this.close();
        alert('No se pudo visualizar el archivo');
      }
    });
  }

  close(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.overlayEl) {
      try { document.body.removeChild(this.overlayEl); } catch { /* ignore */ }
      this.overlayEl = null;
    }
    if (this.blobUrl) {
      try { URL.revokeObjectURL(this.blobUrl); } catch { /* ignore */ }
      this.blobUrl = null;
    }
    if (this.bodyOverflowBackup !== null) {
      document.body.style.overflow = this.bodyOverflowBackup;
      this.bodyOverflowBackup = null;
    }
    document.documentElement.style.overflow = '';
  }

  private mount(title: string, blobUrl: string, asImage: boolean): void {
    this.bodyOverflowBackup = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const root = document.createElement('div');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    } as CSSStyleDeclaration);

    root.innerHTML = `
      <div style="display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;">
        <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#f9fafb;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;font:600 14px/1.3 system-ui,sans-serif;">
            <span style="background:#4648d4;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;">${asImage ? 'IMG' : 'PDF'}</span>
            <span class="th-preview-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
          </div>
          <button type="button" class="th-preview-close" title="Cerrar (Esc)"
            style="border:0;border-radius:6px;background:rgba(255,255,255,.12);color:#f9fafb;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;cursor:pointer;">
            ✕ Cerrar
          </button>
        </div>
        <div class="th-preview-body" style="flex:1 1 auto;position:relative;min-height:0;overflow:hidden;background:#374151;"></div>
      </div>
    `;
    (root.querySelector('.th-preview-name') as HTMLElement).textContent = title;
    (root.querySelector('.th-preview-close') as HTMLButtonElement).addEventListener('click', () => this.close());

    const body = root.querySelector('.th-preview-body') as HTMLElement;
    if (asImage) {
      const img = document.createElement('img');
      img.src = blobUrl;
      img.alt = title;
      Object.assign(img.style, {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        display: 'block',
        margin: 'auto',
        position: 'absolute',
        inset: '0'
      } as CSSStyleDeclaration);
      body.appendChild(img);
    } else {
      const embed = document.createElement('embed');
      embed.type = 'application/pdf';
      // toolbar=0 oculta descarga/impresión del visor nativo
      embed.src = `${blobUrl}#zoom=page-width&toolbar=0&navpanes=0&scrollbar=1`;
      embed.setAttribute('title', title);
      Object.assign(embed.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        border: '0',
        background: '#525659'
      } as CSSStyleDeclaration);
      body.appendChild(embed);
    }

    this.overlayEl = root;
    document.body.appendChild(root);
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  private normalizeViewUrl(raw: string): string {
    try {
      let rel = String(raw || '').replace(/\\/g, '/').trim();
      if (!rel) return '/api/files/unknown.pdf';
      if (/^https?:\/\//i.test(rel)) {
        return rel.replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('/api/files/download/')) {
        return rel.replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('api/files/download/')) {
        return ('/' + rel).replace('/api/files/download/', '/api/files/');
      }
      if (rel.startsWith('/api/')) return rel;
      if (rel.startsWith('api/')) return `/${rel}`;
      rel = rel.replace(/^\.\/+/, '').replace(/^\/+/, '');
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      return `/api/files/${rel}`;
    } catch {
      return '/api/files/unknown.pdf';
    }
  }

  private fileNameFromUrl(url: string): string {
    const i = url.lastIndexOf('/');
    return i >= 0 ? url.substring(i + 1) : url;
  }
}
