import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import { AulaVirtualService } from '../../../../../services/aula-virtual.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Workbook } from 'exceljs';

type AulaArea = 'Talento Humano' | 'Seguridad' | 'Salud ocupacional' | 'Medio ambiente' | 'Calidad';
type AulaEstado = 'Publicado' | 'Borrador';

interface AulaPregunta {
  texto: string;
  opciones: string[];
  correcta: number;
}

interface AulaRespuesta {
  texto: string;
  marcada: string;
  correcta: string;
  acerto?: boolean;
}

interface AulaResultado {
  employeeId?: number;
  nombre: string;
  apellidos?: string;
  nombres?: string;
  cedula?: string;
  cargo: string;
  nota: number | null;
  enSala?: boolean;
  estado: 'Cumplió' | 'No alcanzó' | 'Pendiente';
  aprobado?: boolean;
  fecha: string;
  hora?: string;
  acertadas?: AulaRespuesta[];
  falladas?: AulaRespuesta[];
}

interface AulaCurso {
  id: number;
  titulo: string;
  instructor: string;
  area: AulaArea;
  audiencia: string;
  inicio: string;
  limite: string;
  vencido?: boolean;
  duracion: string;
  estado: AulaEstado;
  video: string;
  material: string;
  modalidad: 'video' | 'vivo' | 'charla';
  sala?: string;
  hora?: string;
  cupo?: number;
  notaMinima: number;
  intentos: number;
  minutosEvaluacion: number;
  porTrabajador: number;
  preguntas: AulaPregunta[];
  resultados: AulaResultado[];
  tieneVideo?: boolean;
  tienePdf?: boolean;
  charlaInvitados: number[];
}

@Component({
  selector: 'app-aula-virtual-admin',
  templateUrl: './aula-virtual-admin.component.html',
  styleUrls: ['./aula-virtual-admin.component.scss']
})
export class AulaVirtualAdminComponent implements OnInit, OnDestroy {
  companyId = 0;
  companyName = 'Empresa';
  areas: AulaArea[] = ['Talento Humano', 'Seguridad', 'Salud ocupacional', 'Medio ambiente', 'Calidad'];
  filtroArea = 'Todas';
  vista: 'tablero' | 'editor' = 'tablero';
  cursoActivo: AulaCurso | null = null;
  aviso = '';
  nuevaFecha = '';
  instructorNombre = '';
  editando = false;
  informeAbierto: number | null = null;
  edicion = this.blankEdicion();
  bancoAbierto = false;
  enlaceCopiado = false;
  private reloj: ReturnType<typeof setInterval> | null = null;
  guardando = false;
  videoUrl: string | null = null;
  private videoObjectUrl: string | null = null;
  cursos: AulaCurso[] = [];
  private videoArchivo: File | null = null;
  private pdfArchivo: File | null = null;
  videoReemplazo: File | null = null;
  pdfReemplazo: File | null = null;

