import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { ListaTipoDocumentoComponent } from './lista-tipo-documento.component';
import { NuevoTipoDocumentoComponent } from './nuevo-tipo-documento.component';
import { EditarTipoDocumentoComponent } from './editar-tipo-documento.component';
import { DebugComponent } from './debug.component';

const routes: Routes = [
  { path: '', component: ListaTipoDocumentoComponent },
  { path: 'nuevo', component: NuevoTipoDocumentoComponent },
  { path: 'editar/:id', component: EditarTipoDocumentoComponent },
  { path: 'debug', component: DebugComponent }
];

@NgModule({
  declarations: [
    ListaTipoDocumentoComponent,
    NuevoTipoDocumentoComponent,
    EditarTipoDocumentoComponent,
    DebugComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    ListaTipoDocumentoComponent,
    NuevoTipoDocumentoComponent,
    EditarTipoDocumentoComponent
  ]
})
export class TipoDocumentoModule { }
