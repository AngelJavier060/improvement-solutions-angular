import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { ConfiguracionComponent } from './configuracion.component';
import { ConfiguracionRoutingModule } from './configuracion-routing.module';

@NgModule({
  declarations: [
    ConfiguracionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfiguracionRoutingModule
  ]
})
export class ConfiguracionModule { }