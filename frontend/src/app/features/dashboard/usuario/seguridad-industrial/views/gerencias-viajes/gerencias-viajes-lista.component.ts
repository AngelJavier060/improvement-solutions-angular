import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GerenciaViajeService, GerenciaViajeDto } from '../../services/gerencia-viaje.service';

@Component({
  selector: 'app-gerencias-viajes-lista',
  templateUrl: './gerencias-viajes-lista.component.html',
  styleUrls: ['./gerencias-viajes-lista.component.scss']
})
export class GerenciasViajesListaComponent implements OnInit {
  /** Registros por hoja; a partir del registro 21 se activa la segunda hoja automáticamente. */
  readonly registrosPorHoja = 20;

  businessRuc: string = '';
  gerencias: GerenciaViajeDto[] = [];
  loading: boolean = false;
  error: string = '';
  paginaActual = 1;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private gerenciaService: GerenciaViajeService
  ) {}

  ngOnInit(): void {
    // Buscar el parámetro 'ruc' en la cadena de rutas ascendente
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) { this.businessRuc = found; break; }
      parent = parent.parent;
    }
    if (this.businessRuc) {
      this.loadGerencias();
    } else {
      this.error = 'No se pudo obtener el RUC de la empresa.';
    }
  }

  loadGerencias(): void {
    this.loading = true;
    this.error = '';
    this.gerenciaService.getByRuc(this.businessRuc).subscribe({
      next: (data) => {
        this.gerencias = data;
        this.ajustarPaginaTrasCambioListado();
        this.loading = false;
      },
      error: (err) => {
        console.error('[GerenciasViajes] Error al cargar:', err);
        this.error = 'Error al cargar las gerencias de viaje';
        this.gerencias = [];
        this.loading = false;
      }
    });
  }

  get totalRegistros(): number {
    return this.gerencias.length;
  }

  get totalHojas(): number {
    if (this.totalRegistros === 0) {
      return 1;
    }
    return Math.ceil(this.totalRegistros / this.registrosPorHoja);
  }

  get gerenciasHojaActual(): any[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorHoja;
    return this.gerencias.slice(inicio, inicio + this.registrosPorHoja);
  }

  get rangoRegistrosDesde(): number {
    if (this.totalRegistros === 0) {
      return 0;
    }
    return (this.paginaActual - 1) * this.registrosPorHoja + 1;
  }

  get rangoRegistrosHasta(): number {
    return Math.min(this.paginaActual * this.registrosPorHoja, this.totalRegistros);
  }

  /** Hasta 7 números de hoja centrados en la página actual (listas largas). */
  get hojasDisponibles(): number[] {
    const total = this.totalHojas;
    if (total <= 0) {
      return [];
    }
    const ventana = Math.min(7, total);
    let inicio = Math.max(
      1,
      Math.min(this.paginaActual - Math.floor(ventana / 2), total - ventana + 1)
    );
    return Array.from({ length: ventana }, (_, i) => inicio + i);
  }

  irAHoja(hoja: number): void {
    if (hoja < 1 || hoja > this.totalHojas) {
      return;
    }
    this.paginaActual = hoja;
  }

  irHojaAnterior(): void {
    this.irAHoja(this.paginaActual - 1);
  }

  irHojaSiguiente(): void {
    this.irAHoja(this.paginaActual + 1);
  }

  private ajustarPaginaTrasCambioListado(): void {
    if (this.paginaActual > this.totalHojas) {
      this.paginaActual = Math.max(1, this.totalHojas);
    }
  }

  crearGerencia(): void {
    this.router.navigate(['nuevo'], { relativeTo: this.route });
  }

  verDetalle(id: number): void {
    this.router.navigate([id], { relativeTo: this.route });
  }

  editarGerencia(id: number): void {
    this.router.navigate([id, 'editar'], { relativeTo: this.route });
  }

  mostrarModalCierre = false;
  cierreGerenciaId?: number;
  cierreCodigo = '';
  cierreKmFinal: number | null = null;
  cierreFecha = '';
  cierreSaving = false;

  abrirCerrar($event: Event, g: GerenciaViajeDto): void {
    $event.stopPropagation();
    if (g.id == null) return;
    const estado = (g.estado || '').toUpperCase();
    if (estado !== 'ACTIVO') {
      alert('Solo se pueden cerrar gerencias abiertas.');
      return;
    }
    this.cierreGerenciaId = g.id;
    this.cierreCodigo = g.codigo || `#${g.id}`;
    this.cierreKmFinal = g.kmInicial != null ? Number(g.kmInicial) : null;
    this.cierreFecha = new Date().toISOString().slice(0, 10);
    this.mostrarModalCierre = true;
  }

  cerrarModalCierre(): void {
    this.mostrarModalCierre = false;
    this.cierreGerenciaId = undefined;
    this.cierreSaving = false;
  }

  confirmarCierre(): void {
    if (this.cierreGerenciaId == null || this.cierreKmFinal == null || !this.cierreFecha) {
      alert('Indique kilometraje final y fecha de cierre.');
      return;
    }
    const km = Number(this.cierreKmFinal);
    if (Number.isNaN(km)) {
      alert('Kilometraje final no válido.');
      return;
    }
    this.cierreSaving = true;
    this.gerenciaService.cerrarViaje(this.cierreGerenciaId, {
      kmFinal: km,
      fechaCierre: this.cierreFecha
    }).subscribe({
      next: (actualizada) => {
        const idx = this.gerencias.findIndex((x) => x.id === actualizada.id);
        if (idx >= 0) this.gerencias[idx] = actualizada;
        this.cierreSaving = false;
        this.cerrarModalCierre();
        alert('Gerencia cerrada correctamente.');
      },
      error: (err) => {
        this.cierreSaving = false;
        const msg =
          err?.error?.message ||
          err?.error?.detail ||
          err?.message ||
          'Error al cerrar la gerencia';
        alert(msg);
      }
    });
  }

  etiquetaEstadoViaje(estado?: string): string {
    const u = (estado || '').toUpperCase();
    if (u === 'ACTIVO') return 'Abierta';
    if (u === 'COMPLETADO') return 'Cerrada';
    if (u === 'CANCELADO') return 'Cancelada';
    return estado || '—';
  }

  claseEstadoViaje(estado?: string): string {
    const u = (estado || '').toUpperCase();
    if (u === 'ACTIVO') return 'bg-warning text-dark';
    if (u === 'COMPLETADO') return 'bg-success';
    if (u === 'CANCELADO') return 'bg-secondary';
    return 'bg-secondary';
  }

  eliminarGerencia(id: number): void {
    if (confirm('¿Está seguro de eliminar esta gerencia de viaje?')) {
      this.gerenciaService.delete(id).subscribe({
        next: () => {
          this.gerencias = this.gerencias.filter(g => g.id !== id);
          this.ajustarPaginaTrasCambioListado();
        },
        error: (err) => {
          console.error('[GerenciasViajes] Error al eliminar:', err);
          alert('Error al eliminar la gerencia de viaje');
        }
      });
    }
  }

  getRiskClass(nivel: string): string {
    switch(nivel) {
      case 'BAJO': return 'bg-success';
      case 'MEDIO': return 'bg-warning';
      case 'ALTO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getEstadoClass(estado: string): string {
    switch(estado) {
      case 'COMPLETADO': return 'badge-success';
      case 'EN_CURSO': return 'badge-primary';
      case 'CANCELADO': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}
