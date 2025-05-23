import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { HomeComponent } from './features/home/home.component';
import { SharedModule } from './shared/shared.module';
import { DashboardAdminComponent } from './features/dashboard/admin/dashboard-admin.component';
import { DashboardUsuarioComponent } from './features/dashboard/usuario/dashboard-usuario.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { SafePipe } from './pipes/safe.pipe';
import { FileService } from './services/file.service';
import { BusinessFilesComponent } from './features/business/business-files/business-files.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ApiUrlInterceptor } from './core/interceptors/api-url.interceptor';
import { AuthGuard } from './core/guards/auth.guard';
import { TestPublicComponent } from './components/test-public/test-public.component';

@NgModule({  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe,
    BusinessFilesComponent,
    TestPublicComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },      { 
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
      },      {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      },
      { 
        path: 'test-public',
        component: TestPublicComponent
      },
      { path: '**', redirectTo: '' }
    ]),
    NgbDropdownModule,
    NgbModalModule,
    SharedModule
  ],  providers: [
    FileService,
    // El orden es importante: primero corregir URLs, luego manejo de autenticación
    { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }