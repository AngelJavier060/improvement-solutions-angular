import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

/** Nombres de controles alineados con la matriz de `gerencias-viajes-lista` para futura persistencia. */
@Component({
  selector: 'app-gerencias-viajes-form',
  templateUrl: './gerencias-viajes-form.component.html',
  styleUrls: ['./gerencias-viajes-form.component.scss']
})
export class GerenciasViajesFormComponent implements OnInit {
  gerenciaForm!: FormGroup;
  businessRuc: string = '';
  isEditMode: boolean = false;
  gerenciaId?: number;
  saving: boolean = false;

  proyectos: string[] = ['Expansión Norte', 'Mantenimiento Rutinario', 'Proyecto Enap Sipec'];
  tiposCarretera: string[] = ['Asfaltada', 'Lastrada', 'Vía mixta', 'Terracería'];
  estadosVia: string[] = ['Bueno', 'Regular', 'Malo'];
  condicionesClimaticas: string[] = ['Despejado', 'Lluvia', 'Niebla', 'Normal'];
  tiposCarga: string[] = ['Pasajeros', 'Carga general', 'Material peligroso', 'Vacío', 'Otro'];
  horasConduccionOpts: string[] = ['< 12 horas', '12–16 horas', '> 16 horas'];
  horariosViajeOpts: string[] = ['06:00 a 18:00', '18:00 a 06:00', 'Todo el día', 'Diurno', 'Nocturno'];
  descansoConductorOpts: string[] = ['Cumple', 'No cumple', 'Adecuado', 'Insuficiente'];
  testAlcoholOpts: string[] = ['Negativo', 'Positivo', 'No realizado'];
  inspeccionVehiculoOpts: string[] = ['APROBADA', 'PENDIENTE', 'OBSERVACIONES', 'RECHAZADA'];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.parent?.parent?.params.subscribe(params => {
      this.businessRuc = params['businessRuc'];
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.gerenciaId = +params['id'];
        this.loadGerencia(this.gerenciaId);
      }
    });

    this.initForm();
  }

  initForm(): void {
    this.gerenciaForm = this.fb.group({
      gerencia: ['', Validators.required],
      fechaHora: ['', Validators.required],
      conductor: ['', Validators.required],
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      vehiculoInicio: ['', Validators.required],
      kmInicial: [null as number | null, [Validators.required, Validators.min(0)]],
      telefono: ['', Validators.required],
      cargo: ['', Validators.required],
      area: ['', Validators.required],
      proyecto: ['', Validators.required],
      motivo: ['', Validators.required],
      origen: ['', Validators.required],
      destino: ['', Validators.required],
      fechaSalida: ['', Validators.required],
      horaSalida: ['', Validators.required],
      licenciaVigente: ['SÍ', Validators.required],
      manejoDefensivo: ['SÍ', Validators.required],
      inspeccionVehiculo: ['APROBADA', Validators.required],
      mediosComunicacion: ['', Validators.required],
      testAlcohol: ['Negativo', Validators.required],
      llevaPasajeros: ['NO', Validators.required],
      pasajeros: [''],
      tipoVehiculo: ['', Validators.required],
      convoy: ['NO', Validators.required],
      unidadesConvoy: [''],
      tipoCarretera: ['Asfaltada', Validators.required],
      estadoVia: ['Bueno', Validators.required],
      clima: ['Despejado', Validators.required],
      distancia: ['', Validators.required],
      tipoCarga: ['', Validators.required],
      otrosPeligros: [''],
      horasConduccion: ['< 12 horas', Validators.required],
      horarioViaje: ['06:00 a 18:00', Validators.required],
      descansoConductor: ['Cumple', Validators.required],
      riesgosVia: [''],
      medidasControl: [''],
      paradasPlanificadas: [''],
      kmFinal: [null as number | null, Validators.min(0)]
    });
  }

  loadGerencia(id: number): void {
    // TODO: Implement API call to load existing gerencia
    console.log('Loading gerencia:', id);
  }

  onSubmit(): void {
    if (this.gerenciaForm.invalid) {
      this.gerenciaForm.markAllAsTouched();
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    this.saving = true;
    const formData = this.gerenciaForm.value;

    // TODO: Implement API call to save
    console.log('Saving gerencia:', formData);

    setTimeout(() => {
      this.saving = false;
      alert('Gerencia de viaje guardada exitosamente');
      this.router.navigate(['..'], { relativeTo: this.route });
    }, 1000);
  }

  cancelar(): void {
    if (confirm('¿Está seguro de cancelar? Los cambios no guardados se perderán.')) {
      this.router.navigate(['..'], { relativeTo: this.route });
    }
  }

  /** Campos con valor 'SÍ' | 'NO' (etiquetas de botón SI/NO). */
  toggleSiNo(campo: string, event: Event): void {
    const button = event.target as HTMLElement;
    const texto = (button.textContent || '').trim().toUpperCase();
    const si = texto === 'SI' || texto === 'SÍ';
    this.gerenciaForm.patchValue({ [campo]: si ? 'SÍ' : 'NO' });
  }

  valorSiNo(campo: string): boolean {
    const v = this.gerenciaForm.get(campo)?.value;
    return v === 'SÍ' || v === true;
  }
}
