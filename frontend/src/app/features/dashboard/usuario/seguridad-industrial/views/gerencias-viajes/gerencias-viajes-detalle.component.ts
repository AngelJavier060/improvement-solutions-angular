import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-gerencias-viajes-detalle',
  templateUrl: './gerencias-viajes-detalle.component.html',
  styleUrls: ['./gerencias-viajes-detalle.component.scss']
})
export class GerenciasViajesDetalleComponent implements OnInit {
  businessRuc: string = '';
  gerenciaId?: number;
  gerencia: any = null;
  loading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      this.businessRuc = params['businessRuc'];
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.gerenciaId = +params['id'];
        this.loadGerencia(this.gerenciaId);
      }
    });
  }

  loadGerencia(id: number): void {
    this.loading = true;
    // TODO: Implement API call
    setTimeout(() => {
      this.gerencia = {
        id: 1,
        numeroGerencia: 'GV-001',
        fechaCreacion: '2026-03-31T19:18:33',
        nombreConductor: 'Francisco Jaramillo',
        cedula: '2100469531',
        vehiculo: 'QAA-2913',
        kilometrajeInicial: 243995,
        telefono: '0968207087',
        cargo: 'CONDUCTOR',
        area: 'Vacuum',
        proyecto: 'Proyecto Enap Sipec',
        motivoViaje: 'Transporte de fluidos',
        lugarSalida: 'Base OrientOil Joya de los Sachas',
        destino: 'Pambil',
        fechaSalida: '2026-04-01',
        horaSalida: '06:00:00',
        tipoCarga: 'Transporte de Fluidos',
        licenciaVigente: true,
        manejoDefensivo: true,
        inspeccionPrevia: true,
        mediosComunicacion: true,
        resultadoAlcoholtest: 'Negativo (-)',
        transportaPasajeros: true,
        nombresPasajeros: 'Jaime del valle',
        tipoVehiculo: 'Vacuum',
        enConvoy: false,
        unidadesConvoy: 'N/A',
        tipoCarretera: 'Vía Mixta',
        estadoCarretera: 'Regular',
        condicionClimatica: 'Normal',
        distanciaRuta: '< 50km',
        peligrosVia: 'Cables bajos',
        horasConduccion: '< 12 horas',
        horarioCirculacion: '06:00 a 18:00',
        horasDescanso: 'Cumple',
        riesgosEspecificos: 'Choques con motos',
        medidasControl: 'Aplicar Técnicas',
        paradasPlaneadas: 'Comedor base Sacha desayuno',
        scoreA: 40,
        scoreB: 40,
        scoreC: 100,
        scoreD: 80,
        scoreE: 200,
        scoreF: 0,
        scoreG: 360,
        scoreH: 200,
        scoreI: 200,
        scoreJ: 200,
        scoreTotal: 1420,
        nivelRiesgo: 'ALTO',
        aceptacionGerencia: 'NO ACEPTABLE',
        estado: 'COMPLETADO'
      };
      this.loading = false;
    }, 500);
  }

  imprimir(): void {
    window.print();
  }

  volver(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  editar(): void {
    this.router.navigate(['..', this.gerenciaId, 'editar'], { relativeTo: this.route });
  }

  getRiskColor(nivel: string): string {
    switch(nivel) {
      case 'BAJO': return '#90EE90';
      case 'MEDIO': return '#FFD700';
      case 'ALTO': return '#FF4C4C';
      default: return '#f2f2f2';
    }
  }

  getScoreColor(score: number): string {
    if (score <= 100) return '#90EE90'; // Verde
    if (score <= 200) return '#FFD700'; // Amarillo
    if (score <= 300) return '#FFA500'; // Naranja
    return '#FF4C4C'; // Rojo
  }
}
