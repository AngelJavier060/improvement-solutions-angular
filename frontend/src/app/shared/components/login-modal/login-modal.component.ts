import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  @Input() userType: 'admin' | 'usuario' = 'usuario'; // Valor por defecto
  loginForm!: FormGroup; // Usar ! para indicar que será inicializada en ngOnInit
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(5)]] // Cambiado minLength a 5 para permitir 12345
    });
  }

  // Getters para simplificar el acceso a los campos del formulario
  get usernameControl() { return this.loginForm.get('username'); }
  get passwordControl() { return this.loginForm.get('password'); }

  get userTypeTitle(): string {
    return this.userType === 'admin' ? 'Administrador' : 'Usuario';
  }

  get userTypeClass(): string {
    return this.userType === 'admin' ? 'text-warning' : 'text-success';
  }

  get userTypeIcon(): string {
    return this.userType === 'admin' ? 'fas fa-user-shield' : 'fas fa-user';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const credentials = this.loginForm.value;
    
    // Usar el servicio de autenticación para validar las credenciales
    this.authService.loginWithFixedCredentials(credentials)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          // Determinar la ruta según el rol del usuario
          const roles = response.userDetail.roles || [];
          let userPath = '/dashboard/usuario';
          
          // Si el usuario tiene rol de administrador, redirigir al dashboard de admin
          if (roles.includes('ROLE_ADMIN')) {
            userPath = '/dashboard/admin';
          }
          
          this.activeModal.close('success');
          this.router.navigate([userPath]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.message || 'Credenciales incorrectas. Por favor, inténtelo nuevamente.';
        }
      });
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}