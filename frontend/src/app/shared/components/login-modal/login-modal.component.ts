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
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const credentials = this.loginForm.value;
    
    this.authService.loginWithFixedCredentials(credentials)
      .subscribe({
        next: (response: AuthResponse) => {
          this.loading = false;
          
          const roles = response.userDetail.roles || [];
          let userPath = '/dashboard/usuario';
          
          if (roles.includes('ROLE_ADMIN')) {
            userPath = '/dashboard/admin';
          }
          
          this.activeModal.close('success');
          this.router.navigate([userPath]);
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          if (err.status === 401) {
            this.error = 'Usuario o contraseña incorrectos';
          } else {
            this.error = 'Error al iniciar sesión';
          }
          console.error('Error en login:', err);
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