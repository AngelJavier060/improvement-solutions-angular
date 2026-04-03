import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoCombustibleComponent } from './lista-tipo-combustible.component';
import { NuevaTipoCombustibleComponent } from './nueva-tipo-combustible.component';
import { EditarTipoCombustibleComponent } from './editar-tipo-combustible.component';

const routes: Routes = [
  { path: '', component: ListaTipoCombustibleComponent },
  { path: 'nuevo', component: NuevaTipoCombustibleComponent },
  { path: 'editar/:id', component: EditarTipoCombustibleComponent }
];

@NgModule({
  declarations: [
    ListaTipoCombustibleComponent,
    NuevaTipoCombustibleComponent,
    EditarTipoCombustibleComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TipoCombustibleModule { }
