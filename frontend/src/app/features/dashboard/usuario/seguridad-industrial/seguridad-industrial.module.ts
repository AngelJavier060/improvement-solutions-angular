import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SeguridadIndustrialRoutingModule } from './seguridad-industrial.routing';
import { SeguridadIndustrialComponent } from './seguridad-industrial.component';
import { MatrizLegalUsuarioComponent } from './views/matriz-legal-usuario.component';

@NgModule({
  declarations: [
    SeguridadIndustrialComponent,
    MatrizLegalUsuarioComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SeguridadIndustrialRoutingModule
  ]
})
export class SeguridadIndustrialModule {}
