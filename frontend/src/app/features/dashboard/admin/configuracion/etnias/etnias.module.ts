import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaEtniasComponent } from './lista-etnias.component';
import { NuevaEtniaComponent } from './nueva-etnia.component';
import { EditarEtniaComponent } from './editar-etnia.component';

const routes: Routes = [
  { path: '', component: ListaEtniasComponent },
  { path: 'nueva', component: NuevaEtniaComponent },
  { path: 'editar/:id', component: EditarEtniaComponent }
];

@NgModule({
  declarations: [
    ListaEtniasComponent,
    NuevaEtniaComponent,
    EditarEtniaComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EtniasModule { }