  form = this.blankForm();
  trabajadores: { id: number; nombre: string; cargo: string }[] = [];
  invitadosForm: number[] = [];
  invitadosCurso: number[] = [];
  horaCharla = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessService: BusinessService,
    private aulaService: AulaVirtualService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  get esSuper(): boolean {
    return this.authService.hasRole('ROLE_SUPER_ADMIN');
  }

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    if (!this.companyId) return;
    this.businessService.getById(this.companyId).subscribe({
      next: (empresa: any) => {
        this.companyName = empresa?.name || empresa?.nombre || this.companyName;
      },
      error: () => {}
    });
    this.cargar();
    this.cargarTrabajadores();
    this.reloj = setInterval(() => this.refrescar(), 15000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  cargar(): void {
    this.aulaService.listar(this.companyId).subscribe({
      next: (filas) => {
        this.cursos = (filas || []).map(fila => this.mapear(fila));
        if (this.cursos[0]) this.elegirCurso(this.cursos[0]);
        else this.cursoActivo = null;
      },
      error: (err) => {
        this.aviso = err?.error?.message || 'No se pudo cargar el aula de esta empresa.';
      }
    });
  }

  refrescar(): void {
    const activo = this.cursoActivo?.id;
    this.aulaService.listar(this.companyId).subscribe({
      next: (filas) => {
        this.cursos = (filas || []).map(fila => this.mapear(fila));
        if (!activo) return;
        const curso = this.cursos.find(item => item.id === activo);
        if (!curso) return;
        const escrito = this.instructorNombre;
        const previo = this.cursoActivo?.instructor || '';
        this.cursoActivo = curso;
        if (!escrito || escrito === previo) this.instructorNombre = curso.instructor || '';
      }
    });
  }

  enSala(curso: AulaCurso): AulaResultado[] {
    return curso.resultados.filter(item => item.enSala);
  }

  get cursosVisibles(): AulaCurso[] {
    if (this.filtroArea === 'Todas') return this.cursos;
    return this.cursos.filter(curso => curso.area === this.filtroArea);
  }

  get asignados(): number {
    return this.cursos.reduce((total, curso) => total + curso.resultados.length, 0);
  }

  get cumplieron(): number {
    return this.cursos.reduce((total, curso) => total + curso.resultados.filter(item => item.estado === 'Cumplió').length, 0);
  }

  get pendientes(): number {
    return this.cursos.reduce((total, curso) => total + curso.resultados.filter(item => item.estado !== 'Cumplió').length, 0);
  }

  get mejor(): { nombre: string; nota: number; curso: string } | null {
    let top: { nombre: string; nota: number; curso: string } | null = null;
    this.cursos.forEach(curso => {
      curso.resultados.forEach(item => {
        if (item.nota != null && (!top || item.nota > top.nota)) {
          top = { nombre: item.nombre, nota: item.nota, curso: curso.titulo };
        }
      });
    });
    return top;
  }

  volverEmpresa(): void {
    this.router.navigate(['/dashboard/admin/empresas/admin', this.companyId]);
  }

  abrirEditor(reunion = false): void {
    this.form = this.blankForm();
    this.videoArchivo = null;
    this.pdfArchivo = null;
    if (reunion) {
      this.form.modalidad = 'vivo';
      this.form.audiencia = 'Todo el personal';
      this.form.cupo = 20;
    }
    this.aviso = '';
    this.vista = 'editor';
  }

  cerrarEditor(): void {
    this.vista = 'tablero';
  }

  elegirVideo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.videoArchivo = file;
    this.form.video = file ? file.name : '';
  }

  elegirPdf(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    this.pdfArchivo = file;
    this.form.material = file ? file.name : '';
  }

  async descargarPlantilla(): Promise<void> {
    await this.descargarExcel([{
      texto: 'Ejemplo: el casco es obligatorio en obra',
      opciones: ['Si', 'No', 'Solo en altura'],
      correcta: 0
    }], 'plantilla-banco-de-preguntas.xlsx');
  }

  async descargarExcel(preguntas: AulaPregunta[], archivo: string): Promise<void> {
    const libro = new Workbook();
    const hoja = libro.addWorksheet('Banco de preguntas');
    const ancho = Math.max(2, ...preguntas.map(pregunta => pregunta.opciones.length));
    const titulos = ['Pregunta', ...Array.from({ length: ancho }, (_, indice) => `Opcion ${indice + 1}`), 'Verdadera'];
    hoja.addRow(titulos);
    hoja.getRow(1).font = { bold: true };
    preguntas.forEach(pregunta => {
      const fila: (string | number)[] = [pregunta.texto, ...pregunta.opciones];
      while (fila.length < ancho + 1) fila.push('');
      fila.push(pregunta.correcta + 1);
      hoja.addRow(fila);
    });
    hoja.columns.forEach(columna => { columna.width = 28; });
    const guia = libro.addWorksheet('Como llenarlo');
    guia.addRow(['Borre la fila que empieza con Ejemplo y escriba sus preguntas debajo del encabezado.']);
    guia.addRow(['Verdadera es el número de la opción correcta. 1 es la primera, 2 la segunda.']);
    guia.addRow(['Puede dejar vacías las opciones que no use. Cada pregunta necesita al menos dos.']);
    guia.getColumn(1).width = 90;
    const buffer = await libro.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = archivo;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  async subirExcel(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    const preguntas = await this.leerPreguntas(archivo);
    if (!preguntas.length) return;
    this.form.preguntas = preguntas;
    this.aviso = `Se cargaron ${preguntas.length} preguntas desde el Excel.`;
  }

  private async leerPreguntas(archivo: File): Promise<AulaPregunta[]> {
    const libro = new Workbook();
    await libro.xlsx.load(await archivo.arrayBuffer());
    const hoja = libro.worksheets[0];
    if (!hoja) {
      this.aviso = 'El Excel no tiene hojas.';
      return [];
    }
    const encabezado = (hoja.getRow(1).values as unknown[]).slice(1).map(valor => this.normalizar(valor));
    const preguntaCol = encabezado.findIndex(valor => valor === 'pregunta');
    const verdaderaCol = encabezado.findIndex(valor => valor === 'verdadera' || valor === 'correcta');
    const opcionesCol = encabezado
      .map((valor, indice) => ({ valor, indice }))
      .filter(item => /^opcion\s*\d+$/.test(item.valor))
      .sort((a, b) => Number(a.valor.replace(/\D/g, '')) - Number(b.valor.replace(/\D/g, '')));
    if (preguntaCol < 0 || opcionesCol.length < 2) {
      this.aviso = 'Use la plantilla: columnas Pregunta, Opcion 1, Opcion 2 y Verdadera.';
      return [];
    }
    const preguntas: AulaPregunta[] = [];
    hoja.eachRow((fila, numero) => {
      if (numero === 1) return;
      const valores = fila.values as unknown[];
      const texto = String(valores[preguntaCol + 1] ?? '').trim();
      if (!texto || this.normalizar(texto).startsWith('ejemplo:')) return;
      const opciones = opcionesCol
        .map(item => String(valores[item.indice + 1] ?? '').trim())
        .filter(opcion => opcion);
      if (opciones.length < 2) return;
      let correcta = 0;
      if (verdaderaCol >= 0) {
        const marca = valores[verdaderaCol + 1];
        const numeroMarca = Number(marca);
        if (Number.isFinite(numeroMarca) && numeroMarca >= 1 && numeroMarca <= opciones.length) {
          correcta = numeroMarca - 1;
        } else {
          const hallada = opciones.findIndex(opcion => this.normalizar(opcion) === this.normalizar(marca));
          if (hallada >= 0) correcta = hallada;
        }
      }
      preguntas.push({ texto, opciones, correcta });
    });
    if (!preguntas.length) {
      this.aviso = 'El Excel no trae preguntas completas. Cada una necesita texto y al menos dos opciones.';
    }
    return preguntas;
  }

  async importarExcel(curso: AulaCurso, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    const preguntas = await this.leerPreguntas(archivo);
    if (!preguntas.length) return;
    this.aulaService.importarPreguntas(this.companyId, curso.id, preguntas).subscribe({
      next: (fila) => {
        const actualizado = this.mapear(fila);
        this.cursos = this.cursos.map(item => item.id === actualizado.id ? actualizado : item);
        this.cursoActivo = actualizado;
        this.aviso = `Se actualizaron ${preguntas.length} preguntas.`;
      },
      error: (err) => { this.aviso = err?.error?.message || 'No se pudieron actualizar las preguntas.'; }
    });
  }

  private normalizar(valor: unknown): string {
    return String(valor ?? '').trim().toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  }

  agregarPregunta(): void {
    this.form.preguntas.push({ texto: '', opciones: ['', ''], correcta: 0 });
  }

  quitarPregunta(index: number): void {
    this.form.preguntas.splice(index, 1);
  }

  agregarOpcion(pregunta: { opciones: string[] }): void {
    pregunta.opciones.push('');
  }

  quitarOpcion(pregunta: { opciones: string[]; correcta: number }, index: number): void {
    if (pregunta.opciones.length <= 2) return;
    const eraCorrecta = pregunta.correcta === index;
    pregunta.opciones.splice(index, 1);
    if (eraCorrecta || pregunta.correcta >= pregunta.opciones.length) pregunta.correcta = 0;
    else if (pregunta.correcta > index) pregunta.correcta -= 1;
  }

  marcarCorrecta(pregunta: { correcta: number }, index: number): void {
    pregunta.correcta = index;
  }

  indice(index: number): number {
    return index;
  }

  publicar(): void {
    const titulo = this.form.titulo.trim();
    const instructor = this.form.instructor.trim();
    if (!titulo) {
      this.aviso = 'Escribe el nombre de la capacitación.';
      return;
    }
    if (!instructor) {
      this.aviso = 'Escribe el nombre del instructor.';
      return;
    }
    const enVivo = this.form.modalidad === 'vivo';
    if (!this.form.hora) {
      this.aviso = 'Indica la fecha y la hora de la reunión.';
      return;
    }
    if (this.form.modalidad === 'video' && !this.form.video.trim()) {
      this.aviso = 'Sube el video de la capacitación.';
      return;
    }
    if (this.form.modalidad === 'vivo' && this.form.grabada && !this.form.video.trim()) {
      this.aviso = 'Sube la grabación para que quede como video de esta capacitación.';
      return;
    }
    if (this.form.audiencia !== 'Todo el personal' && !this.form.audienciaDetalle.trim()) {
      this.aviso = 'Escribe el departamento o el cargo, igual que está en el personal de esta empresa.';
      return;
    }
    const cupo = Number(this.form.cupo) > 0 ? Number(this.form.cupo) : null;
    if (this.form.preguntas.some(pregunta => !pregunta.texto.trim())) {
      this.aviso = 'Hay una pregunta vacía. Complétala o quítala. El banco puede quedar en cero.';
      return;
    }
    const porTrabajador = Math.max(1, Number(this.form.porTrabajador) || 5);
    const preguntas = this.form.preguntas.map(pregunta => {
      const marcadas = pregunta.opciones
        .map((opcion, indice) => ({ texto: opcion.trim(), indice }))
        .filter(opcion => opcion.texto);
      const correcta = Math.max(0, marcadas.findIndex(opcion => opcion.indice === Number(pregunta.correcta)));
      return {
        texto: pregunta.texto.trim(),
        opciones: marcadas.map(opcion => opcion.texto),
        correcta
      };
    });
    const datos = {
      titulo,
      instructor,
      area: this.form.area,
      audiencia: this.form.audiencia || 'Todo el personal',
      audienciaDetalle: this.form.audienciaDetalle.trim(),
      enVivo,
      modalidad: enVivo ? 'vivo' : 'video',
      reunion: false,
      charlaInvitados: this.invitadosForm,
      hora: this.form.hora,
      cupo,
      inicio: this.form.inicio,
      horaLimite: this.form.limite,
      notaMinima: Number(this.form.notaMinima) || 80,
      intentos: Number(this.form.intentos) || 2,
      minutosEvaluacion: Math.max(1, Number(this.form.minutosEvaluacion) || 10),
      porTrabajador,
      preguntas
    };
    this.guardando = true;
    this.aulaService.crear(this.companyId, datos, (this.form.modalidad === 'video' || this.form.grabada) ? this.videoArchivo : null, this.pdfArchivo).subscribe({
      next: (fila) => {
        const curso = this.mapear(fila);
        this.cursos = [curso, ...this.cursos.filter(item => item.id !== curso.id)];
        this.elegirCurso(curso);
        this.vista = 'tablero';
        this.aviso = '';
        this.guardando = false;
        this.videoArchivo = null;
        this.pdfArchivo = null;
      },
      error: (err) => {
        this.guardando = false;
        this.aviso = err?.error?.message || 'No se pudo guardar la capacitación.';
      }
    });
  }

  private mapear(fila: any): AulaCurso {
    const audiencia = fila.audienciaDetalle ? `${fila.audiencia}: ${fila.audienciaDetalle}` : fila.audiencia;
    return {
      id: fila.id,
      titulo: fila.titulo,
      instructor: fila.instructor || '',
      area: fila.area,
      audiencia,
      inicio: fila.inicio || 'Por definir',
      limite: fila.limite || 'Por definir',
      vencido: !!fila.vencido,
      duracion: fila.duracion || '5 min',
      estado: 'Publicado',
      video: fila.video || (fila.modalidad === 'vivo' ? 'Reunión en vivo' : ''),
      material: fila.material || 'Sin presentación',
      modalidad: fila.modalidad === 'charla' ? 'charla' : (fila.modalidad === 'vivo' ? 'vivo' : 'video'),
      sala: fila.sala,
      hora: fila.hora ? String(fila.hora).replace('T', ' ').slice(0, 16) : undefined,
      cupo: fila.cupo,
      notaMinima: fila.notaMinima,
      intentos: fila.intentos,
      minutosEvaluacion: fila.minutosEvaluacion || 10,
      porTrabajador: fila.porTrabajador,
      preguntas: fila.preguntas || [],
      resultados: (fila.resultados || []).map((item: any) => ({
        ...item,
        cedula: item.cedula || '',
        apellidos: item.apellidos || '',
        nombres: item.nombres || '',
        hora: item.hora || '—',
        acertadas: item.acertadas || [],
        falladas: item.falladas || []
      })),
      tieneVideo: !!fila.tieneVideo,
      tienePdf: !!fila.tienePdf,
      charlaInvitados: Array.isArray(fila.charlaInvitados) ? fila.charlaInvitados.map((id: unknown) => Number(id)) : []
    };
  }

  elegirVideoCurso(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.videoReemplazo = input.files?.[0] || null;
  }

  elegirPdfCurso(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      this.aviso = 'La presentación debe ser un PDF.';
      input.value = '';
      this.pdfReemplazo = null;
      return;
    }
    this.pdfReemplazo = file;
  }

