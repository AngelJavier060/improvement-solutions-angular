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

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent,
    DashboardUsuarioComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'dashboard/admin', component: DashboardAdminComponent },
      { path: 'dashboard/usuario', component: DashboardUsuarioComponent },
      { path: '**', redirectTo: '' }
    ]),
    NgbDropdownModule,
    NgbModalModule,
    SharedModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }