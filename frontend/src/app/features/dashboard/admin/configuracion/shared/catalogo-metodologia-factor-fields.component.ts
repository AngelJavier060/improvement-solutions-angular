import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { NivelParametro } from '../../../../../models/nivel-parametro.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import {
  nivelesFactorOrdenados,
  parametroFactorParaCatalogo
} from './metodologia-factor-viaje.util';

@Component({
  selector: 'app-catalogo-metodologia-factor-fields',
  templateUrl: './catalogo-metodologia-factor-fields.component.html',
  styleUrls: ['./catalogo-metodologia-factor-fields.component.scss']
})
export class CatalogoMetodologiaFactorFieldsComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() metodologias: MetodologiaRiesgo[] = [];
  @Input({ required: true }) factorSourceSlug!: string;
  @Input() tituloParametro = 'Nivel metodológico';

  onMetodologiaChange(): void {
    this.form.patchValue({ nivelParametroId: null });
  }

  get selectedMetodologia(): MetodologiaRiesgo | null {
    const id = Number(this.form.get('metodologiaId')?.value) || null;
    if (!id) {
      return null;
    }
    return this.metodologias.find((m) => m.id === id) || null;
  }

  get factorParam(): ParametroMetodologia | null {
    return parametroFactorParaCatalogo(this.selectedMetodologia, this.factorSourceSlug);
  }

  get niveles(): NivelParametro[] {
    return nivelesFactorOrdenados(this.factorParam);
  }

  get hasFactorEnMetodologia(): boolean {
    return this.factorParam != null && this.niveles.length > 0;
  }
}
