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

      this.authService.login(username, password).subscribe({
        next: (response) => {
          console.log('Login exitoso:', response);
          console.log('Respuesta completa:', JSON.stringify(response, null, 2));
          
          // Obtener información del usuario
          const user = this.authService.getCurrentUser();
          console.log('Usuario actual:', user);
          console.log('Usuario completo:', JSON.stringify(user, null, 2));
          
          // Determinar roles del usuario
          const roles: string[] = Array.isArray(response?.userDetail?.roles)
            ? response.userDetail.roles
            : (Array.isArray(user?.roles) ? user.roles : []);
          const isAdmin = roles.includes('ROLE_ADMIN');

          // Verificar si hay información de empresa en la respuesta o en el usuario
          let businessRuc: string | null = null;
          let empresasDisponibles: any[] = [];

          if (response.userDetail?.businesses && response.userDetail.businesses.length > 0) {
            empresasDisponibles = response.userDetail.businesses;
            businessRuc = response.userDetail.businesses[0].ruc;
            console.log('Empresas en respuesta:', empresasDisponibles);
          } else if (user?.businesses && user.businesses.length > 0) {
            empresasDisponibles = user.businesses;
            businessRuc = user.businesses[0].ruc;
            console.log('Empresas del usuario almacenado:', empresasDisponibles);
          }

          console.log('Roles del usuario:', roles);
          console.log('¿Es admin?:', isAdmin);
          console.log('RUC de empresa encontrado:', businessRuc);
          console.log('Total de empresas:', empresasDisponibles.length);

          // Si viene returnUrl y es admin, priorizar navegación a esa ruta
          if (isAdmin && this.returnUrl) {
            console.log('Usuario ADMIN con returnUrl. Redirigiendo a:', this.returnUrl);
            this.router.navigateByUrl(this.returnUrl).then(
              (success) => console.log('Navegación por returnUrl exitosa:', success),
              (error) => console.error('Error en navegación por returnUrl:', error)
            );
          } else if (isAdmin) {
            // En producción debemos llevar al Administrador a la configuración
            console.log('Usuario ADMIN: redirigiendo a configuración del administrador');
            this.router.navigate(['/dashboard/admin/configuracion']).then(
              (success) => console.log('Navegación a admin/configuracion exitosa:', success),
              (error) => console.error('Error en navegación a admin/configuracion:', error)
            );
          } else if (businessRuc) {
            // Usuario de empresa con RUC asociado
            const rutaDestino = `/usuario/${businessRuc}/welcome`;
            console.log('Usuario de empresa: redirigiendo a:', rutaDestino);
            this.router.navigate([rutaDestino]).then(
              (success) => console.log('Navegación exitosa:', success),
              (error) => console.error('Error en navegación:', error)
            );
          } else {
            // Fallback: dashboard de usuario
            console.log('Sin empresa asociada ni rol admin, redirigiendo a dashboard de usuario');
            this.router.navigate(['/dashboard/usuario']);
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
