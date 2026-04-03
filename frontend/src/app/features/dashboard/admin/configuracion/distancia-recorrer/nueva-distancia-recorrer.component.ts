import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DistanciaRecorrer } from '../../../../../models/distancia-recorrer.model';
import { DistanciaRecorrerService } from '../../../../../services/distancia-recorrer.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import { NivelParametro } from '../../../../../models/nivel-parametro.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';

@Component({
  selector: 'app-nueva-distancia-recorrer',
  templateUrl: './nueva-distancia-recorrer.component.html',
  styleUrls: ['./nueva-distancia-recorrer.component.scss']
})
export class NuevaDistanciaRecorrerComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingMetodologias = true;
  error = '';
  metodologias: MetodologiaRiesgo[] = [];
  selectedMetodologia: MetodologiaRiesgo | null = null;

  constructor(
    private fb: FormBuilder,
    private service: DistanciaRecorrerService,
    private metodologiaService: MetodologiaRiesgoService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      metodologiaId: [null, Validators.required],
      neNivelId: [null, Validators.required],
      ndNivelId: [null, Validators.required],
      ncNivelId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.metodologiaService.getAll().subscribe({
      next: (items) => {
        this.metodologias = items;
        this.loadingMetodologias = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las metodologías de riesgo.';
        this.loadingMetodologias = false;
      }
    });
  }

  onMetodologiaChange(): void {
    const metodologiaId = Number(this.form.get('metodologiaId')?.value) || null;
    this.selectedMetodologia = this.metodologias.find(item => item.id === metodologiaId) || null;
    this.form.patchValue({
      neNivelId: null,
      ndNivelId: null,
      ncNivelId: null
    });
  }

  getParametro(code: string): ParametroMetodologia | null {
    return this.selectedMetodologia?.parametros?.find(param => param.code === code) || null;
  }

  getNiveles(code: string): NivelParametro[] {
    return (this.getParametro(code)?.niveles || [])
      .slice()
      .sort((a, b) => b.valor - a.valor);
  }

  getNivelSeleccionado(code: 'NE' | 'ND' | 'NC'): NivelParametro | null {
    const controlName = code === 'NE' ? 'neNivelId' : code === 'ND' ? 'ndNivelId' : 'ncNivelId';
    const nivelId = Number(this.form.get(controlName)?.value) || null;
    if (!nivelId) {
      return null;
    }
    return this.getNiveles(code).find(nivel => nivel.id === nivelId) || null;
  }

  get npValue(): number | null {
    const ne = this.getNivelSeleccionado('NE')?.valor ?? null;
    const nd = this.getNivelSeleccionado('ND')?.valor ?? null;
    if (ne === null || nd === null) {
      return null;
    }
    return ne * nd;
  }

  get nrValue(): number | null {
    const np = this.npValue;
    const nc = this.getNivelSeleccionado('NC')?.valor ?? null;
    if (np === null || nc === null) {
      return null;
    }
    return np * nc;
  }

  get nrLabel(): string {
    const nr = this.nrValue;
    if (nr === null) {
      return 'Pendiente';
    }
    if (nr > 500) {
      return 'Crítico';
    }
    if (nr >= 150) {
      return 'Alto';
    }
    if (nr >= 40) {
      return 'Medio';
    }
    return 'Bajo';
  }

  get nrClass(): string {
    const nr = this.nrValue;
    if (nr === null) {
      return 'neutral';
    }
    if (nr > 500) {
      return 'critical';
    }
    if (nr >= 150) {
      return 'high';
    }
    if (nr >= 40) {
      return 'medium';
    }
    return 'low';
  }

  get hasRequiredParams(): boolean {
    return !!(this.getParametro('NE') && this.getParametro('ND') && this.getParametro('NC'));
  }

  onSubmit(): void {
    if (this.form.invalid || !this.hasRequiredParams) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const entity: DistanciaRecorrer = {
      name: this.form.value.name,
      description: this.form.value.description,
      metodologiaRiesgo: { id: this.form.value.metodologiaId, name: '' },
      neNivel: { id: this.form.value.neNivelId, valor: 0, nombre: '' },
      ndNivel: { id: this.form.value.ndNivelId, valor: 0, nombre: '' },
      ncNivel: { id: this.form.value.ncNivelId, valor: 0, nombre: '' }
    };

    this.service.create(entity).subscribe({
      next: () => this.router.navigate(['dashboard/admin/configuracion/distancia-recorrer']),
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar. Intente nuevamente.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/distancia-recorrer']);
  }
}
