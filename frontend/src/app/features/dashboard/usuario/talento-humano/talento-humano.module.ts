import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';

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
import { EmployeeHistoryComponent } from './components/employee-history.component';
import { ThDateFieldComponent } from './components/th-date-field.component';
import { EmployeeCvOverlayComponent } from './components/employee-cv-overlay.component';
import { DateDmyPipe } from './pipes/date-dmy.pipe';
import { TalentoHumanoChartsComponent } from './components/talento-humano-charts.component';
import { CapitalizePipe } from '../../../../pipes/capitalize.pipe';
import { PlanillaMensualComponent } from './components/planilla-mensual.component';
import { HorasExtraComponent } from './components/horas-extra.component';
import { VacacionesComponent } from './components/vacaciones.component';
import { VacacionSolicitudModalComponent } from './components/vacacion-solicitud-modal.component';
import { PermisosComponent } from './components/permisos.component';
import { AccidentesComponent } from './components/accidentes.component';

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
    EmployeeHistoryComponent,
    ThDateFieldComponent,
    EmployeeCvOverlayComponent,
    DateDmyPipe,
    TalentoHumanoChartsComponent,
    CapitalizePipe,
    PlanillaMensualComponent,
    HorasExtraComponent,
    VacacionesComponent,
    VacacionSolicitudModalComponent,
    PermisosComponent,
    AccidentesComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    OverlayModule,
    TalentoHumanoRoutingModule,
    SharedModule,
    NgxEchartsModule
  ],
  exports: [CompanySelectorComponent],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ]
})
export class TalentoHumanoModule { }