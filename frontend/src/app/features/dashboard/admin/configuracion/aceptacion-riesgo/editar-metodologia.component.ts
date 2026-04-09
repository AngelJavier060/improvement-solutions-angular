import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';

export type TipUso = 'FACTOR' | 'SELECCIONABLE' | 'CALCULADO';

@Component({
  selector: 'app-editar-metodologia',
  templateUrl: './editar-metodologia.component.html',
  styleUrls: ['./editar-metodologia.component.scss']
})
export class EditarMetodologiaComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;

  readonly TIPOS_USO: { value: TipUso; label: string; descripcion: string; icono: string; color: string }[] = [
    {
      value: 'FACTOR',
      label: 'Automático por factor',
      descripcion: 'El valor se autocompleta desde una o varias configuraciones de viaje.',
      icono: 'fas fa-link',
      color: '#6366f1'
    },
    {
      value: 'SELECCIONABLE',
      label: 'Seleccionable al evaluar',
      descripcion: 'El evaluador elige un nivel al momento de la evaluación.',
      icono: 'fas fa-hand-pointer',
      color: '#10b981'
    },
    {
      value: 'CALCULADO',
      label: 'Calculado por fórmula',
      descripcion: 'Se obtiene calculando otros parámetros mediante una fórmula.',
      icono: 'fas fa-calculator',
      color: '#f59e0b'
    }
  ];

  readonly ENTIDADES_CONFIG: { value: string; label: string; icono: string; ayuda: string }[] = [
    { value: 'distancia-recorrer', label: 'Distancia a recorrer', icono: 'fas fa-road', ayuda: 'Ejemplo: Menor a 50 km, Menor a 100 km, Mayor a 100 km.' },
    { value: 'tipo-via', label: 'Tipo de vía', icono: 'fas fa-map-signs', ayuda: 'Ejemplo: Asfaltada, mixta, lastrada.' },
    { value: 'condicion-climatica', label: 'Condiciones climáticas', icono: 'fas fa-cloud-sun', ayuda: 'Ejemplo: Despejado, lluvia intensa, niebla.' },
    { value: 'horario-circulacion', label: 'Horario de circulación', icono: 'fas fa-clock', ayuda: 'Ejemplo: Día, noche, madrugada.' },
    { value: 'estado-carretera', label: 'Estado de carretera', icono: 'fas fa-exclamation-triangle', ayuda: 'Ejemplo: Buena, regular, mala.' },
    { value: 'tipo-carga', label: 'Tipo de carga', icono: 'fas fa-boxes', ayuda: 'Puede modificar la exposición o deficiencia según el tipo transportado.' },
    { value: 'hora-conduccion', label: 'Horas de conducción', icono: 'fas fa-stopwatch', ayuda: 'Permite asociar fatiga o exposición por duración.' },
    { value: 'hora-descanso', label: 'Horas de descanso previo', icono: 'fas fa-bed', ayuda: 'Permite modelar descanso insuficiente o adecuado.' },
    { value: 'medio-comunicacion', label: 'Otros peligros', icono: 'fas fa-exclamation-circle', ayuda: 'Otros peligros presentes en ruta.' },
    { value: 'transporta-pasajero', label: 'Medidas de Control para el viaje', icono: 'fas fa-clipboard-check', ayuda: 'Medidas de control aplicables al viaje y criticidad operativa.' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: MetodologiaRiesgoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      parametros: this.fb.array([])
    });
  }

  get parametros(): FormArray {
    return this.form.get('parametros') as FormArray;
  }

  get totalAutomaticos(): number {
    return this.parametros.controls.filter(ctrl => ctrl.get('tipUso')?.value === 'FACTOR').length;
  }

  get totalSeleccionables(): number {
    return this.parametros.controls.filter(ctrl => ctrl.get('tipUso')?.value === 'SELECCIONABLE').length;
  }

  get totalCalculados(): number {
    return this.parametros.controls.filter(ctrl => ctrl.get('tipUso')?.value === 'CALCULADO').length;
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(this.id).subscribe({
      next: (data) => {
        this.form.patchValue({ name: data.name, description: data.description });
        if (data.parametros) {
          data.parametros.forEach(p => {
            const tipUso = (p as any).tipUso || (p.isCalculated ? 'CALCULADO' : 'FACTOR');
            const paramGroup = this.fb.group({
              id: [p.id],
              code: [p.code, Validators.required],
              name: [p.name, Validators.required],
              description: [p.description || ''],
              displayOrder: [p.displayOrder],
              tipUso: [tipUso, Validators.required],
              formula: [p.formula || ''],
              sourceEntity: [(p as any).sourceEntity || ''],
              sourceEntityLabel: [(p as any).sourceEntityLabel || ''],
              niveles: this.fb.array([])
            });
            if (p.niveles && p.niveles.length > 0) {
              const nivelesArray = paramGroup.get('niveles') as FormArray;
              p.niveles.forEach(n => {
                nivelesArray.push(this.fb.group({
                  id: [n.id],
                  valor: [n.valor, Validators.required],
                  nombre: [n.nombre, Validators.required],
                  description: [n.description || ''],
                  color: [n.color || '#94a3b8']
                }));
              });
            }
            this.parametros.push(paramGroup);
          });
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar la metodología';
        this.loading = false;
        console.error(err);
      }
    });
  }

  addParametro(): void {
    const paramGroup = this.fb.group({
      id: [null],
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      displayOrder: [this.parametros.length + 1],
      tipUso: ['FACTOR', Validators.required],
      formula: [''],
      sourceEntity: [''],
      sourceEntityLabel: [''],
      niveles: this.fb.array([])
    });
    this.parametros.push(paramGroup);
  }

  onTipUsoChange(paramIndex: number): void {
    const param = this.parametros.at(paramIndex);
    const tipUso = param.get('tipUso')?.value as TipUso;

    if (tipUso !== 'FACTOR') {
      param.get('sourceEntity')?.setValue('');
      param.get('sourceEntityLabel')?.setValue('');
    }

    if (tipUso !== 'CALCULADO' && !this.getNiveles(paramIndex).length) {
      this.addNivel(paramIndex);
    }
  }

  removeParametro(index: number): void {
    this.parametros.removeAt(index);
    this.reorderParametros();
  }

  reorderParametros(): void {
    this.parametros.controls.forEach((ctrl, i) => {
      ctrl.get('displayOrder')?.setValue(i + 1);
    });
  }

  getNiveles(paramIndex: number): FormArray {
    return this.parametros.at(paramIndex).get('niveles') as FormArray;
  }

  addNivel(paramIndex: number): void {
    const nivelGroup = this.fb.group({
      id: [null],
      valor: [0, Validators.required],
      nombre: ['', Validators.required],
      description: [''],
      color: ['#94a3b8']
    });
    this.getNiveles(paramIndex).push(nivelGroup);
  }

  removeNivel(paramIndex: number, nivelIndex: number): void {
    this.getNiveles(paramIndex).removeAt(nivelIndex);
  }

  getTipoUsoDef(tipUso: string) {
    return this.TIPOS_USO.find(t => t.value === tipUso);
  }

  getSourceEntities(paramIndex: number): string[] {
    const raw = this.parametros.at(paramIndex).get('sourceEntity')?.value || '';
    return raw
      .split(',')
      .map((value: string) => value.trim())
      .filter((value: string) => !!value);
  }

  isSourceSelected(paramIndex: number, sourceValue: string): boolean {
    return this.getSourceEntities(paramIndex).includes(sourceValue);
  }

  toggleSourceEntity(paramIndex: number, sourceValue: string, checked: boolean): void {
    const current = this.getSourceEntities(paramIndex);
    const next = checked
      ? Array.from(new Set([...current, sourceValue]))
      : current.filter(value => value !== sourceValue);

    this.parametros.at(paramIndex).get('sourceEntity')?.setValue(next.join(','));
    this.parametros.at(paramIndex).get('sourceEntityLabel')?.setValue(this.getSourceLabelsFromValues(next).join(', '));
  }

  getSourceLabelsFromValues(values: string[]): string[] {
    return values
      .map(value => this.ENTIDADES_CONFIG.find(item => item.value === value)?.label)
      .filter((label): label is string => !!label);
  }

  getSelectedSourceLabels(paramIndex: number): string[] {
    return this.getSourceLabelsFromValues(this.getSourceEntities(paramIndex));
  }

  getSelectedSourceSummary(paramIndex: number): string {
    const labels = this.getSelectedSourceLabels(paramIndex);
    if (!labels.length) return 'Sin factores automáticos definidos';
    if (labels.length === 1) return `1 factor automático: ${labels[0]}`;
    return `${labels.length} factores automáticos: ${labels.join(', ')}`;
  }

  getPreviewBadges(paramIndex: number): string[] {
    const tipUso = this.parametros.at(paramIndex).get('tipUso')?.value as TipUso;
    if (tipUso === 'FACTOR') {
      return this.getSelectedSourceLabels(paramIndex);
    }
    return [];
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const formValue = this.form.value;
    const entity: MetodologiaRiesgo = {
      name: formValue.name,
      description: formValue.description,
      parametros: formValue.parametros.map((p: any) => {
        const isCalculado = p.tipUso === 'CALCULADO';
        return {
          id: p.id || undefined,
          code: p.code,
          name: p.name,
          description: p.description,
          displayOrder: p.displayOrder,
          tipUso: p.tipUso,
          isCalculated: isCalculado,
          formula: isCalculado ? p.formula : null,
          sourceEntity: p.tipUso === 'FACTOR' ? (p.sourceEntity || null) : null,
          sourceEntityLabel: p.tipUso === 'FACTOR' ? (p.sourceEntityLabel || null) : null,
          niveles: isCalculado ? [] : p.niveles.map((n: any) => ({
            id: n.id || undefined,
            valor: n.valor,
            nombre: n.nombre,
            description: n.description,
            color: n.color || null
          }))
        };
      })
    };

    this.service.update(this.id, entity).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo']);
      },
      error: (err) => {
        console.error('[EditarMetodologia] Error al actualizar:', err);
        if (err.error && err.error.message) {
          this.error = err.error.message;
        } else if (err.status === 409) {
          this.error = 'Conflicto al guardar: ya existe una metodología con ese nombre o hay datos en uso.';
        } else {
          this.error = `Error ${err.status || ''}: No se pudo actualizar la metodología.`;
        }
        this.saving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo']);
  }
}
