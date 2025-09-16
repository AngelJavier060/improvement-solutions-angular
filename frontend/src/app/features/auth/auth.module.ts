import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { ResetPasswordComponent } from './reset-password/reset-password.component';
// Temporalmente comentamos esta importación hasta que podamos resolver los problemas
// import { AuthBypassComponent } from './components/auth-bypass/auth-bypass.component';

const routes: Routes = [
  { 
    path: 'reset-password', 
    component: ResetPasswordComponent 
  }
  // Los componentes standalone ahora se cargan desde app.module.ts
  // Temporalmente comentamos estas rutas
  // {
  //   path: 'auth-bypass',
  //   component: AuthBypassComponent
  // },
  // {
  //   path: 'emergency-login',
  //   component: AuthBypassComponent
  // }
];

@NgModule({
  declarations: [
    ResetPasswordComponent
    // Los componentes standalone ya no van aquí
    // Temporalmente comentamos este componente
    // AuthBypassComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class AuthModule { }