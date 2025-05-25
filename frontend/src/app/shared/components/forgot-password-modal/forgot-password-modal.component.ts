import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth.service';
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
      .subscribe({
        next: (response: boolean) => {
          this.loading = false;
          if (response) {
            this.successMessage = 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña.';
            setTimeout(() => {
              this.activeModal.close('success');
            }, 3000);
          } else {
            this.error = 'No se pudo procesar la solicitud';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.error = err.error?.message || 'Error al procesar la solicitud';
          console.error('Error requesting password reset:', err);
        }
      });
  }

  backToLogin(): void {
    this.activeModal.dismiss('login');
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}