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
import { DetalleEmpresaAdminComponent } from './detalle-empresa-admin.component';
import { DashboardEmpresasComponent } from './dashboard-empresas.component';
import { UserModalComponent } from './user-modal/user-modal.component';
import { EmpresasRoutingModule } from './empresas-routing.module';
import { SharedModule } from '../../../../shared/shared.module';
import { ApprovalsListComponent } from './approvals-list.component';
import { MatrixConfigComponent } from './matrix-config.component';
import { DiagnosticoBdComponent } from './diagnostico-bd.component';

@NgModule({
  declarations: [
    ListaEmpresasComponent,
    NuevaEmpresaComponent,
    EditarEmpresaComponent,
    DetalleEmpresaComponent,
    DetalleEmpresaAdminComponent,
    DashboardEmpresasComponent,
    UserModalComponent,
    ApprovalsListComponent,
    MatrixConfigComponent,
    DiagnosticoBdComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    EmpresasRoutingModule,
    SharedModule,
    MatDialogModule,
    DragDropModule
  ]
})
export class EmpresasModule { }