  guardarInstructor(): void {
    const curso = this.cursoActivo;
    const nombre = (this.instructorNombre || curso?.instructor || '').trim();
    if (!curso || !nombre) {
      this.aviso = 'Escribe el nombre del instructor.';
      return;
    }
    this.instructorNombre = nombre;
    this.aulaService.actualizarContenido(this.companyId, curso.id, nombre, this.videoReemplazo, this.pdfReemplazo).subscribe({
      next: (fila) => {
        this.aplicarCurso(fila);
        const cambioArchivo = !!this.videoReemplazo || !!this.pdfReemplazo;
        this.videoReemplazo = null;
        this.pdfReemplazo = null;
        this.aviso = cambioArchivo
          ? 'Quedó guardado. Lo que no cambió sigue igual.'
          : 'El instructor quedó guardado. La app del trabajador lo muestra en el video.';
      },
      error: (err) => { this.aviso = err?.error?.message || 'No se pudo guardar.'; }
    });
  }

  cerrarEdicion(): void {
    this.editando = false;
  }

  abrirEdicion(): void {
    const curso = this.cursoActivo;
    if (!curso || !this.esSuper) return;
    this.editando = true;
    this.edicion = {
      titulo: curso.titulo,
      instructor: curso.instructor || '',
      area: curso.area,
      limite: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(curso.limite || '') ? curso.limite.replace(' ', 'T') : '',
      notaMinima: curso.notaMinima || 80,
      intentos: curso.intentos || 1,
      minutosEvaluacion: curso.minutosEvaluacion || 10,
      porTrabajador: curso.porTrabajador || 1
    };
  }

