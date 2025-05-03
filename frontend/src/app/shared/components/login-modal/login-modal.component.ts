import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';

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
    private router: Router
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

    // Simulación básica de autenticación con las credenciales solicitadas
    setTimeout(() => {
      const { username, password } = this.loginForm.value;
      
      // Modificado para usar las mismas credenciales tanto para admin como para usuario
      if (this.userType === 'admin' && username === 'Javier' && password === '12345') {
        this.activeModal.close('success');
        this.router.navigate(['/dashboard/admin']);
      } else if (this.userType === 'usuario' && username === 'Javier' && password === '12345') {
        this.activeModal.close('success');
        this.router.navigate(['/dashboard/usuario']);
      } else {
        this.error = 'Credenciales incorrectas. Por favor, inténtelo nuevamente.';
        this.loading = false;
      }
    }, 1000);
  }

  dismiss(): void {
    this.activeModal.dismiss();
  }
}