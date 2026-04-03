import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';

export type TipUso = 'FACTOR' | 'SELECCIONABLE' | 'CALCULADO';

interface PlantillaNivel {
  valor: number;
  nombre: string;
  description: string;
  color: string;
}

interface PlantillaParametro {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  tipUso: TipUso;
  formula: string;
  niveles: PlantillaNivel[];
}

interface Plantilla {
  nombre: string;
  descripcion: string;
  icono: string;
  badge?: string;
  data: {
    name: string;
    description: string;
    parametros: PlantillaParametro[];
  };
}

@Component({
  selector: 'app-nueva-metodologia',
  templateUrl: './nueva-metodologia.component.html',
  styleUrls: ['./nueva-metodologia.component.scss']
})
export class NuevaMetodologiaComponent {
  form: FormGroup;
  loading = false;
  error = '';
  metodologiaActiva: Plantilla | null = null;
  existentes: string[] = [];
  nombreDuplicado = false;

  readonly plantillas: Plantilla[] = [
    {
      nombre: 'GTC-45',
      descripcion: 'Marco recomendado para evaluacion detallada de riesgos en viajes.',
      icono: 'fas fa-shield-alt',
      badge: 'Recomendada',
      data: {
        name: 'GTC-45',
        description: 'Guia tecnica para identificar, valorar y calcular el nivel de riesgo automaticamente.',
        parametros: [
          {
            code: 'ND',
            name: 'Nivel de Deficiencia',
            description: 'Define la magnitud del peligro detectado.',
            displayOrder: 1,
            tipUso: 'FACTOR',
            formula: '',
            niveles: [
              { valor: 10, nombre: 'Muy Alto', description: 'Fallas criticas detectadas.', color: '#ef4444' },
              { valor: 6, nombre: 'Alto', description: 'Deficiencias significativas.', color: '#f97316' },
              { valor: 2, nombre: 'Medio', description: 'Inconsistencias menores.', color: '#eab308' },
              { valor: 0, nombre: 'Bajo', description: 'Sin deficiencias detectadas.', color: '#22c55e' }
            ]
          },
          {
            code: 'NE',
            name: 'Nivel de Exposicion',
            description: 'Indica la frecuencia de exposicion al peligro.',
            displayOrder: 2,
            tipUso: 'FACTOR',
            formula: '',
            niveles: [
              { valor: 4, nombre: 'Continua', description: 'Durante toda la jornada.', color: '#1d4ed8' },
              { valor: 3, nombre: 'Frecuente', description: 'Varias veces durante la jornada.', color: '#2563eb' },
              { valor: 2, nombre: 'Ocasional', description: 'Eventualmente durante la jornada.', color: '#3b82f6' },
              { valor: 1, nombre: 'Esporadica', description: 'Muy rara ocurrencia.', color: '#60a5fa' }
            ]
          },
          {
            code: 'NP',
            name: 'Nivel de Probabilidad',
            description: 'Se obtiene automaticamente de ND x NE.',
            displayOrder: 3,
            tipUso: 'CALCULADO',
            formula: 'ND*NE',
            niveles: []
          },
          {
            code: 'NC',
            name: 'Nivel de Consecuencia',
            description: 'Define el impacto del evento.',
            displayOrder: 4,
            tipUso: 'SELECCIONABLE',
            formula: '',
            niveles: [
              { valor: 100, nombre: 'Mortal o Catastrofico', description: 'Una o mas muertes.', color: '#991b1b' },
              { valor: 60, nombre: 'Muy Grave', description: 'Invalidez o dano irreversible.', color: '#dc2626' },
              { valor: 25, nombre: 'Grave', description: 'Incapacidad temporal.', color: '#f97316' },
              { valor: 10, nombre: 'Leve', description: 'Lesiones menores sin secuelas.', color: '#22c55e' }
            ]
          },
          {
            code: 'NR',
            name: 'Nivel de Riesgo',
            description: 'Se obtiene automaticamente de NP x NC.',
            displayOrder: 5,
            tipUso: 'CALCULADO',
            formula: 'NP*NC',
            niveles: []
          }
        ]
      }
    },
    {
      nombre: 'IPER',
      descripcion: 'Matriz simplificada para evaluaciones mas rapidas.',
      icono: 'fas fa-project-diagram',
      data: {
        name: 'IPER',
        description: 'Metodo simplificado para identificacion de peligros y evaluacion de riesgos.',
        parametros: [
          {
            code: 'NP',
            name: 'Nivel de Probabilidad',
            description: 'Probabilidad del evento.',
            displayOrder: 1,
            tipUso: 'FACTOR',
            formula: '',
            niveles: [
              { valor: 3, nombre: 'Alta', description: 'Alta probabilidad de ocurrencia.', color: '#ef4444' },
              { valor: 2, nombre: 'Media', description: 'Puede ocurrir en algunas ocasiones.', color: '#eab308' },
              { valor: 1, nombre: 'Baja', description: 'Ocurrencia rara.', color: '#22c55e' }
            ]
          },
          {
            code: 'NS',
            name: 'Nivel de Severidad',
            description: 'Impacto o severidad del dano.',
            displayOrder: 2,
            tipUso: 'SELECCIONABLE',
            formula: '',
            niveles: [
              { valor: 5, nombre: 'Intolerable', description: 'No debe continuar.', color: '#991b1b' },
              { valor: 4, nombre: 'Importante', description: 'Debe corregirse rapido.', color: '#dc2626' },
              { valor: 3, nombre: 'Moderado', description: 'Se requiere mejora.', color: '#f97316' },
              { valor: 2, nombre: 'Tolerable', description: 'Mejora recomendada.', color: '#eab308' },
              { valor: 1, nombre: 'Trivial', description: 'Sin accion especifica.', color: '#22c55e' }
            ]
          },
          {
            code: 'NR',
            name: 'Nivel de Riesgo',
            description: 'Se obtiene automaticamente de NP x NS.',
            displayOrder: 3,
            tipUso: 'CALCULADO',
            formula: 'NP*NS',
            niveles: []
          }
        ]
      }
    }
  ];

