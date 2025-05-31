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
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { SafePipe } from './pipes/safe.pipe';
import { BusinessFilesComponent } from './components/business-files/business-files.component';
import { FileService } from './services/file.service';
import { ApiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { CorsInterceptor } from './core/interceptors/cors.interceptor';
import { TestUploadComponent } from './shared/components/test-upload/test-upload.component';
import { AuthGuard } from './core/guards/auth.guard';
import { TestPublicComponent } from './components/test-public/test-public.component';
import { DiagnosticComponent } from './components/diagnostic/diagnostic.component';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe,
    BusinessFilesComponent,
    TestPublicComponent,
    DiagnosticComponent
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
    SharedModule,    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'test-upload', component: TestUploadComponent },
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
          }
        ]
      },
      { 
        path: 'dashboard/usuario', 
        component: DashboardUsuarioComponent,
        canActivate: [AuthGuard] 
      },
      { 
        path: 'business/files', 
        component: BusinessFilesComponent,
        canActivate: [AuthGuard] 
      },
      {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      },
      { 
        path: 'test-public',
        component: TestPublicComponent
      },
      { 
        path: 'diagnostic',
        component: DiagnosticComponent
      },
      { path: '**', redirectTo: '' }
    ]),
    NgbDropdownModule,
    NgbModalModule,
    SharedModule
  ],
  providers: [
    FileService,
    // El orden es importante: CORS primero, luego URLs, finalmente autenticación
    { provide: HTTP_INTERCEPTORS, useClass: CorsInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }