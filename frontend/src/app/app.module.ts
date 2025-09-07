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
import { ApiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthGuard } from './core/guards/auth.guard';
import { FileService } from './services/file.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent
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
        canActivate: [AuthGuard] 
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
    { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }