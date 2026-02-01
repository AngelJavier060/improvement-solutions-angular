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
  resetLink: string | null = null;
  copied = false;

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
      this.error = 'El correo electrÃ³nico es requerido';
      this.loading = false;
      return;
    }

    this.authService.requestPasswordReset(email)
      .subscribe(
        (result: PasswordResetRequestResult) => {
          this.loading = false;
          if (result && result.success) {
            this.successMessage = 'Se ha enviado un correo con las instrucciones para restablecer tu contraseÃ±a.';
            this.resetLink = result.link ? String(result.link) : null;
            if (this.resetLink) {
              // En entornos de desarrollo, el backend puede retornar el enlace para pruebas manuales
              console.log('[DEV] Enlace de restablecimiento de contraseÃ±a:', this.resetLink);
            }
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
  copyResetLink(): void {
    if (!this.resetLink) { return; }
    const clip: any = (navigator as any).clipboard;
    if (clip && typeof clip.writeText === "function") {
      clip.writeText(this.resetLink).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      }).catch(() => {});
    }
  }

  openResetLink(): void {
    if (!this.resetLink) { return; }
    window.location.href = this.resetLink;
  }
}
