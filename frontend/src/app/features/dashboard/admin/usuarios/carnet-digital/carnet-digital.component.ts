import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { User } from '../../../../../models/user.model';
import { environment } from '../../../../../../environments/environment';
import { UserAdminService } from '../user-admin.service';
import { ImageCacheService } from '../../../../../services/image-cache.service';
import { SafeUrl, DomSanitizer } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-carnet-digital',
  templateUrl: './carnet-digital.component.html',
  styleUrls: ['./carnet-digital.component.scss']
})
export class CarnetDigitalComponent implements OnInit {
  @Input() user!: User;
  qrCodeValue: string = '';
  qrCodeSafeUrl: SafeUrl | null = null;
  currentDate: string = '';
  profilePictureUrl: string = '';
  // Área o departamento del empleado (podría venir del objeto user si tiene ese campo)
  userArea: string = 'ÁREA DE SISTEMAS';
  // Fecha de expiración (un año desde hoy)
  expirationDate: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    private userService: UserAdminService,
    private imageCacheService: ImageCacheService,
    private sanitizer: DomSanitizer,
    private datePipe: DatePipe
  ) { }

  ngOnInit(): void {
    // Generar la fecha actual en formato YYYY-MM-DD
    const today = new Date();
    this.currentDate = this.datePipe.transform(today, 'yyyy-MM-dd') || today.toISOString().split('T')[0];
    
    // Generar fecha de expiración (un año después)
    const expDate = new Date(today);
    expDate.setFullYear(expDate.getFullYear() + 1);
    this.expirationDate = this.datePipe.transform(expDate, 'yyyy-MM-dd') || expDate.toISOString().split('T')[0];

    // Generar el valor para el código QR (podría ser el ID de usuario o alguna otra información relevante)
    this.qrCodeValue = `USUARIO-${this.user.id}-${this.user.username}-${this.currentDate}`;

    // Obtener la URL de la imagen de perfil
    this.profilePictureUrl = this.getProfilePictureUrl();
    
    // Si el usuario tiene roles, determinar el área
    if (this.user.roles && this.user.roles.length > 0) {
      if (this.user.roles.includes('ROLE_ADMIN')) {
        this.userArea = 'ÁREA DE ADMINISTRACIÓN';
      } else if (this.user.roles.includes('ROLE_USER')) {
        this.userArea = 'ÁREA DE SISTEMAS';
      }
    }
  }

  getProfilePictureUrl(): string {
    if (!this.user) return 'assets/img/default-avatar.png';
    
    if (this.user.profilePicture) {
      const profileName = this.user.profilePicture.includes('/') 
        ? this.user.profilePicture.split('/').pop() 
        : this.user.profilePicture;
      
      return `${environment.apiUrl}/api/files/profiles/${profileName}?v=${Date.now()}`;
    }
    
    return 'assets/img/default-avatar.png';
  }

  close(): void {
    this.activeModal.close();
  }
  downloadCarnet(): void {
    // Para implementar realmente esta funcionalidad, necesitaríamos una biblioteca como html2canvas + jsPDF
    console.log('Descargar carnet para:', this.user.username);
    
    // Notificar al usuario que esta función está en desarrollo
    alert('La función de descarga de carnet como PDF será implementada próximamente.');
    
    // Una implementación básica sería capturar el carnet como imagen y luego permitir su descarga
    // Se necesitaría importar html2canvas y jsPDF para una implementación completa
  }

  printCarnet(): void {
    // Configurar la impresión para que solo incluya el carnet
    const printContent = document.querySelector('.carnet-container');
    const printArea = document.createElement('div');
    
    if (printContent) {
      printArea.innerHTML = printContent.innerHTML;
      document.body.appendChild(printArea);
      printArea.style.display = 'block';
      document.body.style.display = 'none';
      
      window.print();
      
      document.body.style.display = 'block';
      document.body.removeChild(printArea);
    } else {
      window.print();
    }
  }
}
