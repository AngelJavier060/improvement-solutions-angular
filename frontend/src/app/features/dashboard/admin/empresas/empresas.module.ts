import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { ListaEmpresasComponent } from './lista-empresas.component';
import { NuevaEmpresaComponent } from './nueva-empresa.component';
import { EditarEmpresaComponent } from './editar-empresa.component';
import { DetalleEmpresaComponent } from './detalle-empresa.component';
import { DashboardEmpresasComponent } from './dashboard-empresas.component';
import { EmpresasRoutingModule } from './empresas-routing.module';
import { SharedModule } from '../../../../shared/shared.module';

@NgModule({
  declarations: [
    ListaEmpresasComponent,
    NuevaEmpresaComponent,
    EditarEmpresaComponent,
    DetalleEmpresaComponent,
    DashboardEmpresasComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    EmpresasRoutingModule,
    SharedModule,
    MatDialogModule,
    DragDropModule
  ]
})
export class EmpresasModule { }
