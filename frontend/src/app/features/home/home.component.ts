import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TestimoniosService, Testimonio } from '../../shared/services/testimonios.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // Usamos rutas relativas para las imágenes (sin barra inicial)
  heroImage = 'assets/img/impr11.png';
  
  // Testimonios que vendrán del servicio
  testimonios: Testimonio[] = [];
  
  navbarScrolled = false;

  constructor(
    private testimoniosService: TestimoniosService,
    private modalService: NgbModal,
    private authService: AuthService,
    private router: Router
  ) {
    console.log('Componente Home inicializado');
  }
  
  ngOnInit(): void {
    // Comentamos la redirección automática para permitir que los usuarios 
    // elijan entre Administrador y Usuario desde la página principal
    
    // if (this.authService.isAuthenticated()) {
    //   const user = this.authService.getCurrentUser();
    //   if (user?.business?.ruc) {
    //     // Redirigir al dashboard de su empresa
    //     this.router.navigate([`/${user.business.ruc}/dashboard`]);
    //     return;
    //   }
    // }
    
    // Si no está autenticado, mostrar la landing page con opciones de acceso
    
    // Obtener los testimonios del servicio
    this.testimonios = this.testimoniosService.getTestimonios();
    
    // Precargar la imagen hero
    this.preloadImage(this.heroImage);
    
    // Inicializar AOS (Animate On Scroll)
    this.inicializarAOS();
  }
  
  // Método para precargar y verificar imágenes
  private preloadImage(src: string): void {
    const img = new Image();
    img.onload = () => console.log(`✅ Imagen cargada correctamente: ${src}`);
    img.onerror = () => console.error(`❌ Error al cargar imagen: ${src}`);
    img.src = src;
  }
  
  // Inicializar la biblioteca AOS para animaciones al scroll
  private inicializarAOS(): void {
    if (typeof window !== 'undefined' && typeof (window as any).AOS !== 'undefined') {
      const AOS = (window as any).AOS;
      AOS.init({
        duration: 1000,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.navbarScrolled = window.scrollY > 20;
  }

  // Método para abrir el modal de login
  openLoginModal(userType: 'admin' | 'usuario'): void {
    console.log('[HomeComponent] openLoginModal llamado con userType:', userType);

    if (userType === 'usuario') {
      // Para usuarios empresariales, redirigir a login simple
      console.log('[HomeComponent] Navegando a /auth/usuario-login');
      this.router.navigate(['/auth/usuario-login']).then(
        (success) => {
          console.log('[HomeComponent] Navegación exitosa:', success);
        },
        (error) => {
          console.error('[HomeComponent] Error en navegación:', error);
        }
      );
      return;
    }

    // Para administradores, mantener el modal original
    console.log('[HomeComponent] Abriendo modal para admin');
    const modalRef = this.modalService.open(LoginModalComponent, {
      centered: true,
      backdrop: 'static',
      windowClass: 'login-modal'
    });
    modalRef.componentInstance.userType = userType;

    modalRef.result.then(
      (result) => {
        if (result === 'success') {
          console.log('Login exitoso como', userType);
          // La navegación se maneja dentro del componente modal
        }
      },
      (reason) => {
        console.log('Modal cerrado', reason);
      }
    );
  }

  // Método para manejar clic en usuario (diagnóstico)
  onUsuarioClick(): void {
    console.log('[HomeComponent] Clic en Usuario detectado');
    console.log('[HomeComponent] Navegando manualmente a /auth/usuario-login');
    this.router.navigate(['/auth/usuario-login']).then(
      (success) => {
        console.log('[HomeComponent] Navegación manual exitosa:', success);
      },
      (error) => {
        console.error('[HomeComponent] Error en navegación manual:', error);
      }
    );
  }
}