  guardarEdicion(): void {
    const curso = this.cursoActivo;
    if (!curso || !this.esSuper) return;
    const titulo = this.edicion.titulo.trim();
    const instructor = this.edicion.instructor.trim();
    if (!titulo || !instructor) {
      this.aviso = 'Escribe el nombre de la capacitación y el del instructor.';
      return;
    }
    const video = this.videoReemplazo;
    const pdf = this.pdfReemplazo;
    this.aulaService.editar(this.companyId, curso.id, {
      titulo,
      instructor,
      area: this.edicion.area,
      horaLimite: this.edicion.limite,
      notaMinima: Number(this.edicion.notaMinima) || 80,
      intentos: Number(this.edicion.intentos) || 1,
      minutosEvaluacion: Number(this.edicion.minutosEvaluacion) || 10,
      porTrabajador: Number(this.edicion.porTrabajador) || 1
    }, video, pdf).subscribe({
      next: (fila) => {
        this.aplicarCurso(fila);
        this.videoReemplazo = null;
        this.pdfReemplazo = null;
        this.editando = false;
        this.aviso = 'Los cambios quedaron guardados. Lo que no cambió sigue igual.';
      },
      error: (err) => { this.aviso = err?.error?.message || 'No se pudo guardar la edición.'; }
    });
  }

