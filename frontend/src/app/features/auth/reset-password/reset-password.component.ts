import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, PasswordReset } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  token: string | null = null;
  error: string = '';
  successMessage: string = '';
  tokenInvalid = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  get newPasswordControl() { return this.resetPasswordForm.get('newPassword'); }
  get confirmPasswordControl() { return this.resetPasswordForm.get('confirmPassword'); }

  ngOnInit(): void {
    // Token puede venir como query param (?token=) o como segmento de ruta (/reset-password/:token)
    this.token = this.route.snapshot.queryParamMap.get('token') || this.route.snapshot.paramMap.get('token');
    
    if (!this.token) {
      this.error = 'Token no proporcionado';
      this.tokenInvalid = true;
      return;
    }

    this.loading = true;
    this.authService.validateResetToken(this.token)
      .subscribe({
        next: (isValid) => {
          this.loading = false;
          this.tokenInvalid = !isValid;
          if (!isValid) {
            this.error = 'El token no es válido o ha expirado';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.error = 'Error al validar el token';
          this.tokenInvalid = true;
          console.error('Error validando token:', err);
        }
      });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  passwordsNotMatching(): boolean {
    return this.resetPasswordForm.hasError('mismatch');
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.resetPasswordForm.invalid || !this.token) {
      return;
    }

    this.loading = true;
    const passwordReset: PasswordReset = {
      token: this.token,
      newPassword: this.newPasswordControl?.value,
      confirmPassword: this.confirmPasswordControl?.value
    };
    this.authService.resetPassword(passwordReset)
      .subscribe({
        next: (success) => {
          this.loading = false;
          if (success) {
            this.successMessage = 'Tu contraseña ha sido actualizada exitosamente';
            setTimeout(() => {
              // Enviar al login con una ruta de retorno hacia la configuración del admin.
              // Si el usuario no es admin, el login component redirigirá según sus roles.
              this.router.navigate(['/auth/usuario-login'], {
                queryParams: { returnUrl: '/dashboard/admin/configuracion' }
              });
            }, 3000);
          } else {
            this.error = 'Error al restablecer la contraseña';
          }
        },
        error: (err: HttpErrorResponse) => {
          this.error = 'Error al restablecer la contraseña';
          console.error('Error resetting password:', err);
        }
      });
  }
}