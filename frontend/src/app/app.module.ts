import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HomeComponent } from './features/home/home.component';
import { DashboardAdminComponent } from './features/dashboard/admin/dashboard-admin.component';
import { DashboardUsuarioComponent } from './features/dashboard/usuario/dashboard-usuario.component';
import { SharedModule } from './shared/shared.module';
// import { ApiUrlInterceptor } from './core/interceptors/api-url.interceptor'; // Temporalmente deshabilitado
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthGuard } from './core/guards/auth.guard';
import { FileService } from './services/file.service';
import { DashboardUsuarioHomeComponent } from './features/dashboard/usuario/dashboard-usuario-home.component';
import { DashboardUsuarioGraficasComponent } from './features/dashboard/usuario/graficas/dashboard-usuario-graficas.component';
import { GraficaTotalPersonalComponent } from './features/dashboard/usuario/graficas/grafica-total-personal.component';
import { GraficaFormacionAcademicaComponent } from './features/dashboard/usuario/graficas/grafica-formacion-academica.component';
import { GraficaRangoEdadesComponent } from './features/dashboard/usuario/graficas/grafica-rango-edades.component';
import { GraficaTrabajadoresResidentesComponent } from './features/dashboard/usuario/graficas/grafica-trabajadores-residentes.component';
import { GraficaTiposEtniasComponent } from './features/dashboard/usuario/graficas/grafica-tipos-etnias.component';
import { GraficaCargosAsignadosComponent } from './features/dashboard/usuario/graficas/grafica-cargos-asignados.component';
import { GraficaBarraTotalPersonalComponent } from './features/dashboard/usuario/graficas/grafica-barra-total-personal.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent,
    DashboardUsuarioHomeComponent,
  // ...componentes de gráficas ahora solo en SharedModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbModalModule,
    SharedModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      
      // Nueva ruta para login de usuarios empresariales
      {
        path: 'auth/usuario-login',
        loadComponent: () => import('./features/auth/usuario-login/usuario-login.component').then(m => m.UsuarioLoginComponent)
      },
      
      // Nueva ruta para bienvenida de usuarios
      {
        path: 'usuario/:ruc/welcome',
        loadComponent: () => import('./features/usuario/usuario-welcome/usuario-welcome.component').then(m => m.UsuarioWelcomeComponent)
      },
      
      // Rutas del dashboard por RUC
      {
        path: ':ruc/dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
        canActivate: [AuthGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/landing/landing-page.component').then(m => m.LandingPageComponent)
          }
        ]
      },
      
      // Rutas específicas de servicios por RUC
      {
        path: ':ruc/empleados',
        loadComponent: () => import('./pages/dashboard/empleados/empleados.component').then(m => m.EmpleadosComponent),
        canActivate: [AuthGuard]
      },
      
      // Rutas del dashboard de usuario por RUC
      {
        path: 'usuario/:ruc/dashboard',
        component: DashboardUsuarioComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: 'talento-humano',
            loadChildren: () => import('./features/dashboard/usuario/talento-humano/talento-humano.module').then(m => m.TalentoHumanoModule)
          },
          {
            path: 'seguridad-industrial',
            loadChildren: () => import('./features/dashboard/usuario/seguridad-industrial/seguridad-industrial.module').then(m => m.SeguridadIndustrialModule)
          }
        ]
      },
      
      // Rutas existentes del admin
      {
        path: 'dashboard/admin', 
        component: DashboardAdminComponent,
        canActivate: [AuthGuard],
        data: { role: 'ROLE_ADMIN' },
        children: [
          {
            path: 'configuracion',
            loadChildren: () => import('./features/dashboard/admin/configuracion/configuracion.module').then(m => m.ConfiguracionModule)
          },
          {
            path: 'empresas',
            loadChildren: () => import('./features/dashboard/admin/empresas/empresas.module').then(m => m.EmpresasModule)
          },
          {
            path: 'usuarios',
            loadChildren: () => import('./features/dashboard/admin/usuarios/usuarios.module').then(m => m.UsuariosModule)
          }
        ]
      },
      { 
        path: 'dashboard/usuario', 
        component: DashboardUsuarioComponent,
        canActivate: [AuthGuard],
        children: [
          {
            path: 'talento-humano',
            loadChildren: () => import('./features/dashboard/usuario/talento-humano/talento-humano.module').then(m => m.TalentoHumanoModule)
          }
        ]
      },
      {
        path: 'business',
        loadChildren: () => import('./features/business/business.module').then(m => m.BusinessModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    FileService,
    // { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true }, // Temporalmente deshabilitado para usar proxy
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }