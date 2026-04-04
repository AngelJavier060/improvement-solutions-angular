import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { FleetService } from '../../../../../services/fleet.service';
import { CreateVehicleRequest, FichaCatalogsResponse } from '../../../../../models/vehicle.model';

@Component({
  selector: 'app-nueva-ficha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nueva-ficha.component.html',
  styleUrls: ['./nueva-ficha.component.scss']
})
export class NuevaFichaComponent implements OnInit {
  vehicleForm!: FormGroup;
  businessRuc: string = '';
  /** Si no es null, estamos editando una ficha existente */
  editingVehicleId: number | null = null;
  loading = false;
  catalogsLoading = true;
  error = '';
  catalogs: FichaCatalogsResponse | null = null;

  fotoPrincipalPreview = '';
  fotoLateralPreview = '';
  fotoInteriorPreview = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService
  ) {}

  ngOnInit(): void {
    this.createForm();
    const parent = this.route.parent;
    if (!parent) {
      this.catalogsLoading = false;
      this.error = 'Ruta inválida: falta el contexto de empresa.';
      return;
    }
    parent.paramMap.pipe(
      map(pm => (pm.get('ruc') || '').trim()),
      distinctUntilChanged(),
      switchMap(ruc => {
        if (!ruc) {
          this.businessRuc = '';
          this.catalogsLoading = false;
          this.catalogs = null;
          this.error = 'No se encontró el RUC en la URL.';
          return of(null);
        }
        this.businessRuc = ruc;
        this.error = '';
        return this.route.paramMap.pipe(
          map(cpm => {
            const vid = cpm.get('vehicleId');
            return vid != null && vid !== '' ? +vid : null;
          }),
          distinctUntilChanged(),
          switchMap(vehicleId => {
            this.editingVehicleId = vehicleId;
            this.catalogsLoading = true;
            return this.fleetService.getFichaCatalogs(ruc).pipe(
              switchMap(cats => {
                this.catalogs = cats;
                if (vehicleId != null) {
                  return this.fleetService.getVehicleById(ruc, vehicleId);
                }
                return of(null);
              })
            );
          })
        );
      })
    ).subscribe({
      next: vehicleOrNull => {
        this.catalogsLoading = false;
        if (vehicleOrNull) {
          this.patchFormFromVehicle(vehicleOrNull as unknown as Record<string, unknown>);
        }
      },
      error: err => {
        console.error(err);
        this.catalogsLoading = false;
        this.error =
          this.editingVehicleId != null
            ? 'No se pudo cargar la ficha o los catálogos.'
            : 'No se pudieron cargar los catálogos de la empresa. Verifique el RUC y la configuración de mantenimiento.';
      }
    });
  }

  private patchFormFromVehicle(v: Record<string, unknown>): void {
    this.vehicleForm.patchValue({
      codigoEquipo: v['codigoEquipo'] ?? '',
      placa: v['placa'] ?? '',
      claseVehiculoId: v['claseVehiculoId'] ?? null,
      entidadRemitenteId: v['entidadRemitenteId'] ?? null,
      tipoVehiculoId: v['tipoVehiculoId'] ?? null,
      marcaVehiculoId: v['marcaVehiculoId'] ?? null,
      modelo: v['modelo'] ?? '',
      anio: v['anio'] ?? null,
      serieChasis: v['serieChasis'] ?? '',
      serieMotor: v['serieMotor'] ?? '',
      colorVehiculoId: v['colorVehiculoId'] ?? null,
      paisOrigenId: v['paisOrigenId'] ?? null,
      tipoCombustibleId: v['tipoCombustibleId'] ?? null,
      estadoUnidadId: v['estadoUnidadId'] ?? null,
      transmisionId: v['transmisionId'] ?? null,
      estadoActivo: v['estadoActivo'] ?? 'ACTIVO',
      cilindraje: v['cilindraje'] ?? '',
      pasajeros: v['pasajeros'] ?? null,
      tonelaje: v['tonelaje'] ?? '',
      capacidad: v['capacidad'] ?? '',
      potencia: v['potencia'] ?? '',
      kmInicio: v['kmInicio'] ?? null,
      largo: v['largo'] ?? '',
      ancho: v['ancho'] ?? '',
      alto: v['alto'] ?? '',
      proyectoAsignado: v['proyectoAsignado'] ?? '',
      numeroEjeId: v['numeroEjeId'] ?? null,
      configuracionEjeId: v['configuracionEjeId'] ?? null,
      medidaNeumaticos: v['medidaNeumaticos'] ?? '',
      marcaNeumatico: v['marcaNeumatico'] ?? '',
      kmReencauche: v['kmReencauche'] ?? '',
      numeroRepuestos: v['numeroRepuestos'] ?? 0,
      observaciones: v['observaciones'] ?? ''
    });
    this.fotoPrincipalPreview = (v['fotoPrincipal'] as string) || '';
    this.fotoLateralPreview = (v['fotoLateral'] as string) || '';
    this.fotoInteriorPreview = (v['fotoInterior'] as string) || '';
  }

  createForm(): void {
    this.vehicleForm = this.fb.group({
      codigoEquipo: ['', Validators.required],
      placa: ['', Validators.required],
      claseVehiculoId: [null as number | null],
      entidadRemitenteId: [null as number | null],
      tipoVehiculoId: [null as number | null],
      marcaVehiculoId: [null as number | null],
      modelo: [''],
      anio: [null as number | null],
      serieChasis: [''],
      serieMotor: [''],
      colorVehiculoId: [null as number | null],
      paisOrigenId: [null as number | null],
      tipoCombustibleId: [null as number | null],
      estadoUnidadId: [null as number | null],
      transmisionId: [null as number | null],
      estadoActivo: ['ACTIVO', Validators.required],
      cilindraje: [''],
      pasajeros: [null as number | null],
      tonelaje: [''],
      capacidad: [''],
      potencia: [''],
      kmInicio: [null as number | null],
      largo: [''],
      ancho: [''],
      alto: [''],
      proyectoAsignado: [''],
      numeroEjeId: [null as number | null],
      configuracionEjeId: [null as number | null],
      medidaNeumaticos: [''],
      marcaNeumatico: [''],
      kmReencauche: [''],
      numeroRepuestos: [0],
      observaciones: ['']
    });
  }

  schematicAxleCount(): number {
    const id = this.vehicleForm.get('numeroEjeId')?.value;
    const item = this.catalogs?.numeroEjes?.find(x => x.id === id);
    if (!item?.name) return 0;
    const m = String(item.name).match(/\d+/);
    if (!m) return 0;
    return Math.min(8, Math.max(1, parseInt(m[0], 10)));
  }

  schematicAxleIndexes(): number[] {
    const n = this.schematicAxleCount();
    return n > 0 ? Array.from({ length: n }, (_, i) => i) : [];
  }

  schematicCaption(): string {
    const cid = this.vehicleForm.get('configuracionEjeId')?.value;
    const cfg = this.catalogs?.configuracionEjes?.find(x => x.id === cid);
    const ne = this.catalogs?.numeroEjes?.find(x => x.id === this.vehicleForm.get('numeroEjeId')?.value);
    const parts: string[] = [];
    if (ne?.name) parts.push(`Ejes: ${ne.name}`);
    if (cfg?.name) parts.push(`Config. neumáticos: ${cfg.name}`);
    return parts.join(' · ') || 'Seleccione número de ejes y configuración';
  }

  schematicDriveAxleCount(): number {
    const cid = this.vehicleForm.get('configuracionEjeId')?.value;
    const cfg = this.catalogs?.configuracionEjes?.find(x => x.id === cid);
    if (!cfg?.name) return 0;
    const m = String(cfg.name).toLowerCase().replace(/\s/g, '').match(/(\d+)x(\d+)/);
    if (!m) return 0;
    const driven = parseInt(m[2], 10);
    return Math.min(this.schematicAxleCount(), Math.max(0, driven));
  }

  schematicFirstDriveIndex(): number {
    const total = this.schematicAxleCount();
    const drive = this.schematicDriveAxleCount();
    if (total <= 0 || drive <= 0) return total;
    return Math.max(0, total - drive);
  }

  isDriveAxle(axleIndex: number): boolean {
    const from = this.schematicFirstDriveIndex();
    return axleIndex >= from && this.schematicDriveAxleCount() > 0;
  }

  onFileSelected(event: Event, type: 'principal' | 'lateral' | 'interior'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const r = e.target?.result as string;
        switch (type) {
          case 'principal':
            this.fotoPrincipalPreview = r;
            break;
          case 'lateral':
            this.fotoLateralPreview = r;
            break;
          case 'interior':
            this.fotoInteriorPreview = r;
            break;
        }
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  onSubmit(): void {
    if (this.vehicleForm.valid && !this.catalogsLoading) {
      this.loading = true;
      this.error = '';
      const v = this.vehicleForm.value;
      const vehicleData: CreateVehicleRequest = {
        codigoEquipo: v.codigoEquipo,
        placa: v.placa,
        claseVehiculoId: v.claseVehiculoId,
        entidadRemitenteId: this.editingVehicleId != null ? v.entidadRemitenteId : null,
        tipoVehiculoId: v.tipoVehiculoId,
        marcaVehiculoId: v.marcaVehiculoId,
        modelo: v.modelo || undefined,
        anio: v.anio,
        serieChasis: v.serieChasis || undefined,
        serieMotor: v.serieMotor || undefined,
        colorVehiculoId: v.colorVehiculoId,
        paisOrigenId: v.paisOrigenId,
        tipoCombustibleId: v.tipoCombustibleId,
        estadoUnidadId: v.estadoUnidadId,
        transmisionId: v.transmisionId,
        numeroEjeId: v.numeroEjeId,
        configuracionEjeId: v.configuracionEjeId,
        estadoActivo: v.estadoActivo,
        cilindraje: v.cilindraje || undefined,
        pasajeros: v.pasajeros,
        tonelaje: v.tonelaje || undefined,
        capacidad: v.capacidad || undefined,
        potencia: v.potencia || undefined,
        kmInicio: v.kmInicio,
        largo: v.largo || undefined,
        ancho: v.ancho || undefined,
        alto: v.alto || undefined,
        proyectoAsignado: v.proyectoAsignado || undefined,
        medidaNeumaticos: v.medidaNeumaticos || undefined,
        marcaNeumatico: v.marcaNeumatico || undefined,
        kmReencauche: v.kmReencauche || undefined,
        numeroRepuestos: v.numeroRepuestos,
        observaciones: v.observaciones || undefined,
        businessRuc: this.businessRuc
      };
      const payload = vehicleData as CreateVehicleRequest & {
        fotoPrincipal?: string;
        fotoLateral?: string;
        fotoInterior?: string;
      };
      if (this.fotoPrincipalPreview && this.fotoPrincipalPreview.startsWith('data:')) {
        payload.fotoPrincipal = this.fotoPrincipalPreview;
      }
      if (this.fotoLateralPreview && this.fotoLateralPreview.startsWith('data:')) {
        payload.fotoLateral = this.fotoLateralPreview;
      }
      if (this.fotoInteriorPreview && this.fotoInteriorPreview.startsWith('data:')) {
        payload.fotoInterior = this.fotoInteriorPreview;
      }

      const req$ =
        this.editingVehicleId != null
          ? this.fleetService.updateVehicle(this.businessRuc, this.editingVehicleId, payload)
          : this.fleetService.createVehicle(this.businessRuc, payload);

      req$.subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento']);
        },
        error: err => {
          console.error(err);
          const msg = err?.error?.message || err?.message || '';
          this.error = msg
            ? String(msg)
            : this.editingVehicleId != null
              ? 'Error al actualizar la ficha.'
              : 'Error al crear el vehículo. Revise los datos o la configuración de la empresa.';
          this.loading = false;
        }
      });
    } else {
      this.error = 'Por favor, complete todos los campos requeridos.';
      this.markFormGroupTouched(this.vehicleForm);
    }
  }

  onCancel(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.vehicleForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