  alternarInforme(id: number): void {
    this.informeAbierto = this.informeAbierto === id ? null : id;
  }

  nombreInforme(item: AulaResultado): string {
    const completo = `${item.apellidos || ''} ${item.nombres || ''}`.trim();
    return completo || item.nombre;
  }

  respuestasDe(item: AulaResultado): AulaRespuesta[] {
    const buenas = (item.acertadas || []).map(fila => ({ ...fila, acerto: true }));
    const malas = (item.falladas || []).map(fila => ({ ...fila, acerto: false }));
    return [...buenas, ...malas];
  }

  acertadasDe(item: AulaResultado): AulaRespuesta[] {
    return item.acertadas || [];
  }

  falladasDe(item: AulaResultado): AulaRespuesta[] {
    return item.falladas || [];
  }

  guardarFecha(): void {
    const curso = this.cursoActivo;
    if (!curso || !this.nuevaFecha) {
      this.aviso = 'Indique la nueva fecha y hora límite.';
      return;
    }
    this.aulaService.cambiarLimite(this.companyId, curso.id, this.nuevaFecha).subscribe({
      next: (fila) => {
        const actualizado = this.mapear(fila);
        this.cursos = this.cursos.map(item => item.id === actualizado.id ? actualizado : item);
        this.cursoActivo = actualizado;
        this.nuevaFecha = actualizado.limite.includes(' ') ? actualizado.limite.replace(' ', 'T') : '';
        this.aviso = actualizado.vencido ? '' : 'Fecha actualizada. La capacitación quedó abierta.';
      },
      error: (err) => { this.aviso = err?.error?.message || 'No se pudo cambiar la fecha.'; }
    });
  }

