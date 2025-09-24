import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService, PasswordResetRequestResult } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss']
})
export class ForgotPasswordModalComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  loading = false;
  error = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get emailControl() { return this.forgotPasswordForm.get('email'); }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.successMessage = '';

    const email = this.emailControl?.value;
    if (!email) {
      this.error = 'El correo electrónico es requerido';
      this.loading = false;
      return;
    }

    this.authService.requestPasswordReset(email)
      .subscribe(
        (result: PasswordResetRequestResult) => {
          this.loading = false;
          if (result && result.success) {
            this.successMessage = 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.';
            if (result.link) {
              // En entornos de desarrollo, el backend puede retornar el enlace para pruebas manuales
              console.log('[DEV] Enlace de restablecimiento de contraseña:', result.link);
            }
            setTimeout(() => {
              this.activeModal.close('success');
            }, 3000);
          } else {
            this.error = 'No se pudo procesar la solicitud';
          }
        },
        (err: HttpErrorResponse) => {
          this.loading = false;
          this.error = err.error?.message || 'Error al procesar la solicitud';
          console.error('Error requesting password reset:', err);
        }
      );
  }
  dismiss(): void {
    this.activeModal.dismiss();
  }

  backToLogin(): void {
    this.activeModal.dismiss('login');
  }
}