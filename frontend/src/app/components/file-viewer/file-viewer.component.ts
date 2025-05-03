import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FileService, FileResponse } from '../../services/file.service';

@Component({
  selector: 'app-file-viewer',
  templateUrl: './file-viewer.component.html',
  styleUrls: ['./file-viewer.component.scss']
})
export class FileViewerComponent implements OnInit {
  @Input() fileUrl: string | null = null;
  @Input() fileName: string | null = null;
  @Input() fileSize: number | null = null;
  @Input() fileContentType: string | null = null;
  @Input() isPdf: boolean = false;
  @Input() isImage: boolean = false;
  
  @Output() deleteFile = new EventEmitter<void>();
  
  tempUrl: string | null = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  constructor(private fileService: FileService) {}
  
  ngOnInit(): void {
    this.loadTemporaryUrl();
    
    if (!this.isPdf && !this.isImage) {
      this.detectFileType();
    }
  }
  
  private detectFileType(): void {
    if (this.fileContentType) {
      this.isPdf = this.fileContentType.includes('pdf');
      this.isImage = this.fileContentType.includes('image');
    } else if (this.fileName) {
      const extension = this.fileName.split('.').pop()?.toLowerCase();
      this.isPdf = extension === 'pdf';
      this.isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '');
    }
  }
  
  private loadTemporaryUrl(): void {
    if (!this.fileUrl) {
      return;
    }
    
    this.isLoading = true;
    
    this.fileService.getTemporaryUrl(this.fileUrl, 30)
      .subscribe({
        next: (response) => {
          this.tempUrl = response.url;
          this.isLoading = false;
        },
        error: (error) => {
          this.hasError = true;
          this.errorMessage = 'No se pudo cargar la URL temporal';
          this.isLoading = false;
        }
      });
  }
  
  handleDownload(): void {
    if (!this.fileUrl) {
      return;
    }
    
    // Para archivos PDF e imágenes, podemos usar la URL temporal para que el navegador los abra directamente
    if ((this.isPdf || this.isImage) && this.tempUrl) {
      window.open(this.tempUrl, '_blank');
      return;
    }
    
    // Para otros tipos de archivos, usamos la API para descargarlos
    this.isLoading = true;
    
    this.fileService.downloadFile(this.fileUrl)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.fileName || 'archivo-descargado';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          this.isLoading = false;
        },
        error: (error) => {
          this.hasError = true;
          this.errorMessage = 'Error al descargar el archivo';
          this.isLoading = false;
        }
      });
  }
  
  handleDelete(): void {
    if (confirm('¿Está seguro de que desea eliminar este archivo?')) {
      this.deleteFile.emit();
    }
  }
  
  refreshTemporaryUrl(): void {
    this.loadTemporaryUrl();
  }
  
  getFileIcon(): string {
    if (this.isPdf) {
      return 'far fa-file-pdf';
    } else if (this.isImage) {
      return 'far fa-file-image';
    } else if (this.fileContentType?.includes('word')) {
      return 'far fa-file-word';
    } else if (this.fileContentType?.includes('excel') || this.fileContentType?.includes('spreadsheet')) {
      return 'far fa-file-excel';
    } else if (this.fileContentType?.includes('zip') || this.fileContentType?.includes('compressed')) {
      return 'far fa-file-archive';
    } else {
      return 'far fa-file';
    }
  }
  
  getFormattedSize(): string {
    if (!this.fileSize) {
      return '';
    }
    
    if (this.fileSize < 1024) {
      return `${this.fileSize} B`;
    } else if (this.fileSize < 1024 * 1024) {
      return `${(this.fileSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(this.fileSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  }
}