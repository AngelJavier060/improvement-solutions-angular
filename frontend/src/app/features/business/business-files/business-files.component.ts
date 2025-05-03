import { Component, OnInit } from '@angular/core';
import { FileService, FileResponse } from '../../../services/file.service';

@Component({
  selector: 'app-business-files',
  templateUrl: './business-files.component.html',
  styleUrls: ['./business-files.component.scss']
})
export class BusinessFilesComponent implements OnInit {
  uploadedFiles: FileResponse[] = [];
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading: boolean = false;

  constructor(private fileService: FileService) { }

  ngOnInit(): void {
    // Aquí podríamos cargar los archivos existentes desde el backend
    // Este es un ejemplo, en un caso real cargaríamos desde la API
    this.loadFiles();
  }

  loadFiles(): void {
    // En un caso real, haríamos una llamada a la API para obtener los archivos
    // Para este ejemplo, simularemos que no hay archivos inicialmente
    this.uploadedFiles = [];
  }

  onFileUploaded(fileResponse: FileResponse): void {
    // Agregar el archivo a la lista
    this.uploadedFiles.push(fileResponse);
    
    // Mostrar mensaje de éxito
    this.showSuccessMessage('Archivo subido correctamente');
  }

  onUploadError(error: string): void {
    // Mostrar mensaje de error
    this.showErrorMessage(error);
  }

  deleteFile(index: number): void {
    const file = this.uploadedFiles[index];
    
    if (!file || !file.url) {
      this.showErrorMessage('No se puede eliminar el archivo');
      return;
    }

    this.loading = true;

    this.fileService.deleteFile(file.url)
      .subscribe({
        next: () => {
          // Eliminar el archivo de la lista
          this.uploadedFiles.splice(index, 1);
          this.loading = false;
          this.showSuccessMessage('Archivo eliminado correctamente');
        },
        error: (error) => {
          this.loading = false;
          this.showErrorMessage('Error al eliminar el archivo');
          console.error('Error eliminando el archivo:', error);
        }
      });
  }

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
    
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  private showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
    
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }
}