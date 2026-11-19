import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { IdleTimeoutService } from '../../../core/services/idle-timeout.service';
import { environment } from '../../../../environments/environment';
import {
  EmployeePanelService,
  EmployeeDashboard,
  EmployeePanelDocument,
  EmployeePanelCourse,
  EmployeePanelCard,
  EmployeeProfile,
  EmployeeCartilla,
  EmployeeCartillaRecord
} from '../../../services/employee-panel.service';
import { AulaVirtualService } from '../../../services/aula-virtual.service';

@Component({
  selector: 'app-dashboard-empleado',
  templateUrl: './dashboard-empleado.component.html',
  styleUrls: ['./dashboard-empleado.component.scss']
})
export class DashboardEmpleadoComponent implements OnInit, OnDestroy {

  dashboard: EmployeeDashboard | null = null;
  isLoading = true;
  error = '';
  activeTab: 'resumen' | 'documentos' | 'cursos' | 'aula' | 'tarjetas' | 'perfil' | 'cartilla' = 'resumen';
  aulaCursoAbierto: number | null = null;
  aulaVideoTerminado = false;
  aulaEnSala = false;
  private aulaSegundoVisto = 0;
  aulaRespuestas: number[] = [];
  aulaNota: number | null = null;
  aulaVeredicto: 'aprobado' | 'reintentar' | 'reprobado' | null = null;
  private aulaEnviando = false;
  aulaSegundos = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;
  aulaAviso = '';
  aulaPreguntas: { texto: string; opciones: string[] }[] = [];
  aulaCursos: any[] = [];
  private videoObjectUrl: string | null = null;