  readonly matrizGtc45 = [
    { nc: 100, label: 'Muerte', cells: ['I (4000-2400)', 'I (2000-1000)', 'I (800-600)', 'II (400-200)'] },
    { nc: 60, label: 'Invalidez total', cells: ['I (2400-1440)', 'I (1200-600)', 'II (480-360)', 'II (240-120)'] },
    { nc: 25, label: 'Invalidez parcial', cells: ['I (1000-600)', 'II (500-250)', 'II (200-150)', 'III (100-50)'] },
    { nc: 10, label: 'Lesion menor', cells: ['II (400-240)', 'II (200-100)', 'III (80-60)', 'IV (40-20)'] }
  ];

  constructor(
    private fb: FormBuilder,
    private service: MetodologiaRiesgoService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      parametros: this.fb.array([])
    });

    this.service.getAll().subscribe({
      next: (items) => {
        this.existentes = items.map(i => i.name.trim().toLowerCase());
      },
      error: () => {}
    });
  }

  get parametros(): FormArray {
    return this.form.get('parametros') as FormArray;
  }

  get esVistaSeleccion(): boolean {
    return !this.metodologiaActiva;
  }

  get esGtc45(): boolean {
    return this.metodologiaActiva?.nombre === 'GTC-45';
  }

  checkNombreDuplicado(): void {
    const nombre = this.form.get('name')?.value?.trim().toLowerCase() || '';
    this.nombreDuplicado = nombre.length > 0 && this.existentes.includes(nombre);
  }

  seleccionarMetodologia(plantilla: Plantilla): void {
    this.metodologiaActiva = plantilla;
    this.error = '';
    this.form.patchValue({
      name: plantilla.data.name,
      description: plantilla.data.description
    });
    this.checkNombreDuplicado();

    while (this.parametros.length > 0) {
      this.parametros.removeAt(0);
    }

    plantilla.data.parametros.forEach(param => {
      const niveles = this.fb.array(
        param.niveles.map(n =>
          this.fb.group({
            valor: [n.valor, Validators.required],
            nombre: [n.nombre, Validators.required],
            description: [n.description || ''],
            color: [n.color || '#94a3b8']
          })
        )
      );

      this.parametros.push(this.fb.group({
        code: [param.code, Validators.required],
        name: [param.name, Validators.required],
        description: [param.description || ''],
        displayOrder: [param.displayOrder],
        tipUso: [param.tipUso, Validators.required],
        formula: [param.formula || ''],
        niveles
      }));
    });
  }

  volverASeleccion(): void {
    this.metodologiaActiva = null;
    this.error = '';
  }

  getParametroPorCodigo(code: string): FormGroup | null {
    return (this.parametros.controls.find(ctrl => ctrl.get('code')?.value === code) as FormGroup) || null;
  }

  getNivelesPorCodigo(code: string): any[] {
    const param = this.getParametroPorCodigo(code);
    if (!param) return [];
    return (param.get('niveles') as FormArray).controls.map(ctrl => ctrl.value);
  }

  getParametrosPorTipo(tipo: TipUso): FormGroup[] {
    return this.parametros.controls
      .filter(ctrl => ctrl.get('tipUso')?.value === tipo)
      .sort((a, b) => (a.get('displayOrder')?.value || 0) - (b.get('displayOrder')?.value || 0)) as FormGroup[];
  }

  getCellClass(value: string): string {
    if (value.startsWith('I')) return 'risk-i';
    if (value.startsWith('II')) return 'risk-ii';
    if (value.startsWith('III')) return 'risk-iii';
    return 'risk-iv';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.metodologiaActiva || this.nombreDuplicado) return;
    this.loading = true;

    const formValue = this.form.value;
    const entity: MetodologiaRiesgo = {
      name: formValue.name,
      description: formValue.description,
      parametros: formValue.parametros.map((p: any) => {
        const isCalculado = p.tipUso === 'CALCULADO';
        return {
          code: p.code,
          name: p.name,
          description: p.description,
          displayOrder: p.displayOrder,
          tipUso: p.tipUso,
          isCalculated: isCalculado,
          formula: isCalculado ? p.formula : null,
          sourceEntity: null,
          sourceEntityLabel: null,
          niveles: isCalculado ? [] : p.niveles.map((n: any) => ({
            valor: n.valor,
            nombre: n.nombre,
            description: n.description,
            color: n.color || null
          }))
        };
      })
    };

    this.service.create(entity).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo']);
      },
      error: (err) => {
        console.error('[NuevaMetodologia] Error al crear:', err);
        if (err.error?.message) {
          this.error = err.error.message;
        } else if (err.status === 409) {
          this.error = 'Ya existe una metodologia con ese nombre. Use otro nombre o edite la existente.';
        } else {
          this.error = 'No se pudo guardar la metodologia.';
        }
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo']);
  }
}
