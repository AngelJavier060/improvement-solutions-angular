import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { TalentoHumanoRoutingModule } from './talento-humano-routing.module';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';
import { CreateEmployeeModalComponent } from './components/create-employee-modal.component';
import { EditEmployeeModalComponent } from './components/edit-employee-modal.component';
import { SharedModule } from '../../../../shared/shared.module';
import { TalentoHumanoDashboardComponent } from './talento-humano-dashboard.component';
import { DashboardUsuarioGraficasComponent } from '../graficas/dashboard-usuario-graficas.component';
import { CompanySelectorComponent } from './components/company-selector.component';

@NgModule({
  declarations: [
    TalentoHumanoComponent,
    GestionEmpleadosComponent,
    TalentoHumanoDashboardComponent,
    CreateEmployeeModalComponent,
    EditEmployeeModalComponent,
    CompanySelectorComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TalentoHumanoRoutingModule,
    SharedModule
  ],
  exports: [CompanySelectorComponent]
})
export class TalentoHumanoModule { }