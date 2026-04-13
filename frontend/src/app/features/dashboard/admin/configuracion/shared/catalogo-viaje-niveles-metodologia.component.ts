import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import { NivelParametro } from '../../../../../models/nivel-parametro.model';
import {
  nivelesParametroDesc,
  parametrosCatalogoTresSlots,
  parametrosIperNpNs,
  tieneParametrosNeNdNc,
  riesgoIperClass,
  riesgoIperLabel
} from './metodologia-catalogo-niveles.util';

/**
 * Bloque reutilizable: metodología + NE/ND/NC (GTC), NP/NS (IPER) o tres factores genéricos.
 * El padre debe incluir el mismo FormGroup con metodologiaId, neNivelId, ndNivelId, ncNivelId.
 */
@Component({
  selector: 'app-catalogo-viaje-niveles-metodologia',
  templateUrl: './catalogo-viaje-niveles-metodologia.component.html',
  styleUrls: ['./catalogo-viaje-niveles-metodologia.component.scss']
})
export class CatalogoViajeNivelesMetodologiaComponent {
  readonly nivelControlNames = ['neNivelId', 'ndNivelId', 'ncNivelId'] as const;

  @Input({ required: true }) form!: FormGroup;
  @Input() metodologias: MetodologiaRiesgo[] = [];
  @Input() loadingMetodologias = false;

  get selectedMetodologia(): MetodologiaRiesgo | null {
    const metodologiaId = Number(this.form.get('metodologiaId')?.value) || null;
    if (!metodologiaId) {
      return null;
    }
    return this.metodologias.find((item) => Number(item.id) === metodologiaId) || null;
  }

  onMetodologiaChange(): void {
    this.form.patchValue({
      neNivelId: null,
      ndNivelId: null,
      ncNivelId: null
    });
  }

  getParametro(code: string): ParametroMetodologia | null {
    return this.selectedMetodologia?.parametros?.find((param) => param.code === code) || null;
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
    return this.getNiveles(code).find((nivel) => nivel.id === nivelId) || null;
  }

  get parametrosModoGenerico(): ParametroMetodologia[] {
    return parametrosCatalogoTresSlots(this.selectedMetodologia);
  }

  get parametrosIper(): { np: ParametroMetodologia; ns: ParametroMetodologia } | null {
    return parametrosIperNpNs(this.selectedMetodologia);
  }

  getNivelesIperNp(): NivelParametro[] {
    return nivelesParametroDesc(this.parametrosIper?.np);
  }

  getNivelesIperNs(): NivelParametro[] {
    return nivelesParametroDesc(this.parametrosIper?.ns);
  }

  getNivelSeleccionadoIperNp(): NivelParametro | null {
    const pair = this.parametrosIper;
    if (!pair) {
      return null;
    }
    const nivelId = Number(this.form.get('neNivelId')?.value) || null;
    if (!nivelId) {
      return null;
    }
    return (pair.np.niveles || []).find((n) => n.id === nivelId) || null;
  }

  getNivelSeleccionadoIperNs(): NivelParametro | null {
    const pair = this.parametrosIper;
    if (!pair) {
      return null;
    }
    const nivelId = Number(this.form.get('ndNivelId')?.value) || null;
    if (!nivelId) {
      return null;
    }
    return (pair.ns.niveles || []).find((n) => n.id === nivelId) || null;
  }

  get riesgoIperProducto(): number | null {
    const a = this.getNivelSeleccionadoIperNp()?.valor ?? null;
    const b = this.getNivelSeleccionadoIperNs()?.valor ?? null;
    if (a === null || b === null) {
      return null;
    }
    return a * b;
  }

  get iperRiesgoClass(): string {
    return riesgoIperClass(this.riesgoIperProducto);
  }

  get iperRiesgoLabel(): string {
    return riesgoIperLabel(this.riesgoIperProducto);
  }

  nivelControlAt(index: number): string {
    return this.nivelControlNames[index] ?? 'neNivelId';
  }

  getNivelesGenericoSlot(index: number): NivelParametro[] {
    return nivelesParametroDesc(this.parametrosModoGenerico[index]);
  }

  getNivelSeleccionadoGenerico(index: number): NivelParametro | null {
    const param = this.parametrosModoGenerico[index];
    if (!param) {
      return null;
    }
    const nivelId = Number(this.form.get(this.nivelControlAt(index))?.value) || null;
    if (!nivelId) {
      return null;
    }
    return (param.niveles || []).find((n) => n.id === nivelId) || null;
  }

  paramCodeClass(index: number): string {
    return ['ne', 'nd', 'nc'][index] ?? 'ne';
  }

  get showGridParametros(): boolean {
    return (
      !!this.selectedMetodologia &&
      (this.hasRequiredParams || this.parametrosModoGenerico.length > 0 || !!this.parametrosIper)
    );
  }

  /** GTC/genérico: ocultar si solo estamos en modo IPER (sin NE/ND/NC GTC). */
  get showGtcGenericoCalc(): boolean {
    if (!this.showGridParametros) {
      return false;
    }
    if (this.parametrosIper && !this.hasRequiredParams) {
      return false;
    }
    return true;
  }

  get npValue(): number | null {
    if (this.parametrosIper && !this.hasRequiredParams) {
      return null;
    }
    const a = this.hasRequiredParams
      ? (this.getNivelSeleccionado('NE')?.valor ?? null)
      : (this.getNivelSeleccionadoGenerico(0)?.valor ?? null);
    const b = this.hasRequiredParams
      ? (this.getNivelSeleccionado('ND')?.valor ?? null)
      : (this.getNivelSeleccionadoGenerico(1)?.valor ?? null);
    if (a === null || b === null) {
      return null;
    }
    return a * b;
  }

  get nrValue(): number | null {
    if (this.parametrosIper && !this.hasRequiredParams) {
      return null;
    }
    const np = this.npValue;
    const c = this.hasRequiredParams
      ? (this.getNivelSeleccionado('NC')?.valor ?? null)
      : (this.getNivelSeleccionadoGenerico(2)?.valor ?? null);
    if (np === null || c === null) {
      return null;
    }
    return np * c;
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
    return tieneParametrosNeNdNc(this.selectedMetodologia);
  }

  get showAvisoSinParametrosNiveles(): boolean {
    return (
      !!this.selectedMetodologia &&
      !this.hasRequiredParams &&
      this.parametrosModoGenerico.length === 0 &&
      !this.parametrosIper
    );
  }
}
