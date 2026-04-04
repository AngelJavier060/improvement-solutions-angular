import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaConfiguracionEjeComponent } from './lista-configuracion-eje.component';
import { NuevaConfiguracionEjeComponent } from './nueva-configuracion-eje.component';
import { EditarConfiguracionEjeComponent } from './editar-configuracion-eje.component';

const routes: Routes = [
  { path: '', component: ListaConfiguracionEjeComponent },
  { path: 'nueva', component: NuevaConfiguracionEjeComponent },
  { path: 'editar/:id', component: EditarConfiguracionEjeComponent }
];

@NgModule({
  declarations: [
    ListaConfiguracionEjeComponent,
    NuevaConfiguracionEjeComponent,
    EditarConfiguracionEjeComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class ConfiguracionEjeModule { }
