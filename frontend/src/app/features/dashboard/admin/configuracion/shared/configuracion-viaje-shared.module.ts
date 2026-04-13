import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CatalogoMetodologiaFactorFieldsComponent } from './catalogo-metodologia-factor-fields.component';
import { CatalogoViajeListaShellComponent } from './catalogo-viaje-lista-shell.component';
import { CatalogoViajeNivelesMetodologiaComponent } from './catalogo-viaje-niveles-metodologia.component';

@NgModule({
  declarations: [
    CatalogoMetodologiaFactorFieldsComponent,
    CatalogoViajeListaShellComponent,
    CatalogoViajeNivelesMetodologiaComponent
  ],
  imports: [CommonModule, ReactiveFormsModule],
  exports: [
    CatalogoMetodologiaFactorFieldsComponent,
    CatalogoViajeListaShellComponent,
    CatalogoViajeNivelesMetodologiaComponent
  ]
})
export class ConfiguracionViajeSharedModule {}
