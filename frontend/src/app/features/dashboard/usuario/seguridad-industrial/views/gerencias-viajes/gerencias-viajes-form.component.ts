import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { GerenciaViajeService, GerenciaViajeDto } from '../../services/gerencia-viaje.service';
import { EmployeeService, Page } from '../../../talento-humano/services/employee.service';
import { EmployeeResponse } from '../../../talento-humano/models/employee.model';
import { FleetService } from '../../../../../../services/fleet.service';
import { Vehicle, VehicleListResponse } from '../../../../../../models/vehicle.model';
import { BusinessService } from '../../../../../../services/business.service';

/** Nombres de controles alineados con la matriz de `gerencias-viajes-lista` para futura persistencia. */
@Component({
  selector: 'app-gerencias-viajes-form',
  templateUrl: './gerencias-viajes-form.component.html',
  styleUrls: ['./gerencias-viajes-form.component.scss']
})
export class GerenciasViajesFormComponent implements OnInit, OnDestroy {
  gerenciaForm!: FormGroup;
  businessRuc: string = '';
  isEditMode: boolean = false;
  gerenciaId?: number;
  saving: boolean = false;
  /** Viaje ACTIVO del mismo conductor (no puede crear otra hasta cerrar). */
  gerenciaAbiertaConductor: GerenciaViajeDto | null = null;
  /** Viaje ACTIVO de la misma placa. */
  gerenciaAbiertaVehiculo: GerenciaViajeDto | null = null;
  ultimoKmRegistrado: number | null = null;
  ultimoKmPlaca = '';

  private placaDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  private requiredFieldLabels: Record<string, string> = {
    conductor: 'Conductor',
    cedula: 'Cédula',
    vehiculoInicio: 'Vehículo (Inicio)',
    kmInicial: 'Km Inicial',
    telefono: 'Teléfono',
    cargo: 'Cargo',
    area: 'Área',
    motivo: 'Motivo',
    origen: 'Origen',
    destino: 'Destino',
    fechaSalida: 'Fecha de salida',
    horaSalida: 'Hora de salida',
    licenciaVigente: 'Licencia vigente',
    manejoDefensivo: 'Manejo defensivo',
    inspeccionVehiculo: 'Inspección del vehículo',
    mediosComunicacion: 'Medios de comunicación',
    testAlcohol: 'Test de alcohol',
    llevaPasajeros: '¿Lleva pasajeros?',
    pasajeros: 'Nombres de pasajeros',
    tipoVehiculo: 'Tipo de vehículo',
    convoy: '¿Convoy?',
    tipoCarretera: 'Tipo de vía',
    estadoVia: 'Estado de la vía',
    clima: 'Clima',
    tipoCarga: 'Tipo de carga',
    horasConduccion: 'Horas de conducción',
    horarioViaje: 'Horario de circulación del viaje',
    descansoConductor: 'Horas de descanso del conductor',
    riesgosVia: 'Posibles riesgos en la vía'
  };

  proyectos: string[] = ['Expansión Norte', 'Mantenimiento Rutinario', 'Proyecto Enap Sipec'];
  /** Opciones desde `GET /businesses/{id}/details` (parametrización por empresa). */
  tiposCarretera: string[] = [];
  estadosVia: string[] = [];
  condicionesClimaticas: string[] = [];
  tiposCarga: string[] = [];
  horasConduccionOpts: string[] = [];
  horariosViajeOpts: string[] = [];
  descansoConductorOpts: string[] = [];
  /** `true` tras intentar cargar detalle de empresa (éxito o error). */
  catalogsLoaded = false;
  testAlcoholOpts: string[] = ['Negativo', 'Positivo', 'No realizado'];
  inspeccionVehiculoOpts: string[] = ['APROBADA', 'PENDIENTE', 'OBSERVACIONES', 'RECHAZADA'];
  distanciaOptions: string[] = [];
  transportaPasajerosOpts: string[] = [];
  /** Opciones del catálogo «Medios de comunicación» (medio_comunicaciones). */
  otrosPeligrosOpts: string[] = [];
  catalogoOtrosPeligrosOpts: string[] = [];
  /** Catálogo asignado en administración de empresa: Posibles riesgos en la vía. */
  riesgosViaOpts: string[] = [];
  medidasControlTomadasViajeOpts: string[] = [];

