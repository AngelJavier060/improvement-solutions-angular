import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
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

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe,
    BusinessFilesComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'dashboard/admin', component: DashboardAdminComponent },
      { path: 'dashboard/usuario', component: DashboardUsuarioComponent },
      { path: 'business/files', component: BusinessFilesComponent },
      { path: '**', redirectTo: '' }
    ]),
    NgbDropdownModule,
    NgbModalModule,
    SharedModule
  ],
  providers: [FileService],
  bootstrap: [AppComponent]
})
export class AppModule { }