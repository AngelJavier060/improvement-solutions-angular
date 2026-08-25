import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { TestimoniosService, Testimonio } from '../../shared/services/testimonios.service';
import { SiteVisitsService } from '../../shared/services/site-visits.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  // Usamos rutas relativas para las imágenes (sin barra inicial)
  heroImage = 'assets/img/Personaje_Segundo.jpg';
  
  // Arreglos para la animación de letras del Hero
  titleWord1 = 'IMPROVEMENT'.split('');
  titleWord2 = 'SOLUTIONS'.split('');
  
  // Testimonios que vendrán del servicio
  testimonios: Testimonio[] = [];
  
  navbarScrolled = false;
  heroSoundOn = false;
  showBackToTop = false;
  legalPanel: 'terminos' | 'privacidad' | null = null;
  contactFeedback = '';
  newsletterFeedback = '';

  contact = {
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  };

  newsletterEmail = '';

  partnerLogos = [
    {
      name: 'MCO S.A.',
      sector: 'Maquinarias y Constructora Olvera',
      logo: 'assets/img/MCO.png'
    },
    {
      name: 'Orient Services',
      sector: 'Servicios petroleros',
      logo: 'assets/img/ORS.jpg'
    },
    {
      name: 'Gasolinera Río Coca',
      sector: 'Garantía, calidad y cantidad',
      logo: 'assets/img/GAS.jpg'
    }
  ];

  /** Contador de visitas (acumulado real en servidor) */
  visitCount = 0;
  displayVisits = 0;
  /** Empresas activas reales en la plataforma */
  companiesCount = 0;
  displayCompanies = 0;
  private visitAnimFrame?: number;
  private companiesAnimFrame?: number;

  readonly whatsappNumber = '593962337363';
  readonly contactEmail = 'improvementsolutionsqhse@gmail.com';

  productModules = [
    {
      title: 'Cumplimiento SST',
      desc: 'Controle Decreto 255, matrices IPER y evidencias listas para inspección.',
      icon: 'fa-balance-scale',
      cssClass: 'mod-sst',
      items: ['Política y matriz de riesgos', 'Comité / Delegado', 'Reportes para SUT e IESS']
    },
    {
      title: 'Talento humano',
      desc: 'Expedientes, capacitaciones y vencimientos en un solo panel.',
      icon: 'fa-users',
      cssClass: 'mod-talento',
      items: ['Fichas de personal', 'Cursos y certificados', 'Alertas de vencimiento']
    },
    {
      title: 'Flota y unidades',
      desc: 'Documentación vehicular y control operativo de la flota.',
      icon: 'fa-truck',
      cssClass: 'mod-flota',
      items: ['Documentos por unidad', 'Historial operativo', 'Alertas de renovación']
    },
    {
      title: 'Seguridad industrial',
      desc: 'Índices, inspecciones y seguimiento de hallazgos.',
      icon: 'fa-hard-hat',
      cssClass: 'mod-seguridad',
      items: ['Inspecciones', 'Accidentabilidad', 'Planes de acción']
    },
    {
      title: 'Calidad y ambiente',
      desc: 'Documentos ISO, no conformidades y gestión ambiental.',
      icon: 'fa-leaf',
      cssClass: 'mod-calidad',
      items: ['Control documental', 'Hallazgos', 'Indicadores QHSE']
    },
    {
      title: 'Dashboard gerencial',
      desc: 'Visión ejecutiva del cumplimiento y el riesgo operativo.',
      icon: 'fa-chart-line',
      cssClass: 'mod-dashboard',
      items: ['KPIs en tiempo real', 'Alertas críticas', 'Exportables para auditoría']
    }
  ];

  faqs: { q: string; a: string; open: boolean }[] = [
    {
      q: '¿El Decreto 255 aplica a mi empresa aunque sea pequeña?',
      a: 'Sí. Desde 1 trabajador ya existen obligaciones mínimas (política SST y matriz de riesgos). A partir de 10 y de 50 trabajadores se suman Delegado, Reglamento en el SUT y Comité Paritario.',
      open: false
    },
    {
      q: '¿Cuánto tarda implementar el sistema?',
      a: 'En la mayoría de casos dejamos la plataforma operativa en 48 horas, con acompañamiento para cargar información crítica y evidencias.',
      open: false
    },
    {
      q: '¿Puedo empezar con un plan y luego subir de nivel?',
      a: 'Sí. Los planes Básico, Empresarial y Corporativo son escalables. Puede iniciar por lo esencial y ampliar módulos cuando lo necesite.',
      open: false
    },
    {
      q: '¿Cómo solicito una demostración o cotización?',
      a: 'Use el formulario de contacto, el botón de WhatsApp o el correo. Si llega desde un plan, el asunto se preselecciona automáticamente.',
      open: false
    },
    {
      q: '¿Trabajan en Riobamba y en la Amazonía?',
      a: 'Sí. Atendemos desde Riobamba (Rocafuerte y 10 de Agosto) y Joya de los Sachas (Av. Jaime Roldós y Guayaquil), con soporte remoto a nivel nacional.',
      open: false
    }
  ];

  private readonly asuntoLabels: Record<string, string> = {
    'plan-basico': 'Plan Básico',
    'plan-empresarial': 'Plan Empresarial',
    'plan-corporativo': 'Plan Corporativo',
    'consulta-general': 'Consulta General'
  };

  @ViewChild('heroVideo') heroVideoRef?: ElementRef<HTMLVideoElement>;

  private heroObserver?: IntersectionObserver;
  private visitSectionObserver?: IntersectionObserver;
  private visibilityHandler?: () => void;
  private heroInView = true;
  private playInFlight = false;
  private visitCountedAnimated = false;
  private visitSectionSeen = false;
  private visitsLoaded = false;

  constructor(
    private testimoniosService: TestimoniosService,
    private modalService: NgbModal,
    private authService: AuthService,
    private router: Router,
    private siteVisitsService: SiteVisitsService
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
    this.silenceAllMedia();
    this.initVisitCounter();
  }

  ngAfterViewInit(): void {
    this.setupHeroVideoPlayback();
    this.setupVisitCounterObserver();
  }

  ngOnDestroy(): void {
    this.heroObserver?.disconnect();
    this.heroObserver = undefined;
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = undefined;
    }
    this.silenceAllMedia();
    document.body.style.overflow = '';
    if (this.visitAnimFrame) {
      cancelAnimationFrame(this.visitAnimFrame);
    }
    if (this.companiesAnimFrame) {
      cancelAnimationFrame(this.companiesAnimFrame);
    }
    this.visitSectionObserver?.disconnect();
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
    this.showBackToTop = window.scrollY > 480;
    const hero = document.getElementById('inicio');
    if (!hero) {
      return;
    }
    const stillVisible = hero.getBoundingClientRect().bottom > window.innerHeight * 0.4;
    if (!stillVisible) {
      this.heroInView = false;
      this.silenceAllMedia();
    }
  }

  preselectAsunto(value: string): void {
    this.contact.asunto = value;
    this.contactFeedback = '';
  }

  toggleFaq(index: number): void {
    this.faqs = this.faqs.map((faq, i) => ({
      ...faq,
      open: i === index ? !faq.open : false
    }));
  }

  onContactSubmit(event: Event, channel: 'whatsapp' | 'email' = 'whatsapp'): void {
    event.preventDefault();
    const nombre = this.contact.nombre.trim();
    const email = this.contact.email.trim();
    const mensaje = this.contact.mensaje.trim();
    const asunto = this.contact.asunto;

    if (!nombre || !email || !mensaje || !asunto) {
      this.contactFeedback = 'Complete nombre, email, asunto y mensaje para continuar.';
      return;
    }

    const asuntoLabel = this.asuntoLabels[asunto] || asunto;
    const empresa = this.contact.empresa.trim() || 'No indicada';
    const telefono = this.contact.telefono.trim() || 'No indicado';
    const plainBody =
      `Hola Improvement Solutions,\n\n` +
      `Nombre: ${nombre}\n` +
      `Empresa: ${empresa}\n` +
      `Email: ${email}\n` +
      `Teléfono: ${telefono}\n` +
      `Asunto: ${asuntoLabel}\n\n` +
      `Mensaje:\n${mensaje}`;

    if (channel === 'email') {
      window.location.href =
        `mailto:${this.contactEmail}?subject=${encodeURIComponent('Consulta: ' + asuntoLabel)}&body=${encodeURIComponent(plainBody)}`;
      this.contactFeedback = 'Se abrió su correo. Si no se abre, escríbanos por WhatsApp.';
      return;
    }

    window.open(`https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(plainBody)}`, '_blank', 'noopener');
    this.contactFeedback = 'Se abrió WhatsApp con su consulta. También puede enviarla por correo.';
  }

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    const email = this.newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.newsletterFeedback = 'Ingrese un correo válido.';
      return;
    }
    const text = `Hola Improvement Solutions, quiero suscribirme al boletín con el correo: ${email}`;
    window.open(`https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    this.newsletterFeedback = 'Listo: confirme su suscripción por WhatsApp.';
    this.newsletterEmail = '';
  }

  openLegal(panel: 'terminos' | 'privacidad'): void {
    this.legalPanel = panel;
    document.body.style.overflow = 'hidden';
  }

  closeLegal(): void {
    this.legalPanel = null;
    document.body.style.overflow = '';
  }

  scrollToTop(event?: Event): void {
    event?.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private initVisitCounter(): void {
    this.displayVisits = 0;
    this.visitCount = 0;
    this.displayCompanies = 0;
    this.companiesCount = 0;
    this.visitsLoaded = false;
    this.siteVisitsService.registerVisitOnce().subscribe((stats) => {
      this.visitCount = Math.max(0, Number(stats.visits) || 0);
      this.companiesCount = Math.max(0, Number(stats.companiesActive) || 0);
      this.visitsLoaded = true;
      this.tryAnimateVisits();
    });
  }

  private setupVisitCounterObserver(): void {
    const section = document.getElementById('confian');
    if (!section || typeof IntersectionObserver === 'undefined') {
      this.visitSectionSeen = true;
      this.tryAnimateVisits();
      return;
    }

    this.visitSectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        this.visitSectionSeen = true;
        this.tryAnimateVisits();
      }
    }, { threshold: 0.35 });

    this.visitSectionObserver.observe(section);
  }

  private tryAnimateVisits(): void {
    if (!this.visitSectionSeen || !this.visitsLoaded || this.visitCountedAnimated) {
      return;
    }
    this.visitCountedAnimated = true;
    this.visitSectionObserver?.disconnect();
    this.animateVisitCount(0, this.visitCount, 1200);
    this.animateCompaniesCount(0, this.companiesCount, 1000);
  }

  private animateCompaniesCount(from: number, to: number, durationMs: number): void {
    const start = performance.now();
    const diff = to - from;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayCompanies = Math.round(from + diff * eased);
      if (progress < 1) {
        this.companiesAnimFrame = requestAnimationFrame(step);
      } else {
        this.displayCompanies = to;
      }
    };

    this.companiesAnimFrame = requestAnimationFrame(step);
  }

  private animateVisitCount(from: number, to: number, durationMs: number): void {
    const start = performance.now();
    const diff = to - from;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.displayVisits = Math.round(from + diff * eased);
      if (progress < 1) {
        this.visitAnimFrame = requestAnimationFrame(step);
      } else {
        this.displayVisits = to;
      }
    };

    this.visitAnimFrame = requestAnimationFrame(step);
  }

  toggleHeroSound(): void {
    const video = this.getHeroVideo();
    if (!video) {
      return;
    }
    this.heroSoundOn = !this.heroSoundOn;
    this.applySoundState(video);
    if (this.heroInView && video.paused) {
      this.playHeroVideo();
    }
  }

  private setupHeroVideoPlayback(): void {
    this.heroObserver?.disconnect();
    this.silenceAllMedia();
    this.heroSoundOn = false;

    const video = this.getHeroVideo();
    const hero = document.getElementById('inicio');
    if (!video || !hero) {
      return;
    }

    this.applySoundState(video);
    video.pause();

    this.heroObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      this.heroInView = !!(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      if (this.heroInView) {
        this.playHeroVideo();
      } else {
        this.pauseHeroVideo();
      }
    }, { threshold: [0, 0.4, 1] });
    this.heroObserver.observe(hero);

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pauseHeroVideo();
      } else if (this.heroInView) {
        this.playHeroVideo();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.playHeroVideo();
  }

  private playHeroVideo(): void {
    const video = this.getHeroVideo();
    if (!video || !this.heroInView || this.playInFlight || !video.paused) {
      return;
    }
    this.playInFlight = true;
    this.applySoundState(video);
    video.play()
      .catch(() => {
        this.heroSoundOn = false;
        this.applySoundState(video);
        return video.paused ? video.play() : Promise.resolve();
      })
      .finally(() => {
        this.playInFlight = false;
      });
  }

  private pauseHeroVideo(): void {
    this.silenceAllMedia();
  }

  private applySoundState(video: HTMLVideoElement): void {
    video.muted = !this.heroSoundOn;
    video.volume = this.heroSoundOn ? 1 : 0;
    video.defaultMuted = !this.heroSoundOn;
  }

  private silenceAllMedia(): void {
    document.querySelectorAll('video, audio').forEach((el) => {
      const media = el as HTMLMediaElement;
      media.pause();
      media.muted = true;
      media.volume = 0;
    });
  }

  private getHeroVideo(): HTMLVideoElement | null {
    return this.heroVideoRef?.nativeElement ?? null;
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