  selectedMetodologiaId: number | null = null;
  baseTiposCarretera: string[] = [];
  baseDistanciaOptions: string[] = [];
  baseEstadosVia: string[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private gerenciaService: GerenciaViajeService,
    private employeeService: EmployeeService,
    private fleetService: FleetService,
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    this.initForm();

    const ruc = this.resolveRucFromRouteSnapshot();
    const idStr = this.route.snapshot.paramMap.get('id') || '';

    this.businessRuc = ruc;
    this.isEditMode = !!idStr;
    this.gerenciaId = idStr ? +idStr : undefined;

    if (!ruc) return;

    if (!this.isEditMode) {
      this.gerenciaService.getNextCodigo(ruc).subscribe({
        next: (res) => {
          if (this.gerenciaForm) this.gerenciaForm.patchValue({ codigo: res.codigo });
        },
        error: () => {}
      });
    }
    this.loadCompanyParams(ruc, this.isEditMode && this.gerenciaId != null ? this.gerenciaId : undefined);
  }

  private resolveRucFromRouteSnapshot(): string {
    let p: ActivatedRoute | null = this.route;
    while (p) {
      const v = p.snapshot.paramMap.get('ruc');
      if (v) return v;
      p = p.parent as ActivatedRoute | null;
    }
    return '';
  }

  /** Permite refrescar manualmente los catálogos de la empresa sin recargar la página. */
  refreshCompanyParams(): void {
    if (!this.businessRuc) {
      return;
    }
    const id = this.isEditMode && this.gerenciaId != null ? this.gerenciaId : undefined;
    this.loadCompanyParams(this.businessRuc, id);
  }

  /**
   * Catálogos desde el mismo detalle de empresa que administra `/dashboard/admin/empresas/admin/:id`.
   * En edición, `gerenciaIdAfterLoad` fuerza cargar el registro solo después de tener las listas (evita selects vacíos al hacer patch).
   */
  private loadCompanyParams(ruc: string, gerenciaIdAfterLoad?: number): void {
    this.catalogsLoaded = false;
    this.businessService.getByRuc(ruc).subscribe({
      next: (biz: any) => {
        const id = biz?.id;
        if (!id) {
          this.catalogsLoaded = true;
          return;
        }
        this.businessService.getDetails(id).subscribe({
          next: (det: any) => {
            const itemLabel = (x: any): string => {
              if (x == null) return '';
              const n = (x.name ?? x.nombre ?? '').toString().trim();
              if (n) return n;
              return (x.description ?? x.descripcion ?? '').toString().trim();
            };
            const names = (arr: any[]) => Array.isArray(arr) ? arr.map((x: any) => itemLabel(x)).filter((s: string) => !!s) : [];

            const preferredMet = this.readMetodologiaFromSessionStorage(id, det?.metodologiaRiesgos);
            this.selectedMetodologiaId = preferredMet != null ? preferredMet : this.pickMetodologiaId(det);
            // Filtrar por metodología; si no queda nada, usar el listado completo (compatibilidad)
            const f = (arr: any[]) => {
              const all = Array.isArray(arr) ? arr : [];
              const byMet = this.filterByMet(all, this.selectedMetodologiaId);
              return byMet.length ? byMet : all;
            };

            const tipoVias = names(f(det?.tipoVias || []));
            const estadoCarreteras = names(f(det?.estadoCarreteras || []));
            const condicionClimaticas = names(f(det?.condicionClimaticas || []));
            const horarioCirculaciones = names(f(det?.horarioCirculaciones || []));
            const tipoCargas = names(f(det?.tipoCargas || []));
            const horaConducciones = names(f(det?.horaConducciones || []));
            const horaDescansos = names(f(det?.horaDescansos || []));
            const distanciaRecorrers = names(f(det?.distanciaRecorrers || []));
            const transportaPasajeros = names(f(det?.transportaPasajeros || []));
            const medioComunicaciones = names(f(det?.medioComunicaciones || []));
            const posiblesRiesgosVia = names(f(det?.posiblesRiesgosVia || []));
            const otrosPeligrosCat = names(f(det?.otrosPeligrosViajeCatalogo || []));
            const medidasTomadasCat = names(f(det?.medidasControlTomadasViajeCatalogo || []));

            this.tiposCarretera = tipoVias;
            this.estadosVia = estadoCarreteras;
            this.condicionesClimaticas = condicionClimaticas;
            this.horariosViajeOpts = horarioCirculaciones;
            this.tiposCarga = tipoCargas;
            this.horasConduccionOpts = horaConducciones;
            this.descansoConductorOpts = horaDescansos;
            this.distanciaOptions = distanciaRecorrers;
            this.transportaPasajerosOpts = transportaPasajeros;
            this.otrosPeligrosOpts = medioComunicaciones;
            this.riesgosViaOpts = posiblesRiesgosVia;
            this.catalogoOtrosPeligrosOpts = otrosPeligrosCat;
            this.medidasControlTomadasViajeOpts = medidasTomadasCat;

            this.baseTiposCarretera = [...tipoVias];
            this.baseDistanciaOptions = [...distanciaRecorrers];
            this.baseEstadosVia = [...estadoCarreteras];

            if (gerenciaIdAfterLoad != null) {
              this.loadGerencia(gerenciaIdAfterLoad);
            }
            this.catalogsLoaded = true;
          },
          error: () => {
            this.catalogsLoaded = true;
          }
        });
      },
      error: () => {
        this.catalogsLoaded = true;
      }
    });
  }

