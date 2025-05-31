import { Component, OnInit } from '@angular/core';
import { FileService, FileResponse } from '../../services/file.service';

@Component({
  selector: 'app-business-files',  template: `
    <div class="container">
      <h2>Archivos de la Empresa</h2>
      <div class="row">
        <div class="col-md-6">
          <app-file-upload 
            (fileSelected)="onFileSelected($event)"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            [maxSize]="5242880">
          </app-file-upload>
        </div>
      </div>
      
      <div *ngIf="error" class="alert alert-danger mt-3">
        {{ error }}
      </div>

      <div class="row mt-4">
        <div class="col-12">
          <div *ngIf="isLoading" class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
          </div>
          
          <div *ngIf="!isLoading" class="file-list">
            <div *ngFor="let file of files" class="file-item">
              <app-file-viewer 
                [fileUrl]="file.url"
                [fileName]="file.filename"
                [fileType]="file.contentType">
              </app-file-viewer>
            </div>
            
            <div *ngIf="!isLoading && files.length === 0" class="text-center text-muted">
              No hay archivos subidos aún.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .file-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      padding: 1rem;
    }
    .file-item {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class BusinessFilesComponent implements OnInit {
  files: FileResponse[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.isLoading = true;
    this.error = null;
    this.fileService.getFiles().subscribe({
      next: (files) => {
        this.files = files;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los archivos: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  onFileSelected(file: File): void {
    this.isLoading = true;
    this.error = null;
    
    this.fileService.uploadFile(file).subscribe({
      next: (response) => {
        this.files = [...this.files, response];
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Error al subir el archivo: ' + error.message;
        this.isLoading = false;
      }
    });
  }
}
