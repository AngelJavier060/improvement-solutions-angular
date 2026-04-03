import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTransmisionComponent } from './lista-transmision.component';
import { NuevaTransmisionComponent } from './nueva-transmision.component';
import { EditarTransmisionComponent } from './editar-transmision.component';

const routes: Routes = [
  { path: '', component: ListaTransmisionComponent },
  { path: 'nueva', component: NuevaTransmisionComponent },
  { path: 'editar/:id', component: EditarTransmisionComponent }
];

@NgModule({
  declarations: [
    ListaTransmisionComponent,
    NuevaTransmisionComponent,
    EditarTransmisionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class TransmisionModule { }
