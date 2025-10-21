import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { TestimonioCardComponent } from './components/testimonio-card/testimonio-card.component';
import { ForgotPasswordModalComponent } from './components/forgot-password-modal/forgot-password-modal.component';
import { NotificationComponent } from './components/notification/notification.component';
import { BusinessFilesComponent } from './components/business-files/business-files.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { SafePipe } from '../pipes/safe.pipe';
import { NameResolverPipe } from '../pipes/name-resolver.pipe';
import { DashboardUsuarioGraficasComponent } from '../features/dashboard/usuario/graficas/dashboard-usuario-graficas.component';
import { GraficaBarraTotalPersonalComponent } from '../features/dashboard/usuario/graficas/grafica-barra-total-personal.component';
import { GraficaTotalPersonalComponent } from '../features/dashboard/usuario/graficas/grafica-total-personal.component';
import { GraficaFormacionAcademicaComponent } from '../features/dashboard/usuario/graficas/grafica-formacion-academica.component';
import { GraficaRangoEdadesComponent } from '../features/dashboard/usuario/graficas/grafica-rango-edades.component';
import { GraficaTrabajadoresResidentesComponent } from '../features/dashboard/usuario/graficas/grafica-trabajadores-residentes.component';
import { GraficaTiposEtniasComponent } from '../features/dashboard/usuario/graficas/grafica-tipos-etnias.component';
import { GraficaCargosAsignadosComponent } from '../features/dashboard/usuario/graficas/grafica-cargos-asignados.component';

@NgModule({
  declarations: [
    LoginModalComponent,
    TestimonioCardComponent,
    ForgotPasswordModalComponent,
    NotificationComponent,
    BusinessFilesComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe,
    NameResolverPipe,
    DashboardUsuarioGraficasComponent,
    GraficaBarraTotalPersonalComponent,
    GraficaTotalPersonalComponent,
    GraficaFormacionAcademicaComponent,
    GraficaRangoEdadesComponent,
    GraficaTrabajadoresResidentesComponent,
    GraficaTiposEtniasComponent,
    GraficaCargosAsignadosComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    NgxEchartsModule
  ],
  exports: [
    CommonModule,
    RouterModule,
    NgbModule,    
    LoginModalComponent,
    TestimonioCardComponent,
    ForgotPasswordModalComponent,
    NotificationComponent,
    BusinessFilesComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe,
    NameResolverPipe,
    DashboardUsuarioGraficasComponent,
    GraficaBarraTotalPersonalComponent,
    GraficaTotalPersonalComponent,
    GraficaFormacionAcademicaComponent,
    GraficaRangoEdadesComponent,
    GraficaTrabajadoresResidentesComponent,
    GraficaTiposEtniasComponent,
    GraficaCargosAsignadosComponent
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ]
})
export class SharedModule { }