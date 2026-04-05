import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-gerencias-viajes-lista',
  templateUrl: './gerencias-viajes-lista.component.html',
  styleUrls: ['./gerencias-viajes-lista.component.scss']
})
export class GerenciasViajesListaComponent implements OnInit {
  /** Registros por hoja; a partir del registro 21 se activa la segunda hoja automáticamente. */
  readonly registrosPorHoja = 20;

  businessRuc: string = '';
  gerencias: any[] = [];
  loading: boolean = false;
  paginaActual = 1;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      this.businessRuc = params['businessRuc'];
      this.loadGerencias();
    });
  }

  loadGerencias(): void {
    this.loading = true;
    // TODO: Implement API call
    setTimeout(() => {
      this.gerencias = [
        {
          id: 1,
          gerencia: 'GV-001',
          fechaHora: '2026-03-31T19:18:33',
          conductor: 'Francisco Jaramillo',
          cedula: '2100469531',
          vehiculoInicio: 'QAA-2913',
          kmInicial: 45230,
          telefono: '+593 99 123 4567',
          cargo: 'Conductor Profesional',
          area: 'Logística',
          proyecto: 'Proyecto Enap Sipec',
          motivo: 'Transporte de personal',
          origen: 'Base OrientOil Joya de los Sachas',
          destino: 'Pambil',
          fechaSalida: '2026-03-31',
          horaSalida: '19:30',
          licenciaVigente: 'SÍ',
          manejoDefensivo: 'SÍ',
          inspeccionVehiculo: 'APROBADA',
          mediosComunicacion: 'Radio, Celular',
          testAlcohol: 'NEGATIVO',
          llevaPasajeros: 'SÍ',
          pasajeros: '3 personas',
          tipoVehiculo: 'Camioneta 4x4',
          convoy: 'NO',
          unidadesConvoy: 'N/A',
          tipoCarretera: 'Asfaltada',
          estadoVia: 'Bueno',
          clima: 'Despejado',
          distancia: '85 km',
          tipoCarga: 'Pasajeros',
          otrosPeligros: 'Ninguno',
          horasConduccion: '2.5 horas',
          horarioViaje: 'Diurno',
          descansoConduc: 'Adecuado',
          riesgosVia: 'Curvas pronunciadas',
          medidasControl: 'Velocidad controlada',
          paradasPlanificadas: '1 parada',
          kmFinal: 45315,
          a: 10,
          b: 8,
          c: 9,
          d: 10,
          e: 7,
          f: 8,
          g: 9,
          h: 10,
          i: 8,
          j: 9,
          total: 142
        }
      ];
      this.ajustarPaginaTrasCambioListado();
      this.loading = false;
    }, 500);
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

  eliminarGerencia(id: number): void {
    if (confirm('¿Está seguro de eliminar esta gerencia de viaje?')) {
      // TODO: Implement delete
      this.gerencias = this.gerencias.filter(g => g.id !== id);
      this.ajustarPaginaTrasCambioListado();
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
