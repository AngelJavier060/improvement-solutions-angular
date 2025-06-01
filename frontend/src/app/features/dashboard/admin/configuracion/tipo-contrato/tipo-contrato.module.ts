import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ListaTipoContratoComponent } from './lista-tipo-contrato.component';
import { NuevoTipoContratoComponent } from './nuevo-tipo-contrato.component';
import { EditarTipoContratoComponent } from './editar-tipo-contrato.component';

const routes: Routes = [
  { path: '', component: ListaTipoContratoComponent },
  { path: 'nuevo', component: NuevoTipoContratoComponent },
  { path: 'editar/:id', component: EditarTipoContratoComponent }
];

@NgModule({
  declarations: [
    ListaTipoContratoComponent,
    NuevoTipoContratoComponent,
    EditarTipoContratoComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TipoContratoModule { }