  volumenMedio(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) video.volume = 0.5;
  }

  alternarBanco(): void {
    this.bancoAbierto = !this.bancoAbierto;
  }

  elegirCurso(curso: AulaCurso): void {
    this.cursoActivo = curso;
    this.bancoAbierto = false;
    this.nuevaFecha = curso.limite && curso.limite.includes(' ') ? curso.limite.replace(' ', 'T') : '';
    this.instructorNombre = curso.instructor || '';
    this.invitadosCurso = [...(curso.charlaInvitados || [])];
    this.horaCharla = this.aLocal(curso.hora);
    this.videoReemplazo = null;
    this.pdfReemplazo = null;
    this.editando = false;
    this.informeAbierto = null;
    this.enlaceCopiado = false;
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
    this.videoUrl = null;
    if (!curso.tieneVideo) return;
    this.aulaService.video(this.companyId, curso.id).subscribe({
      next: (blob) => {
        if (this.cursoActivo?.id !== curso.id) return;
        this.videoObjectUrl = URL.createObjectURL(blob);
        this.videoUrl = this.videoObjectUrl;
      },
      error: () => { this.videoUrl = null; }
    });
  }

  abrirPdf(curso: AulaCurso): void {
    if (!curso.tienePdf) return;
    this.aulaService.material(this.companyId, curso.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    });
  }

  rendidos(curso: AulaCurso): AulaResultado[] {
    return curso.resultados.filter(item => item.nota != null);
  }

  pendientesDe(curso: AulaCurso): AulaResultado[] {
    return curso.resultados.filter(item => item.nota == null);
  }

  iniciales(nombre: string): string {
    return (nombre || '').split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('');
  }

  cargarTrabajadores(): void {
    this.http.get<any[]>(`/api/businesses/${this.companyId}/employees`).subscribe({
      next: (lista) => {
        this.trabajadores = (lista || [])
          .filter(persona => persona?.id && persona.active !== false && persona.status !== 'INACTIVO')
          .map(persona => ({
            id: Number(persona.id),
            nombre: `${persona.apellidos || ''} ${persona.nombres || persona.name || ''}`.trim() || persona.cedula,
            cargo: typeof persona.position === 'string' ? persona.position : (persona.position?.name || '')
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      },
      error: () => { this.trabajadores = []; }
    });
  }

  trackTrabajador(_indice: number, persona: { id: number }): number {
    return persona.id;
  }

  estaInvitado(id: number, enCurso: boolean): boolean {
    return (enCurso ? this.invitadosCurso : this.invitadosForm).includes(id);
  }

  alternarInvitado(id: number, event: Event, enCurso: boolean): void {
    const marcado = (event.target as HTMLInputElement).checked;
    const lista = enCurso ? this.invitadosCurso : this.invitadosForm;
    if (marcado && !lista.includes(id)) lista.push(id);
    if (!marcado) {
      const siguiente = lista.filter(item => item !== id);
      if (enCurso) this.invitadosCurso = siguiente;
      else this.invitadosForm = siguiente;
    }
  }

  marcarTodosCharla(enCurso: boolean): void {
    const ids = this.trabajadores.map(persona => persona.id);
    if (enCurso) this.invitadosCurso = ids;
    else this.invitadosForm = ids;
  }

  limpiarCharla(enCurso: boolean): void {
    if (enCurso) this.invitadosCurso = [];
    else this.invitadosForm = [];
  }

  marcarQuedados(): void {
    const curso = this.cursoActivo;
    if (!curso) return;
    this.invitadosCurso = curso.resultados
      .filter(item => item.employeeId && item.estado !== 'Cumplió')
      .map(item => Number(item.employeeId));
  }

  guardarListaCharla(): void {
    const curso = this.cursoActivo;
    if (!curso) return;
    if (!this.horaCharla) {
      this.aviso = 'Indica la fecha y la hora de la reunión.';
      return;
    }
    this.aulaService.guardarCharla(this.companyId, curso.id, this.invitadosCurso, this.horaCharla).subscribe({
      next: (fila) => {
        this.aplicarCurso(fila);
        this.aviso = 'La charla quedó programada. Quien no está marcado no entra, y el trabajador entra a partir de esa hora.';
      },
      error: (err) => { this.aviso = err?.error?.message || 'No se pudo guardar la charla.'; }
    });
  }

  private aLocal(valor?: string): string {
    if (!valor || !valor.includes(' ')) return '';
    return valor.replace(' ', 'T').slice(0, 16);
  }

  entrarComoPresentador(curso: AulaCurso): void {
    window.open(this.enlaceCharla(curso, this.nombrePropio()), '_blank', 'noopener');
  }

  copiarEnlace(curso: AulaCurso): void {
    const enlace = this.enlaceCharla(curso);
    navigator.clipboard.writeText(enlace).then(() => { this.enlaceCopiado = true; });
  }

  private nombrePropio(): string {
    const user = this.authService.getCurrentUser();
    return String(user?.name || user?.username || 'Supervisor');
  }

  private aplicarCurso(fila: any): void {
    const actualizado = this.mapear(fila);
    this.cursos = this.cursos.map(item => item.id === actualizado.id ? actualizado : item);
    this.cursoActivo = actualizado;
    this.instructorNombre = actualizado.instructor || '';
    this.invitadosCurso = [...(actualizado.charlaInvitados || [])];
    this.horaCharla = this.aLocal(actualizado.hora);
    if (this.videoReemplazo || !actualizado.tieneVideo) this.recargarVideo(actualizado);
  }

  private recargarVideo(curso: AulaCurso): void {
    if (this.videoObjectUrl) {
      URL.revokeObjectURL(this.videoObjectUrl);
      this.videoObjectUrl = null;
    }
    this.videoUrl = null;
    if (!curso.tieneVideo) return;
    this.aulaService.video(this.companyId, curso.id).subscribe({
      next: (blob) => {
        if (this.cursoActivo?.id !== curso.id) return;
        this.videoObjectUrl = URL.createObjectURL(blob);
        this.videoUrl = this.videoObjectUrl;
      },
      error: () => { this.videoUrl = null; }
    });
  }

  private enlaceCharla(curso: AulaCurso, nombre = ''): string {
    const sala = `ImprovementSolutions${this.companyId}c${curso.id}`;
    const titulo = (curso.titulo || 'Charla').replace(/"/g, '').trim();
    const partes = [
      `config.subject=${encodeURIComponent(`"${titulo}"`)}`,
      'config.prejoinPageEnabled=false',
      'config.requireDisplayName=false',
      'config.disableDeepLinking=true',
      `config.toolbarButtons=${encodeURIComponent('["microphone","camera","desktop","sharedvideo","select-background","chat","raisehand","reactions","tileview","fullscreen","participants-pane","invite","security","recording","settings","hangup"]')}`
    ];
    const persona = nombre.replace(/"/g, '').trim();
    if (persona) partes.push(`userInfo.displayName=${encodeURIComponent(`"${persona}"`)}`);
    return `https://charla.improvement-solution.com/${sala}#${partes.join('&')}`;
  }

  preguntasDe(curso: AulaCurso, persona: string): string[] {
    return this.sortear(curso.preguntas, curso.porTrabajador || 1, persona + curso.id).map(pregunta => pregunta.texto);
  }

  private sortear(banco: AulaPregunta[], cantidad: number, semilla: string): AulaPregunta[] {
    const copia = banco.map(pregunta => ({ ...pregunta, opciones: [...pregunta.opciones] }));
    let n = 2166136261;
    for (const letra of semilla) n = Math.imul(n ^ letra.charCodeAt(0), 16777619);
    const aleatorio = () => {
      n = Math.imul(n, 1664525) + 1013904223;
      return (n >>> 0) / 4294967296;
    };
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(aleatorio() * (i + 1));
      const actual = copia[i];
      copia[i] = copia[j];
      copia[j] = actual;
    }
    return copia.slice(0, Math.min(cantidad, copia.length));
  }

  private blankEdicion() {
    return {
      titulo: '',
      instructor: '',
      area: 'Seguridad' as AulaArea,
      limite: '',
      notaMinima: 80,
      intentos: 2,
      minutosEvaluacion: 10,
      porTrabajador: 5
    };
  }

  private blankForm() {
    return {
      titulo: '',
      instructor: '',
      area: 'Seguridad' as AulaArea,
      audiencia: 'Todo el personal',
      audienciaDetalle: '',
      inicio: '',
      limite: '',
      video: '',
      material: '',
      modalidad: 'video' as 'video' | 'vivo',
      reunion: false,
      grabada: false,
      hora: '',
      cupo: null as number | null,
      notaMinima: 80,
      intentos: 2,
      minutosEvaluacion: 10,
      porTrabajador: 5,
      preguntas: [] as AulaPregunta[]
    };
  }
}