  documents: EmployeePanelDocument[] = [];
  courses: EmployeePanelCourse[] = [];
  cards: EmployeePanelCard[] = [];
  cartillas: EmployeeCartilla[] = [];
  cartillaIndex = 0;
  cartillaCargando = false;
  cartillaAviso = '';
  profile: EmployeeProfile | null = null;
  openingFile = false;
  avatarUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private employeePanelService: EmployeePanelService,
    private aulaService: AulaVirtualService,
    private router: Router,
    private idle: IdleTimeoutService
  ) {}

  ngOnDestroy(): void {
    this.detenerReloj();
    this.idle.resume();
  }

  ngOnInit(): void {
    if (!this.authService.hasRole('ROLE_EMPLOYEE')) {
      this.router.navigate(['/']);
      return;
    }
    this.loadDashboard();
    this.loadProfile();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.employeePanelService.getMyDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar el panel de empleado';
        this.isLoading = false;
      }
    });
  }

  get avisosDocumento(): number {
    if (!this.dashboard) return 0;
    return (this.dashboard.documentsPorVencer || 0) + (this.dashboard.documentsVencidos || 0);
  }

  irAlerta(alert: { type: string; message: string }): void {
    const texto = (alert.message || '').toLowerCase();
    if (texto.includes('curso') || texto.includes('certific')) {
      this.setTab('cursos');
      return;
    }
    this.setTab('documentos');
  }

  etiquetaAlerta(alert: { type: string; message: string }): string {
    const texto = (alert.message || '').toLowerCase();
    return texto.includes('curso') || texto.includes('certific') ? 'Ver cursos' : 'Ver documentos';
  }

  setTab(tab: 'resumen' | 'documentos' | 'cursos' | 'aula' | 'tarjetas' | 'perfil' | 'cartilla'): void {
    if (this.activeTab === 'aula' && tab !== 'aula') this.idle.resume();
    this.activeTab = tab;
    if (tab === 'documentos' && this.documents.length === 0) {
      this.loadDocuments();
    }
    if (tab === 'cursos' && this.courses.length === 0) {
      this.loadCourses();
    }
    if (tab === 'tarjetas' && this.cards.length === 0) {
      this.loadCards();
    }
    if (tab === 'aula') {
      this.aulaAviso = '';
      this.cargarAula();
    }
    if (tab === 'perfil') {
      if (!this.profile) this.loadProfile();
      this.cargarAula();
    }
    if (tab === 'cartilla' && this.cartillas.length === 0) {
      this.loadCartilla();
    }
  }

  loadCartilla(): void {
    this.cartillaCargando = true;
    this.cartillaAviso = '';
    this.employeePanelService.getMyCartilla().subscribe({
      next: (filas) => {
        this.cartillas = filas || [];
        this.cartillaIndex = 0;
        this.cartillaCargando = false;
        if (!this.cartillas.length) this.cartillaAviso = 'Todavía no hay una cartilla de capacitaciones para este año.';
      },
      error: (err) => {
        this.cartillaCargando = false;
        this.cartillaAviso = err?.error?.message || 'No se pudo cargar la cartilla.';
      }
    });
  }

  get cartillaActiva(): EmployeeCartilla | null {
    return this.cartillas[this.cartillaIndex] || null;
  }

  cartillaPorcentaje(item: EmployeeCartilla): number {
    const total = (item.worker.received || 0) + (item.worker.pending || 0);
    if (!total) return 0;
    return Math.round((item.worker.received * 100) / total);
  }

  cartillaHoras(item: EmployeeCartilla): number {
    if (item.worker.hoursTotal) return item.worker.hoursTotal;
    return (item.worker.records || []).reduce((suma, fila) => suma + (Number(fila.hours) || 0), 0);
  }

  cartillaArea(item: EmployeeCartilla): string {
    const partes = [item.worker.department, item.worker.contractorCompany, item.worker.block]
      .map(valor => (valor || '').trim())
      .filter(Boolean);
    return partes.length ? partes.join(' · ') : '—';
  }

  cartillaFecha(valor?: string): string {
    if (!valor) return '—';
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const [anio, mes, dia] = valor.slice(0, 10).split('-');
      return `${dia}/${mes}/${anio.slice(2)}`;
    }
    return valor;
  }

  cartillaTipo(fila: EmployeeCartillaRecord): string {
    const origen = (fila.origin || '').toUpperCase();
    const tipo = (fila.activityType || '').toUpperCase();
    if (tipo === 'SIMULACRO' || (fila.topicName || '').toUpperCase().includes('SIMULACRO')) return 'Simulacro';
    if (origen === 'REINDUCCION') return 'Reinducción';
    if (origen === 'EVENTUAL') return 'Fuera de programa';
    if (tipo === 'ENTRENAMIENTO') return 'Entrenamiento';
    return 'Plan anual';
  }

  cartillaModalidad(fila: EmployeeCartillaRecord): string {
    const horas = fila.hours != null && fila.hours > 0 ? `${fila.hours}h` : '';
    const metodo = (fila.methodology || '').trim();
    if (metodo && horas) return `${metodo} · ${horas}`;
    if (metodo) return metodo;
    return horas || '—';
  }

  inicialesCartilla(nombre: string): string {
    return (nombre || '').split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('');
  }

  fechaPerfil(valor: unknown): string {
    const iso = this.fechaIso(valor);
    if (!iso) return '—';
    const [anio, mes, dia] = iso.split('-');
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const nombre = meses[Number(mes) - 1] || mes;
    return `${Number(dia)} de ${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}, ${anio}`;
  }

  fechaIso(valor: unknown): string {
    if (!valor) return '';
    if (Array.isArray(valor) && valor.length >= 3) {
      const [anio, mes, dia] = valor;
      return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    const texto = String(valor).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto : '';
  }

  siglasEmpresa(nombre: string): string {
    const limpio = (nombre || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
    return (limpio.slice(0, 3) || 'SST').toUpperCase();
  }

  cartillaClase(fila: EmployeeCartillaRecord): string {
    const tipo = this.cartillaTipo(fila);
    if (tipo === 'Simulacro') return 'is-sim';
    if (tipo === 'Reinducción') return 'is-rei';
    if (tipo === 'Entrenamiento') return 'is-ent';
    if (tipo === 'Fuera de programa') return 'is-out';
    return 'is-plan';
  }

  cartillaModo(fila: EmployeeCartillaRecord): string {
    const metodo = (fila.methodology || '').trim();
    if (metodo) return metodo;
    const tipo = (fila.activityType || '').toUpperCase();
    if (tipo === 'ENTRENAMIENTO') return 'Práctico';
    if (tipo === 'SIMULACRO') return 'Simulacro';
    return 'Presencial';
  }

  imprimirCartilla(): void {
    window.print();
  }

  cargarAula(): void {
    const abierto = this.aulaCursoAbierto;
    const src = this.videoObjectUrl;
    this.aulaService.misCursos().subscribe({
      next: (filas) => {
        const cursos = filas || [];
        if (abierto && src) {
          const curso = cursos.find(item => item.id === abierto);
          if (curso) curso.videoSrc = src;
        }
        this.aulaCursos = cursos;
      },
      error: (err) => { this.aulaAviso = err?.error?.message || 'No se pudieron cargar las capacitaciones.'; }
    });
  }

  abrirAula(cursoId: number): void {
    this.aulaCursoAbierto = cursoId;
    this.aulaVideoTerminado = false;
    this.aulaEnSala = false;
    this.aulaSegundoVisto = 0;
    this.aulaRespuestas = [];
    this.aulaNota = null;
    this.aulaVeredicto = null;
    this.aulaEnviando = false;
    this.detenerReloj();
    this.aulaPreguntas = [];
    this.aulaAviso = '';
    const curso = this.aulaCursos.find(item => item.id === cursoId);
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
    if (curso?.tieneVideo && !curso.vencido) {
      this.aulaService.video(curso.businessId, curso.id).subscribe({
        next: (blob) => {
          this.videoObjectUrl = URL.createObjectURL(blob);
          curso.videoSrc = this.videoObjectUrl;
        },
        error: () => { this.aulaAviso = 'No se pudo abrir el video.'; }
      });
    }
  }

  get charlasPerfil(): any[] {
    return this.aulaCursos.filter(curso => curso.sala && (curso.modalidad === 'vivo' || curso.modalidad === 'charla'));
  }

  fechaCharla(curso: any): string {
    const hora = curso?.hora;
    if (!hora) return 'Por definir';
    if (Array.isArray(hora)) {
      const [anio, mes, dia, hh = 0, mm = 0] = hora;
      const dos = (valor: number) => String(valor).padStart(2, '0');
      return `${anio}-${dos(mes)}-${dos(dia)} ${dos(hh)}:${dos(mm)}`;
    }
    return String(hora).replace('T', ' ').slice(0, 16);
  }

  unirmeDesdePerfil(cursoId: number): void {
    this.activeTab = 'aula';
    this.aulaService.misCursos().subscribe({
      next: (filas) => {
        this.aulaCursos = filas || [];
        this.abrirAula(cursoId);
        this.entrarSala();
      },
      error: () => { this.aulaAviso = 'No se pudo abrir la charla.'; }
    });
  }

  cerrarAula(): void {
    this.aulaCursoAbierto = null;
  }

  get aulaAbierta() {
    return this.aulaCursos.find(curso => curso.id === this.aulaCursoAbierto) || null;
  }

  registrarAvance(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.seeking) return;
    if (video.currentTime > this.aulaSegundoVisto) {
      this.aulaSegundoVisto = video.currentTime;
    }
  }

  bloquearSalto(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (Math.abs(video.currentTime - this.aulaSegundoVisto) > 0.4) {
      video.currentTime = this.aulaSegundoVisto;
    }
  }

  fijarVelocidad(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.playbackRate !== 1) video.playbackRate = 1;
  }

  volumenMedio(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) video.volume = 0.5;
  }

  bloquearTeclas(event: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }

  terminarVideo(): void {
    this.idle.resume();
    this.aulaVideoTerminado = true;
    const curso = this.aulaAbierta;
    if (!curso || curso.estado === 'Cumplió' || this.aulaVeredicto === 'reprobado') return;
    this.aulaService.videoVisto(curso.id).subscribe();
    this.cargarPreguntas(curso.id);
  }

  alReproducir(): void {
    this.idle.pause();
  }

  alPausar(): void {
    if (!this.aulaVideoTerminado) this.idle.resume();
  }

  repetirVideo(): void {
    this.aulaVideoTerminado = false;
    this.aulaVeredicto = null;
    this.aulaEnviando = false;
    this.aulaNota = null;
    this.aulaPreguntas = [];
    this.aulaRespuestas = [];
    this.aulaAviso = '';
    this.detenerReloj();
    const video = document.querySelector('.aula-video') as HTMLVideoElement | null;
    if (!video) return;
    video.currentTime = 0;
    video.play();
  }

  get relojLabel(): string {
    const minutos = Math.floor(Math.max(0, this.aulaSegundos) / 60);
    const segundos = Math.max(0, this.aulaSegundos) % 60;
    return `${minutos}:${String(segundos).padStart(2, '0')}`;
  }

  entrarSala(): void {
    const curso = this.aulaAbierta;
    if (!curso) return;
    this.abrirCharlaEnPestana();
    this.aulaEnSala = true;
    this.aulaService.ingreso(curso.id).subscribe({
      error: (err) => { this.aulaAviso = err?.error?.message || 'No se pudo registrar el ingreso.'; }
    });
  }

  abrirCharlaEnPestana(): void {
    const curso = this.aulaAbierta;
    if (!curso) return;
    window.open(`https://charla.improvement-solution.com/ImprovementSolutions${curso.businessId}c${curso.id}`, '_blank', 'noopener');
  }

  volverAlVideo(): void {
    this.aulaEnSala = false;
  }

  get faltanRespuestas(): boolean {
    const contestadas = this.aulaRespuestas.filter(respuesta => respuesta != null).length;
    return contestadas < this.aulaPreguntas.length;
  }

  salirSala(): void {
    this.aulaEnSala = false;
    this.aulaVideoTerminado = true;
    const curso = this.aulaAbierta;
    if (curso && curso.estado !== 'Cumplió') this.cargarPreguntas(curso.id);
  }

  elegirRespuesta(indice: number, opcion: number): void {
    this.aulaRespuestas[indice] = opcion;
  }

  enviarEvaluacion(): void {
    const curso = this.aulaAbierta;
    if (!curso || this.aulaVeredicto || this.aulaEnviando) return;
    this.aulaEnviando = true;
    this.detenerReloj();
    this.aulaService.responder(curso.id, this.aulaRespuestas).subscribe({
      next: (res) => {
        this.idle.resume();
        this.aulaNota = res.nota;
        curso.nota = res.nota;
        const aprobada = res.estado === 'CUMPLIO';
        const quedan = (res.intentosUsados || 0) < (res.intentos || 1);
        if (aprobada) {
          this.aulaVeredicto = 'aprobado';
          curso.estado = 'Cumplió';
        } else if (quedan) {
          this.aulaVeredicto = 'reintentar';
          curso.estado = 'No alcanzó';
        } else {
          this.aulaVeredicto = 'reprobado';
          curso.estado = 'No alcanzó';
        }
      },
      error: (err) => {
        this.aulaEnviando = false;
        this.aulaAviso = err?.error?.message || 'No se pudo guardar la nota.';
      }
    });
  }

  abrirMaterial(curso: any): void {
    if (!curso?.tienePdf) return;
    this.aulaService.material(curso.businessId, curso.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => { this.aulaAviso = 'No se pudo abrir la presentación.'; }
    });
  }

  private cargarPreguntas(cursoId: number): void {
    this.aulaService.iniciarEvaluacion(cursoId).subscribe({
      next: (res) => {
        this.aulaPreguntas = res?.preguntas || [];
        this.aulaRespuestas = [];
        if (!this.aulaPreguntas.length) return;
        const curso = this.aulaAbierta;
        const minutos = Math.max(1, Number(curso?.minutosEvaluacion) || 10);
        this.aulaSegundos = minutos * 60;
        this.idle.pause();
        this.detenerReloj();
        this.reloj = setInterval(() => {
          this.aulaSegundos -= 1;
          if (this.aulaSegundos <= 0) this.enviarEvaluacion();
        }, 1000);
      },
      error: (err) => { this.aulaAviso = err?.error?.message || 'No se pudo armar la evaluación.'; }
    });
  }

  private detenerReloj(): void {
    if (this.reloj) {
      clearInterval(this.reloj);
      this.reloj = null;
    }
  }

  loadDocuments(): void {
    this.employeePanelService.getMyDocuments().subscribe({
      next: (data) => { this.documents = data || []; },
      error: () => { this.documents = []; }
    });
  }

  loadCourses(): void {
    this.employeePanelService.getMyCourses().subscribe({
      next: (data) => { this.courses = data || []; },
      error: () => { this.courses = []; }
    });
  }

  loadCards(): void {
    this.employeePanelService.getMyCards().subscribe({
      next: (data) => { this.cards = data || []; },
      error: () => { this.cards = []; }
    });
  }

  loadProfile(): void {
    this.employeePanelService.getMyProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.avatarUrl = this.resolveImageUrl(data?.imagePath);
      },
      error: () => {
        this.profile = null;
        this.avatarUrl = null;
      }
    });
  }

  private resolveImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const base = (environment.apiUrl || '').replace(/\/$/, '');
    if (/^https?:\/\//i.test(path)) return path;
    let rel = path.replace(/^\/+/, '');
    if (rel.startsWith('api/files/')) {
      return `${base}/${rel}`;
    }
    if (rel.startsWith('uploads/')) {
      rel = rel.substring('uploads/'.length);
    }
    if (!rel.startsWith('profiles/') && !rel.includes('/')) {
      rel = `profiles/${rel}`;
    }
    return `${base}/api/files/${rel}`;
  }

  openFile(file: { file?: string; file_name?: string } | null | undefined): void {
    const req = this.employeePanelService.downloadMyFile(file?.file);
    if (!req) return;
    this.openingFile = true;
    req.subscribe({
      next: (blob) => {
        this.openingFile = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.openingFile = false;
        alert('No se pudo abrir el archivo.');
      }
    });
  }

  hasFiles(item: { files?: Array<{ file?: string }> } | null | undefined): boolean {
    return !!(item?.files && item.files.length > 0 && item.files.some(f => !!f?.file));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getDocStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'VIGENTE': return 'bg-success';
      case 'POR_VENCER': return 'bg-warning text-dark';
      case 'VENCIDO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
