import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { of, catchError } from 'rxjs';

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss']
})
export class ForgotPasswordModalComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  loading = false;
  error = '';
  successMessage = '';
  resetToken = '';

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  // Getter para simplificar el acceso al campo de email
  get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const email = this.forgotPasswordForm.get('email')!.value;

    // Primero intenta con el servicio real
    this.authService.requestPasswordReset(email)
      .pipe(
        catchError(error => {
          console.log('Error al solicitar restablecimiento. Usando modo de prueba local:', error);
          
          // Fallback para pruebas locales - Simular éxito si el backend no responde
          if (email === 'javierangelmsn@outlook.es' || email === 'javier@test.com') {
            const mockToken = 'test-token-' + Math.floor(Math.random() * 10000);
            return of({
              mensaje: 'Se ha enviado un correo electrónico con las instrucciones para restablecer su contraseña',
              token: mockToken
            });
          }
          // Si no es un email de prueba, dejar pasar el error
          throw error;
        })
      )
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.successMessage = 'Se han enviado instrucciones a su correo electrónico para restablecer la contraseña.';
          
          // Para desarrollo, almacenar el token que se usaría normalmente en el enlace de correo
          if (response && response.token) {
            this.resetToken = response.token;
            console.log('Token para restablecer contraseña (solo para desarrollo):', response.token);
            
            // En un entorno real, esto se enviaría por correo y no se mostraría aquí
            this.successMessage += ' Para efectos de desarrollo, puede usar este token: ' + response.token;
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.message || 'Ocurrió un error al solicitar el restablecimiento de contraseña.';
        }
      });
  }

  backToLogin(): void {
    try {
      // Cerramos el modal actual primero
      this.activeModal.dismiss('go-back-to-login');
      
      // Pequeño timeout para asegurar que el modal actual se cierre completamente
      setTimeout(() => {
        // Abrimos el modal de login
        const modalRef = this.modalService.open(LoginModalComponent, {
          centered: true,
          backdrop: 'static',
          keyboard: false
        });
        modalRef.componentInstance.userType = 'usuario'; // Por defecto abre como usuario
      }, 100);
    } catch (error) {
      console.error('Error al volver al login:', error);
      
      // Si hay un error, forzamos la redirección a la página de inicio
      window.location.href = '/';
    }
  }

  dismiss(): void {
    try {
      this.activeModal.dismiss('user-dismissed');
    } catch (error) {
      console.error('Error al cerrar el modal:', error);
      window.location.href = '/';
    }
  }
}