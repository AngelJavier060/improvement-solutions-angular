import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ForgotPasswordModalComponent } from '../../../shared/components/forgot-password-modal/forgot-password-modal.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-usuario-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuario-login.component.html',
  styleUrls: ['./usuario-login.component.scss']
})
export class UsuarioLoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) {
    console.log('[UsuarioLoginComponent] Constructor - Creando componente');

    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });

    console.log('[UsuarioLoginComponent] Formulario creado:', this.loginForm);
  }

  ngOnInit(): void {
    console.log('[UsuarioLoginComponent] ngOnInit - Componente inicializado');

    // Limpiar cualquier sesión anterior cuando se accede al login de usuario
    // Esto asegura que siempre se muestre el formulario de login
    if (this.authService.isAuthenticated()) {
      console.log('[UsuarioLoginComponent] Limpiando sesión anterior para mostrar login');
      this.authService.clearSession();
    }

    console.log('[UsuarioLoginComponent] Componente listo para recibir input del usuario');

    // Capturar returnUrl si viene desde reset de contraseña u otros flujos
    this.route.queryParamMap.subscribe(params => {
      const ru = params.get('returnUrl');
      this.returnUrl = ru ? ru : null;
      if (this.returnUrl) {
        console.log('[UsuarioLoginComponent] returnUrl detectado:', this.returnUrl);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = '';

      const { username, password } = this.loginForm.value;
      // Limpiar contraseña del formulario inmediatamente para no dejarla en memoria
      this.loginForm.patchValue({ password: '' });

      this.authService.login(username, password).subscribe({
        next: (response) => {
          console.log('Login exitoso:', response);
          console.log('Respuesta completa:', JSON.stringify(response, null, 2));
          
          // Obtener información del usuario
          const user = this.authService.getCurrentUser();
          console.log('Usuario actual:', user);
          console.log('Usuario completo:', JSON.stringify(user, null, 2));
          
          const rawRoles: any[] = Array.isArray(response?.userDetail?.roles)
            ? response.userDetail.roles
            : (Array.isArray(user?.roles) ? user.roles : []);
          const roles = this.authService.normalizeRoles(rawRoles);
          const businesses = response.userDetail?.businesses?.length
            ? response.userDetail.businesses
            : (user?.businesses || []);

          // Puerta Usuario de la intranet → siempre módulos /usuario/... (no parámetros admin)
          const isSuper = roles.includes('ROLE_SUPER_ADMIN');
          if (isSuper) {
            // Super no opera por esta puerta
            this.router.navigateByUrl('/dashboard/admin');
            this.loading = false;
            return;
          }

          if (this.returnUrl && roles.includes('ROLE_ADMIN') && this.returnUrl.startsWith('/usuario/')) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            const dest = this.authService.resolvePostLoginUrl(roles, businesses, 'user');
            this.router.navigateByUrl(dest);
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.error = 'Credenciales incorrectas. Por favor, verifique sus datos.';
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Método para volver al home
  goBack(): void {
    this.router.navigate(['/']);
  }

  // Abrir modal de "Olvidé mi contraseña"
  openForgotPassword(): void {
    this.modalService.open(ForgotPasswordModalComponent, {
      centered: true,
      size: 'md',
      backdrop: 'static',
      keyboard: true
    });
  }
}
