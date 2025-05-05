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
    
    // Validación local para las credenciales fijas
    if (credentials.username === 'javier' && credentials.password === '12345') {
      const userPath = this.userType === 'admin' ? '/dashboard/admin' : '/dashboard/usuario';
      
      this.authService.loginWithFixedCredentials(credentials)
        .subscribe(() => {
          this.loading = false;
          this.activeModal.close('success');
          this.router.navigate([userPath]);
        });
    } else {
      // Si las credenciales no coinciden
      this.loading = false;
      this.error = 'Credenciales incorrectas. Por favor, inténtelo nuevamente.';
    }
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}