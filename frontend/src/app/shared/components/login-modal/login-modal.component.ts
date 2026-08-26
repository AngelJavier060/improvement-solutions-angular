import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../../core/services/auth.service';
import { ForgotPasswordModalComponent } from '../forgot-password-modal/forgot-password-modal.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  @Input() userType: 'admin' | 'user' = 'user';
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private router: Router,
    private authService: AuthService,
    private modalService: NgbModal
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {}

  get usernameControl() { return this.loginForm.get('username'); }
  get passwordControl() { return this.loginForm.get('password'); }

  get userTypeIcon(): string {
    return this.userType === 'admin' ? 'fas fa-user-shield' : 'fas fa-user';
  }

  get userTypeClass(): string {
    return this.userType === 'admin' ? 'text-primary' : 'text-success';
  }

  get userTypeTitle(): string {
    return this.userType === 'admin' ? 'Administrador' : 'Usuario';
  }  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const credentials = this.loginForm.value;
    
    console.log('Intentando login para usuario:', credentials.username);
    
    this.authService.login(credentials)
      .subscribe({
        next: (response: AuthResponse) => {
          // Limpiar contraseña del formulario inmediatamente tras login exitoso
          this.loginForm.patchValue({ password: '' });
          console.log('Login exitoso, respuesta:', response);
          this.loading = false;
          
          const roles = this.authService.normalizeRoles(response.userDetail?.roles || []);
          const businesses = response.userDetail?.businesses || [];

          // Puerta Administrador de la intranet → parámetros / plataforma
          if (!this.authService.canUseAdminEntry(roles)) {
            this.authService.logout();
            this.loading = false;
            this.error = 'Esta cuenta no es de Administrador. Use Acceder → Usuario.';
            return;
          }

          const userPath = this.authService.resolvePostLoginUrl(roles, businesses, 'admin');
          if (userPath === '__FORBIDDEN_ADMIN_ENTRY__') {
            this.authService.logout();
            this.loading = false;
            this.error = 'Esta cuenta no es de Administrador. Use Acceder → Usuario.';
            return;
          }

          this.activeModal.close('success');
          this.router.navigateByUrl(userPath);
        },
        error: (error: any) => {
          console.error('Error en login:', error);
          // Limpiar contraseña también en caso de error para no dejarla expuesta
          this.loginForm.patchValue({ password: '' });
          this.loading = false;
          
          if (typeof error === 'string') {
            this.error = error;
          } else if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
              this.error = 'No se pudo conectar con el servidor';
            } else if (error.status === 401) {
              this.error = 'Usuario o contraseña incorrectos';
            } else if (error.status === 403) {
              this.error = 'Usuario inactivo o sin permisos';
            } else {
              this.error = error.error?.message || 'Error desconocido';
            }
          } else {
            this.error = 'Error al iniciar sesión';
          }
        }
      });
  }

  openForgotPasswordModal(): void {
    this.activeModal.dismiss();
    this.modalService.open(ForgotPasswordModalComponent);
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}