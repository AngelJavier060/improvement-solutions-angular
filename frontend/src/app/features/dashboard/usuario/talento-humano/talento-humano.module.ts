import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { TalentoHumanoRoutingModule } from './talento-humano-routing.module';
import { TalentoHumanoComponent } from './talento-humano.component';
import { GestionEmpleadosComponent } from './components/gestion-empleados.component';
import { CreateEmployeeModalComponent } from './components/create-employee-modal.component';
import { EmployeeDetailComponent } from './components/employee-detail.component';
import { DocumentsCertificationsComponent } from './components/documents-certifications.component';
import { EditEmployeeModalComponent } from './components/edit-employee-modal.component';
import { SharedModule } from '../../../../shared/shared.module';
import { TalentoHumanoDashboardComponent } from './talento-humano-dashboard.component';
import { DashboardUsuarioGraficasComponent } from '../graficas/dashboard-usuario-graficas.component';
import { CompanySelectorComponent } from './components/company-selector.component';
import { EmployeeDocumentsComponent } from './components/employee-documents.component';
import { EmployeeContractsComponent } from './components/employee-contracts.component';
import { EmployeeCoursesComponent } from './components/employee-courses.component';
import { EmployeeCardsComponent } from './components/employee-cards.component';
import { TalentoHumanoChartsComponent } from './components/talento-humano-charts.component';

@NgModule({
  declarations: [
    TalentoHumanoComponent,
    GestionEmpleadosComponent,
    TalentoHumanoDashboardComponent,
    CreateEmployeeModalComponent,
    EditEmployeeModalComponent,
    EmployeeDetailComponent,
    DocumentsCertificationsComponent,
    CompanySelectorComponent,
    EmployeeDocumentsComponent,
    EmployeeContractsComponent,
    EmployeeCoursesComponent,
    EmployeeCardsComponent,
    TalentoHumanoChartsComponent
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