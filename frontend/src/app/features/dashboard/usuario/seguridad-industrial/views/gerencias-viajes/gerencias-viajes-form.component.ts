import { Component, OnInit } from '@angular/core';
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
export class GerenciasViajesFormComponent implements OnInit {
  gerenciaForm!: FormGroup;
  businessRuc: string = '';
  isEditMode: boolean = false;
  gerenciaId?: number;
  saving: boolean = false;
  gerenciaAbiertaMsg = '';
  ultimoKmRegistrado: number | null = null;
  ultimoKmPlaca = '';

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
  otrosPeligrosOpts: string[] = [];
  /** Catálogo asignado en administración de empresa: Posibles riesgos en la vía. */
  riesgosViaOpts: string[] = [];

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

    const ruc$ = this.route.parent?.parent?.paramMap.pipe(map(pm => pm.get('ruc') || '')) ?? of('');

    combineLatest([ruc$, this.route.paramMap])
      .pipe(
        map(([ruc, pm]) => [ruc, pm.get('id') || ''] as const),
        distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1])
      )
      .subscribe(([ruc, idStr]) => {
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
      });
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
            const names = (arr: any[]) =>
              Array.isArray(arr) ? arr.map((x: any) => itemLabel(x)).filter((s: string) => !!s) : [];
            const tipoVias = names(det?.tipoVias);
            const estadoCarreteras = names(det?.estadoCarreteras);
            const condicionClimaticas = names(det?.condicionClimaticas);
            const horarioCirculaciones = names(det?.horarioCirculaciones);
            const tipoCargas = names(det?.tipoCargas);
            const horaConducciones = names(det?.horaConducciones);
            const horaDescansos = names(det?.horaDescansos);
            const distanciaRecorrers = names(det?.distanciaRecorrers);
            const transportaPasajeros = names(det?.transportaPasajeros);
            const medioComunicaciones = names(det?.medioComunicaciones);
            const posiblesRiesgosVia = names(det?.posiblesRiesgosVia);

            if (tipoVias.length) this.tiposCarretera = tipoVias;
            if (estadoCarreteras.length) this.estadosVia = estadoCarreteras;
            if (condicionClimaticas.length) this.condicionesClimaticas = condicionClimaticas;
            if (horarioCirculaciones.length) this.horariosViajeOpts = horarioCirculaciones;
            if (tipoCargas.length) this.tiposCarga = tipoCargas;
            if (horaConducciones.length) this.horasConduccionOpts = horaConducciones;
            if (horaDescansos.length) this.descansoConductorOpts = horaDescansos;
            if (distanciaRecorrers.length) this.distanciaOptions = distanciaRecorrers;
            if (transportaPasajeros.length) this.transportaPasajerosOpts = transportaPasajeros;
            if (medioComunicaciones.length) this.otrosPeligrosOpts = medioComunicaciones;
            if (posiblesRiesgosVia.length) this.riesgosViaOpts = posiblesRiesgosVia;

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
      mediosComunicacion: ['SÍ', Validators.required],
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
      horasConduccion: ['', Validators.required],
      horarioViaje: ['', Validators.required],
      descansoConductor: ['', Validators.required],
      riesgosVia: [''],
      medidasControl: [''],
      paradasPlanificadas: [''],
      kmFinal: [null as number | null, Validators.min(0)]
    });

    this.gerenciaForm.get('llevaPasajeros')?.valueChanges.subscribe(v => {
      if (v !== 'SÍ') {
        this.gerenciaForm.patchValue({ pasajeros: '' });
      }
    });
    this.gerenciaForm.get('convoy')?.valueChanges.subscribe(v => {
      if (v !== 'SÍ') {
        this.gerenciaForm.patchValue({ unidadesConvoy: '' });
      }
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
        this.otrosPeligrosOpts = this.ensureOptionInList(this.otrosPeligrosOpts, data.otrosPeligros);
        this.transportaPasajerosOpts = this.ensureOptionInList(this.transportaPasajerosOpts, data.medidasControl);
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
          mediosComunicacion: data.mediosComunicacion || 'SÍ',
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
          horasConduccion: data.horasConduccion || '',
          horarioViaje: data.horarioViaje || '',
          descansoConductor: data.descansoConduc || '',
          riesgosVia: data.riesgosVia ?? '',
          medidasControl: data.medidasControl ?? '',
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

    if (!this.isEditMode && this.gerenciaAbiertaMsg) {
      alert(this.gerenciaAbiertaMsg);
      return;
    }

    this.saving = true;
    const formData = this.gerenciaForm.value;

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
      horasConduccion: formData.horasConduccion,
      horarioViaje: formData.horarioViaje,
      descansoConduc: formData.descansoConductor,
      riesgosVia: formData.riesgosVia,
      medidasControl: formData.medidasControl,
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
      this.gerenciaAbiertaMsg = '';
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
      this.gerenciaAbiertaMsg = '';
      return;
    }
    this.gerenciaService.getAbiertaPorConductor(this.businessRuc, cedula).subscribe({
      next: (g) => {
        if (g?.id != null) {
          this.gerenciaAbiertaMsg =
            `El conductor tiene la gerencia ${g.codigo || '#' + g.id} abierta. Debe cerrarla antes de crear una nueva.`;
        } else {
          this.gerenciaAbiertaMsg = '';
        }
      },
      error: () => {
        this.gerenciaAbiertaMsg = '';
      }
    });
  }

  private cargarUltimoKmPlaca(placa: string): void {
    if (!this.businessRuc || !placa?.trim()) {
      this.ultimoKmRegistrado = null;
      this.ultimoKmPlaca = '';
      return;
    }
    const p = placa.trim();
    this.ultimoKmPlaca = p;
    this.gerenciaService.getUltimoKmPorPlaca(this.businessRuc, p).subscribe({
      next: (km) => {
        this.ultimoKmRegistrado = km;
      },
      error: () => {
        this.ultimoKmRegistrado = null;
      }
    });
  }

  // ───── Autocomplete Vehículos ────────────────────────────────────────
  vehicleSuggestions: Vehicle[] = [];

  onVehiculoInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value.trim().toLowerCase();
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
      this.cargarUltimoKmPlaca(placa);
    }
  }

  selectVehicle(v: Vehicle): void {
    this.gerenciaForm.patchValue({
      vehiculoInicio: v.placa || v.codigoEquipo || '',
      tipoVehiculo: v.tipoVehiculo || v.clase || ''
    });
    this.vehicleSuggestions = [];
    if (!this.isEditMode) {
      this.cargarUltimoKmPlaca(v.placa || v.codigoEquipo || '');
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
