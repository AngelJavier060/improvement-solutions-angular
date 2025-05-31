import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileService, FileResponse } from '../../services/file.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  @Input() directory: string | null = null;
  @Input() accept: string = '*';
  @Input() maxSize: number = 10 * 1024 * 1024; // 10MB por defecto
  
  @Output() fileSelected = new EventEmitter<File>();
  @Output() fileUploaded = new EventEmitter<FileResponse>();
  @Output() uploadError = new EventEmitter<string>();
  
  selectedFile: File | null = null;
  uploading: boolean = false;
  uploadProgress: number = 0;
  
  constructor(private fileService: FileService) {}
    onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Validar tamaño del archivo
    if (file.size > this.maxSize) {
      this.uploadError.emit(`El archivo es demasiado grande. El tamaño máximo es ${this.maxSize / 1024 / 1024}MB`);
      return;
    }
    
    // Validar tipo de archivo si es necesario
    if (this.accept !== '*') {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const acceptedTypes = this.accept.split(',').map(type => type.trim().toLowerCase());
      
      if (!acceptedTypes.includes('.' + fileExtension)) {
        this.uploadError.emit(`Tipo de archivo no permitido. Tipos aceptados: ${this.accept}`);
        return;
      }
    }
    
    this.selectedFile = file;
    this.fileSelected.emit(file);
  }
  
  uploadFile(): void {
    if (!this.selectedFile) {
      this.uploadError.emit('No se ha seleccionado ningún archivo');
      return;
    }
    
    this.uploading = true;
    this.uploadProgress = 0;
    
    // Simular progreso de carga
    const interval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
      }
    }, 300);
    
    if (this.directory) {
      this.fileService.uploadFileToDirectory(this.directory, this.selectedFile)
        .subscribe({
          next: (response) => {
            clearInterval(interval);
            this.uploadProgress = 100;
            this.uploading = false;
            this.fileUploaded.emit(response);
            this.selectedFile = null;
          },
          error: (error: HttpErrorResponse) => {
            clearInterval(interval);
            this.uploading = false;
            this.uploadProgress = 0;
            this.uploadError.emit(error.message || 'Error al subir el archivo');
          }
        });
    } else {
      this.fileService.uploadFile(this.selectedFile)
        .subscribe({
          next: (response) => {
            clearInterval(interval);
            this.uploadProgress = 100;
            this.uploading = false;
            this.fileUploaded.emit(response);
            this.selectedFile = null;
          },
          error: (error: HttpErrorResponse) => {
            clearInterval(interval);
            this.uploading = false;
            this.uploadProgress = 0;
            this.uploadError.emit(error.message || 'Error al subir el archivo');
          }
        });
    }
  }
  
  removeSelectedFile(): void {
    this.selectedFile = null;
  }
}