  /** Si el valor guardado no está en el catálogo actual (datos antiguos), se añade para que el select lo muestre. */
  private ensureOptionInList(list: string[], value: string | number | null | undefined): string[] {
    const v = (value === null || value === undefined ? '' : String(value)).trim();
    if (!v) return list;
    if (list.includes(v)) return list;
    return [v, ...list];
  }

  private metodoIdFrom(item: any): number | null {
    const nested = item?.metodologiaRiesgo?.id ?? item?.metodologiaRiesgoId;
    const n = nested != null ? Number(nested) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  private readMetodologiaFromSessionStorage(businessId: number, metodologias?: any[]): number | null {
    try {
      const key = `gerenciaViajesMetodologiaVista_${businessId}`;
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const id = Number(raw);
      if (!Number.isFinite(id)) return null;
      const list = Array.isArray(metodologias) ? metodologias : [];
      if (list.some((m: any) => Number(m?.id) === id)) return id;
      return id; // si el backend aún no envía metodologías, conservar preferencia
    } catch {
      return null;
    }
  }

  private pickMetodologiaId(det: any): number | null {
    const mids = Array.isArray(det?.metodologiaRiesgos) ? det.metodologiaRiesgos : [];
    if (mids.length === 1 && mids[0]?.id != null) return Number(mids[0].id);
    const buckets: Record<string, number> = {};
    const arrays = [
      det?.distanciaRecorrers, det?.tipoVias, det?.condicionClimaticas, det?.horarioCirculaciones,
      det?.estadoCarreteras, det?.tipoCargas, det?.horaConducciones, det?.horaDescansos,
      det?.medioComunicaciones, det?.transportaPasajeros, det?.posiblesRiesgosVia,
      det?.otrosPeligrosViajeCatalogo, det?.medidasControlTomadasViajeCatalogo
    ];
    arrays.forEach((arr: any[]) => {
      (Array.isArray(arr) ? arr : []).forEach((x: any) => {
        const mid = this.metodoIdFrom(x);
        if (mid != null) {
          const k = String(mid);
          buckets[k] = (buckets[k] || 0) + 1;
        }
      });
    });
    let best: number | null = null;
    let bestCount = 0;
    Object.keys(buckets).forEach(k => {
      const c = buckets[k];
      if (c > bestCount) {
        bestCount = c;
        best = Number(k);
      }
    });
    return best;
  }

  private filterByMet(arr: any[], metId: number | null): any[] {
    if (!Array.isArray(arr)) return [];
    // Si no hay metodología seleccionada, no filtrar.
    if (metId == null) return arr;
    // Incluir ítems sin metodología explícita (compatibilidad) y los que coincidan con la metodología activa.
    return arr.filter((x: any) => {
      const mid = this.metodoIdFrom(x);
      return mid == null || mid === metId;
    });
  }

  labelFor(field: string, value: string): string {
    const v = (value ?? '').toString();
    if (!v) return v;
    if (field === 'tipoCarretera') return this.baseTiposCarretera.includes(v) ? v : `${v} — fuera de catálogo`;
    if (field === 'distancia') return this.baseDistanciaOptions.includes(v) ? v : `${v} — fuera de catálogo`;
    if (field === 'estadoVia') return this.baseEstadosVia.includes(v) ? v : `${v} — fuera de catálogo`;
    return v;
  }

  initForm(): void {
    this.gerenciaForm = this.fb.group({
      codigo: new FormControl({ value: '', disabled: true }),
      conductor: ['', Validators.required],
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      vehiculoInicio: ['', Validators.required],
      kmInicial: [null as number | null, [Validators.required, Validators.min(0)]],
      telefono: ['', Validators.required],
      cargo: ['', Validators.required],
      area: ['', Validators.required],
      proyecto: [''],
      motivo: ['', Validators.required],
      origen: ['', Validators.required],
      destino: ['', Validators.required],
      fechaSalida: ['', Validators.required],
      horaSalida: ['', Validators.required],
      licenciaVigente: ['SÍ', Validators.required],
      manejoDefensivo: ['SÍ', Validators.required],
      inspeccionVehiculo: ['SÍ', Validators.required],
      mediosComunicacion: ['', Validators.required],
      testAlcohol: ['Negativo', Validators.required],
      llevaPasajeros: ['NO', Validators.required],
      pasajeros: [''],
      tipoVehiculo: ['', Validators.required],
      convoy: ['NO', Validators.required],
      unidadesConvoy: [''],
      tipoCarretera: ['', Validators.required],
      estadoVia: ['', Validators.required],
      clima: ['', Validators.required],
      distancia: [''],
      tipoCarga: ['', Validators.required],
      otrosPeligros: [''],
      catalogoOtrosPeligros: [''],
      horasConduccion: ['', Validators.required],
      horarioViaje: ['', Validators.required],
      descansoConductor: ['', Validators.required],
      riesgosVia: [''],
      medidasControl: [''],
      medidasControlTomadasViaje: [''],
      paradasPlanificadas: [''],
      kmFinal: [null as number | null, Validators.min(0)]
    });

    this.gerenciaForm.get('llevaPasajeros')?.valueChanges.subscribe(v => {
      const nombresCtrl = this.gerenciaForm.get('pasajeros');
      if (v === 'SÍ') {
        nombresCtrl?.setValidators([Validators.required]);
      } else {
        nombresCtrl?.clearValidators();
        this.gerenciaForm.patchValue({ pasajeros: '' });
      }
      nombresCtrl?.updateValueAndValidity({ emitEvent: false });
    });
    this.gerenciaForm.get('convoy')?.valueChanges.subscribe(v => {
      if (v !== 'SÍ') {
        this.gerenciaForm.patchValue({ unidadesConvoy: '' });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.placaDebounceHandle) {
      clearTimeout(this.placaDebounceHandle);
      this.placaDebounceHandle = null;
    }
  }

  /** KM inicial numérico estrictamente menor al último km de cierres previos (misma placa). */
  get kmInicialMenorQueUltimoRegistrado(): boolean {
    if (this.isEditMode) return false;
    const u = this.ultimoKmRegistrado;
    if (u == null) return false;
    const raw = this.gerenciaForm.get('kmInicial')?.value;
    const v = raw === '' || raw === null || raw === undefined ? NaN : Number(raw);
    if (Number.isNaN(v)) return false;
    return v < u;
  }

  get bloqueoPorGerenciaAbierta(): boolean {
    if (this.isEditMode) return false;
    return this.gerenciaAbiertaConductor != null || this.gerenciaAbiertaVehiculo != null;
  }

  /** Bloquea el resto del formulario (como en la app): gerencia abierta o km inválido. */
  get formularioBloqueadoResto(): boolean {
    if (this.isEditMode) return false;
    return this.kmInicialMenorQueUltimoRegistrado || this.bloqueoPorGerenciaAbierta;
  }

  get mensajeGerenciaConductor(): string {
    const g = this.gerenciaAbiertaConductor;
    if (g?.id == null) return '';
    return `El conductor tiene la gerencia ${g.codigo || '#' + g.id} abierta. Debe cerrarla antes de crear una nueva.`;
  }

  get mensajeGerenciaVehiculo(): string {
    const g = this.gerenciaAbiertaVehiculo;
    if (g?.id == null) return '';
    return `Este vehículo tiene la gerencia ${g.codigo || '#' + g.id} abierta. Debe cerrarla antes de crear una nueva.`;
  }

  irACerrarGerencia(g: GerenciaViajeDto): void {
    if (g.id == null) return;
    this.router.navigate(['..'], {
      relativeTo: this.route,
      queryParams: { cerrar: g.id }
    });
  }

  loadGerencia(id: number): void {
    this.gerenciaService.getById(id).subscribe({
      next: (data) => {
        this.tiposCarretera = this.ensureOptionInList(this.tiposCarretera, data.tipoCarretera);
        this.estadosVia = this.ensureOptionInList(this.estadosVia, data.estadoVia);
        this.condicionesClimaticas = this.ensureOptionInList(this.condicionesClimaticas, data.clima);
        this.tiposCarga = this.ensureOptionInList(this.tiposCarga, data.tipoCarga);
        this.horasConduccionOpts = this.ensureOptionInList(this.horasConduccionOpts, data.horasConduccion);
        this.horariosViajeOpts = this.ensureOptionInList(this.horariosViajeOpts, data.horarioViaje);
        this.descansoConductorOpts = this.ensureOptionInList(this.descansoConductorOpts, data.descansoConduc);
        this.distanciaOptions = this.ensureOptionInList(this.distanciaOptions, data.distancia);
        // Asegurar que el valor guardado de Medios de comunicación esté en el combo
        this.otrosPeligrosOpts = this.ensureOptionInList(this.otrosPeligrosOpts, data.mediosComunicacion);
        this.catalogoOtrosPeligrosOpts = this.ensureOptionInList(this.catalogoOtrosPeligrosOpts, data.catalogoOtrosPeligros);
        // El select "Pasajeros" usa el catálogo asignado en administración (transportaPasajerosOpts)
        // y su valor persistido se guarda en el campo medidasControl por compatibilidad.
        this.transportaPasajerosOpts = this.ensureOptionInList(this.transportaPasajerosOpts, data.medidasControl);
        this.medidasControlTomadasViajeOpts = this.ensureOptionInList(
          this.medidasControlTomadasViajeOpts,
          data.medidasControlTomadasViaje
        );
        this.riesgosViaOpts = this.ensureOptionInList(this.riesgosViaOpts, data.riesgosVia);

        this.gerenciaForm.patchValue({
          codigo: data.codigo || '',
          conductor: data.conductor,
          cedula: data.cedula,
          vehiculoInicio: data.vehiculoInicio,
          kmInicial: data.kmInicial,
          telefono: data.telefono,
          cargo: data.cargo,
          area: data.area,
          proyecto: data.proyecto,
          motivo: data.motivo,
          origen: data.origen,
          destino: data.destino,
          fechaSalida: data.fechaSalida,
          horaSalida: data.horaSalida,
          licenciaVigente: data.licenciaVigente || 'SÍ',
          manejoDefensivo: data.manejoDefensivo || 'SÍ',
          inspeccionVehiculo: data.inspeccionVehiculo || 'SÍ',
          mediosComunicacion: data.mediosComunicacion || '',
          testAlcohol: data.testAlcohol || 'Negativo',
          llevaPasajeros: data.llevaPasajeros || 'NO',
          pasajeros: data.pasajeros,
          tipoVehiculo: data.tipoVehiculo,
          convoy: data.convoy || 'NO',
          unidadesConvoy: data.unidadesConvoy,
          tipoCarretera: data.tipoCarretera || '',
          estadoVia: data.estadoVia || '',
          clima: data.clima || '',
          distancia: data.distancia ?? '',
          tipoCarga: data.tipoCarga || '',
          otrosPeligros: data.otrosPeligros ?? '',
          catalogoOtrosPeligros: data.catalogoOtrosPeligros ?? '',
          horasConduccion: data.horasConduccion || '',
          horarioViaje: data.horarioViaje || '',
          descansoConductor: data.descansoConduc || '',
          riesgosVia: data.riesgosVia ?? '',
          medidasControl: data.medidasControl ?? '',
          medidasControlTomadasViaje: data.medidasControlTomadasViaje ?? '',
          paradasPlanificadas: data.paradasPlanificadas,
          kmFinal: data.kmFinal
        });
      },
      error: (err) => {
        console.error('[GerenciasViajesForm] Error al cargar:', err);
        alert('Error al cargar la gerencia de viaje');
      }
    });
  }

  onSubmit(): void {
    if (this.gerenciaForm.invalid) {
      this.gerenciaForm.markAllAsTouched();
      const faltantes = this.getMissingRequiredFields();
      const cedulaInvalida = this.gerenciaForm.get('cedula')?.errors?.['pattern'] ? 'Cédula (10 dígitos)' : '';
      const lista = [...faltantes, ...(cedulaInvalida ? [cedulaInvalida] : [])];
      const msg = lista.length ? `Faltan campos obligatorios:\n- ${lista.join('\n- ')}` : 'Por favor complete todos los campos requeridos';
      alert(msg);
      return;
    }

    // Validar RUC antes de enviar (solo creación)
    if (!this.isEditMode && !this.businessRuc) {
      alert('No se encontró el RUC de la empresa en la ruta. Regrese al listado e intente nuevamente.');
      return;
    }

    if (!this.isEditMode && this.bloqueoPorGerenciaAbierta) {
      const partes = [this.mensajeGerenciaConductor, this.mensajeGerenciaVehiculo].filter(Boolean);
      alert(partes.join('\n\n'));
      return;
    }

    if (!this.isEditMode && this.kmInicialMenorQueUltimoRegistrado && this.ultimoKmRegistrado != null) {
      alert(
        `No es posible guardar: el KM inicial es menor al último kilometraje registrado para esta placa (${this.ultimoKmRegistrado} km). Corrija el valor para continuar.`
      );
      return;
    }

    const formData = this.gerenciaForm.value;

    const outErrors: string[] = [];
    const tipoVal = (formData?.tipoCarretera || '').toString().trim();
    const distVal = (formData?.distancia || '').toString().trim();
    if (tipoVal && !this.baseTiposCarretera.includes(tipoVal)) outErrors.push('Tipo de vía');
    if (distVal && !this.baseDistanciaOptions.includes(distVal)) outErrors.push('Distancia a recorrer');
    if (outErrors.length) {
      alert(`Actualice los siguientes campos con opciones del catálogo:\n- ${outErrors.join('\n- ')}`);
      return;
    }

    this.saving = true;

    const dto: GerenciaViajeDto = {
      conductor: formData.conductor,
      cedula: formData.cedula,
      vehiculoInicio: formData.vehiculoInicio,
      kmInicial: formData.kmInicial,
      telefono: formData.telefono,
      cargo: formData.cargo,
      area: formData.area,
      proyecto: formData.proyecto,
      motivo: formData.motivo,
      origen: formData.origen,
      destino: formData.destino,
      fechaSalida: formData.fechaSalida,
      horaSalida: formData.horaSalida,
      licenciaVigente: formData.licenciaVigente,
      manejoDefensivo: formData.manejoDefensivo,
      inspeccionVehiculo: formData.inspeccionVehiculo,
      mediosComunicacion: formData.mediosComunicacion,
      testAlcohol: formData.testAlcohol,
      llevaPasajeros: formData.llevaPasajeros,
      pasajeros: formData.pasajeros,
      tipoVehiculo: formData.tipoVehiculo,
      convoy: formData.convoy,
      unidadesConvoy: formData.unidadesConvoy,
      tipoCarretera: formData.tipoCarretera,
      estadoVia: formData.estadoVia,
      clima: formData.clima,
      distancia: formData.distancia,
      tipoCarga: formData.tipoCarga,
      otrosPeligros: formData.otrosPeligros,
      catalogoOtrosPeligros: formData.catalogoOtrosPeligros,
      horasConduccion: formData.horasConduccion,
      horarioViaje: formData.horarioViaje,
      descansoConduc: formData.descansoConductor,
      riesgosVia: formData.riesgosVia,
      medidasControl: formData.medidasControl,
      medidasControlTomadasViaje: formData.medidasControlTomadasViaje,
      paradasPlanificadas: formData.paradasPlanificadas
    };

    const request$ = this.isEditMode && this.gerenciaId
      ? this.gerenciaService.update(this.gerenciaId, dto)
      : this.gerenciaService.create(this.businessRuc, dto);

    request$.subscribe({
      next: () => {
        this.saving = false;
        alert(this.isEditMode ? 'Gerencia de viaje actualizada exitosamente' : 'Gerencia de viaje creada exitosamente');
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: (err) => {
        this.saving = false;
        console.error('[GerenciasViajesForm] Error al guardar:', err);
        const msg =
          err?.error?.message ||
          err?.error?.detail ||
          (typeof err?.error === 'string' ? err.error : null) ||
          err?.message ||
          'Error al guardar la gerencia de viaje';
        alert(msg);
      }
    });
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

  // ───── Autocomplete Empleados ─────────────────────────────────────────
  conductorSuggestions: EmployeeResponse[] = [];
  cedulaSuggestions: EmployeeResponse[] = [];

  onConductorInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value.trim();
    if (!this.businessRuc || term.length < 2) {
      this.conductorSuggestions = [];
      return;
    }
    this.employeeService.getEmployeesByBusinessRucPaginated(this.businessRuc, {
      page: 0, size: 10, nombres: term, apellidos: term
    }).subscribe({
      next: (page: Page<EmployeeResponse>) => this.conductorSuggestions = page.content || [],
      error: () => this.conductorSuggestions = []
    });
  }

  onConductorChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    const match = this.conductorSuggestions.find((e: EmployeeResponse) => {
      const nombre = `${e.nombres || ''} ${e.apellidos || ''}`.trim().toLowerCase();
      return nombre === val || (e.name || '').toLowerCase() === val || (e.cedula || '').toLowerCase() === val;
    });
    if (match) {
      this.selectEmployee(match);
    }
  }

  onCedulaInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value.trim();
    if (!this.businessRuc) return;
    if (term.length === 10) {
      this.verificarGerenciaAbierta(term);
      this.employeeService.getEmployeeByCedulaScopedByRuc(this.businessRuc, term).subscribe({
        next: (emp: EmployeeResponse) => {
          const nombre = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || '';
          this.gerenciaForm.patchValue({
            conductor: nombre,
            telefono: emp.phone || '',
            cargo: (emp as any).positionName || '',
            area: (emp as any).departmentName || '',
            proyecto: (emp as any).contractorCompanyName || (emp as any).businessName || this.gerenciaForm.get('proyecto')?.value
          });
        },
        error: () => {}
      });
    } else if (term.length >= 2) {
      this.employeeService.getEmployeesByBusinessRucPaginated(this.businessRuc, {
        page: 0, size: 10, cedula: term
      }).subscribe({
        next: (page: Page<EmployeeResponse>) => this.cedulaSuggestions = page.content || [],
        error: () => this.cedulaSuggestions = []
      });
    } else {
      this.cedulaSuggestions = [];
      this.gerenciaAbiertaConductor = null;
    }
  }

  selectEmployee(emp: EmployeeResponse): void {
    const nombre = `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || emp.name || '';
    this.gerenciaForm.patchValue({
      conductor: nombre,
      cedula: emp.cedula || '',
      telefono: emp.phone || '',
      cargo: (emp as any).positionName || '',
      area: (emp as any).departmentName || '',
      proyecto: (emp as any).contractorCompanyName || (emp as any).businessName || this.gerenciaForm.get('proyecto')?.value
    });
    this.conductorSuggestions = [];
    this.cedulaSuggestions = [];
    if (emp.cedula) {
      this.verificarGerenciaAbierta(emp.cedula);
    }
  }

  private verificarGerenciaAbierta(cedula: string): void {
    if (this.isEditMode || !this.businessRuc || !cedula || cedula.length !== 10) {
      this.gerenciaAbiertaConductor = null;
      return;
    }
    this.gerenciaService.getAbiertaPorConductor(this.businessRuc, cedula).subscribe({
      next: (g) => {
        this.gerenciaAbiertaConductor = g?.id != null ? g : null;
      },
      error: () => {
        this.gerenciaAbiertaConductor = null;
      }
    });
  }

  private programarVerificacionPlaca(placaRaw: string): void {
    if (this.placaDebounceHandle) {
      clearTimeout(this.placaDebounceHandle);
      this.placaDebounceHandle = null;
    }
    this.placaDebounceHandle = setTimeout(() => {
      this.placaDebounceHandle = null;
      this.ejecutarVerificacionPlaca(placaRaw);
    }, 550);
  }

  private ejecutarVerificacionPlaca(placaRaw: string): void {
    if (this.isEditMode || !this.businessRuc) {
      return;
    }
    const placa = (placaRaw || '').trim();
    if (placa.length < 2) {
      this.ultimoKmRegistrado = null;
      this.ultimoKmPlaca = '';
      this.gerenciaAbiertaVehiculo = null;
      return;
    }
    this.ultimoKmPlaca = placa;
    this.gerenciaService.getUltimoKmPorPlaca(this.businessRuc, placa).subscribe({
      next: (km) => {
        this.ultimoKmRegistrado = km;
      },
      error: () => {
        this.ultimoKmRegistrado = null;
      }
    });
    this.gerenciaService.getAbiertaPorVehiculo(this.businessRuc, placa).subscribe({
      next: (g) => {
        this.gerenciaAbiertaVehiculo = g?.id != null ? g : null;
      },
      error: () => {
        this.gerenciaAbiertaVehiculo = null;
      }
    });
  }

  private verificarPlacaInmediato(): void {
    if (this.placaDebounceHandle) {
      clearTimeout(this.placaDebounceHandle);
      this.placaDebounceHandle = null;
    }
    const placa = (this.gerenciaForm.get('vehiculoInicio')?.value || '').toString();
    this.ejecutarVerificacionPlaca(placa);
  }

  // ───── Autocomplete Vehículos ────────────────────────────────────────
  vehicleSuggestions: Vehicle[] = [];

  onVehiculoInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const term = raw.trim().toLowerCase();
    if (!this.isEditMode && this.businessRuc) {
      this.programarVerificacionPlaca(raw);
    }
    if (!this.businessRuc || term.length < 2) {
      this.vehicleSuggestions = [];
      return;
    }
    this.fleetService.getVehicles(this.businessRuc, 1, 100).subscribe({
      next: (resp: VehicleListResponse) => {
        const list = (resp.vehicles || []).filter((v: Vehicle) => (v.placa || '').toLowerCase().includes(term));
        this.vehicleSuggestions = list.slice(0, 10);
      },
      error: () => this.vehicleSuggestions = []
    });
  }

  onVehiculoBlur(): void {
    const placa: string = this.gerenciaForm.get('vehiculoInicio')?.value || '';
    const match = this.vehicleSuggestions.find(v => (v.placa || '').toLowerCase() === placa.toLowerCase());
    if (match) {
      this.gerenciaForm.patchValue({ tipoVehiculo: match.tipoVehiculo || match.clase || '' });
    }
    if (!this.isEditMode) {
      this.verificarPlacaInmediato();
    }
  }

  selectVehicle(v: Vehicle): void {
    this.gerenciaForm.patchValue({
      vehiculoInicio: v.placa || v.codigoEquipo || '',
      tipoVehiculo: v.tipoVehiculo || v.clase || ''
    });
    this.vehicleSuggestions = [];
    if (!this.isEditMode) {
      this.verificarPlacaInmediato();
    }
  }

  private getMissingRequiredFields(): string[] {
    const labels = this.requiredFieldLabels;
    const missing: string[] = [];
    Object.keys(labels).forEach(key => {
      const ctrl = this.gerenciaForm.get(key);
      if (!ctrl) return;
      const required = ctrl.hasValidator && ctrl.hasValidator(Validators.required);
      if (!required) return;
      const val = ctrl.value;
      const isEmpty = val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
      if (isEmpty) missing.push(labels[key]);
    });
    return missing;
  }
}
