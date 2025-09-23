import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
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
          
          // Verificar si hay información de empresa en la respuesta o en el usuario
          let businessRuc = null;
          let empresasDisponibles = [];
          
          if (response.userDetail?.businesses && response.userDetail.businesses.length > 0) {
            // Si el usuario tiene empresas, usar la primera empresa
            empresasDisponibles = response.userDetail.businesses;
            businessRuc = response.userDetail.businesses[0].ruc;
            console.log('Empresas en respuesta:', empresasDisponibles);
          } else if (user?.businesses && user.businesses.length > 0) {
            empresasDisponibles = user.businesses;
            businessRuc = user.businesses[0].ruc;
            console.log('Empresas del usuario almacenado:', empresasDisponibles);
          }
          
          console.log('RUC de empresa encontrado:', businessRuc);
          console.log('Total de empresas:', empresasDisponibles.length);
          
          if (businessRuc) {
            // Redirigir a página de bienvenida de la empresa
            const rutaDestino = `/usuario/${businessRuc}/welcome`;
            console.log('Redirigiendo a:', rutaDestino);
            this.router.navigate([rutaDestino]).then(
              (success) => console.log('Navegación exitosa:', success),
              (error) => console.error('Error en navegación:', error)
            );
          } else {
            // Si no hay empresa asociada, redirigir al dashboard general de usuario
            console.log('No se encontró empresa, redirigiendo a dashboard de usuario');
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
}
