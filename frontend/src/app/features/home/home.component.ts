import { Component, OnInit, HostListener } from '@angular/core';
import { TestimoniosService, Testimonio } from '../../shared/services/testimonios.service';

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

  constructor(private testimoniosService: TestimoniosService) {
    console.log('Componente Home inicializado');
  }
  
  ngOnInit(): void {
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
}